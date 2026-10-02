import { lookup as dnsLookup, type LookupAddress, type LookupOptions } from "node:dns";
import { isIP } from "node:net";

/**
 * Guards for the passive scan fetcher.
 * Only public http(s) on ports 80 and 443. Private, link-local, loopback,
 * and cloud-metadata addresses are rejected before a connection and again
 * inside the DNS lookup used by the socket.
 */

export class SsrfError extends Error {
  readonly code = "SSRF" as const;
  constructor(message: string) {
    super(message);
    this.name = "SsrfError";
  }
}

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata",
  "metadata.google.internal",
  "metadata.goog",
  "instance-data",
  "instance-data.ec2.internal",
  "docker.internal",
  "host.docker.internal",
  "gateway.docker.internal",
  "kubernetes",
  "kubernetes.default",
  "kubernetes.default.svc",
  "kubernetes.default.svc.cluster.local",
  "invalid",
  "test",
  "local",
  "internal",
  "lan",
  "corp",
  "home",
  "alt",
  "example",
  "nip.io",
  "sslip.io",
  "localtest.me",
  "lvh.me",
  "vcap.me",
]);

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = (value * 256 + octet) >>> 0;
  }
  return value;
}

function inCidr(ip: string, base: string, bits: number): boolean {
  const address = ipv4ToInt(ip);
  const network = ipv4ToInt(base);
  if (address === null || network === null) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (address & mask) === (network & mask);
}

/** True when an IPv4 address must not be contacted. */
export function isBlockedIpv4(ip: string): boolean {
  if (ipv4ToInt(ip) === null) return true;
  const ranges: [string, number][] = [
    ["0.0.0.0", 8],
    ["10.0.0.0", 8],
    ["100.64.0.0", 10],
    ["127.0.0.0", 8],
    ["169.254.0.0", 16],
    ["172.16.0.0", 12],
    ["192.0.0.0", 24],
    ["192.0.2.0", 24],
    ["192.168.0.0", 16],
    // Deprecated relay-anycast. It is special-use, not a destination a
    // public passive scanner should ever contact.
    ["192.88.99.0", 24],
    // AMT (RFC 7450) and AS112 (RFC 7535) special-purpose ranges
    ["192.52.193.0", 24],
    ["192.175.48.0", 24],
    ["198.18.0.0", 15],
    ["198.51.100.0", 24],
    ["203.0.113.0", 24],
    ["224.0.0.0", 4],
    ["240.0.0.0", 4],
  ];
  return ranges.some(([base, bits]) => inCidr(ip, base, bits));
}

function parseIpv6(input: string): number[] | null {
  let text = input.split("%")[0].toLowerCase();
  if (!text) return null;
  if (text.includes(".")) {
    const lastColon = text.lastIndexOf(":");
    if (lastColon < 0) return null;
    const v4 = ipv4ToInt(text.slice(lastColon + 1));
    if (v4 === null) return null;
    const hi = ((v4 >>> 16) & 0xffff).toString(16);
    const lo = (v4 & 0xffff).toString(16);
    text = `${text.slice(0, lastColon)}:${hi}:${lo}`;
  }
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 ? (halves[1] ? halves[1].split(":") : []) : [];
  if (halves.length === 1) {
    if (head.length !== 8) return null;
  } else {
    const missing = 8 - head.length - tail.length;
    if (missing < 0) return null;
    for (let i = 0; i < missing; i += 1) head.push("0");
  }
  const groups = halves.length === 1 ? head : head.concat(tail);
  if (groups.length !== 8) return null;
  const out: number[] = [];
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(group)) return null;
    out.push(parseInt(group, 16));
  }
  return out;
}

function ipv4FromInt(value: number): string {
  return `${(value >>> 24) & 255}.${(value >>> 16) & 255}.${(value >>> 8) & 255}.${value & 255}`;
}

/** True when an IPv6 address must not be contacted, including mapped private IPv4. */
export function isBlockedIpv6(ip: string): boolean {
  const groups = parseIpv6(ip);
  if (!groups) return true;
  const [g0, g1, g2, g3, g4, g5, g6, g7] = groups;
  // ::ffff:0:0/96 — IPv4-mapped
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0xffff) {
    return isBlockedIpv4(ipv4FromInt(((g6 << 16) | g7) >>> 0));
  }
  // 2002::/16 — 6to4 embeds an IPv4 address
  if (g0 === 0x2002) {
    return isBlockedIpv4(ipv4FromInt(((g1 << 16) | g2) >>> 0));
  }
  // 2001:0000::/32 — Teredo
  if (g0 === 0x2001 && g1 === 0) return true;
  // 2001:db8::/32 — documentation
  if (g0 === 0x2001 && g1 === 0x0db8) return true;
  // 2001:2::/48 — benchmarking; 2001:10::/28 and 2001:20::/28 are
  // overlay identifier ranges. None are ordinary public destinations.
  if (g0 === 0x2001 && g1 === 0x0002 && g2 === 0) return true;
  if (g0 === 0x2001 && (g1 & 0xfff0) === 0x0010) return true;
  if (g0 === 0x2001 && (g1 & 0xfff0) === 0x0020) return true;
  // Public Internet IPv6 is 2000::/3. Everything else is special-use.
  return (g0 >> 13) !== 1;
}

/** True for any address the scanner must not open a socket to. */
export function isBlockedIp(ip: string): boolean {
  const bare = ip.trim().toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  if (!bare) return true;
  const version = isIP(bare);
  if (version === 4) return isBlockedIpv4(bare);
  if (version === 6) return isBlockedIpv6(bare);
  return true;
}

export function addressesAreAllowed(addresses: string[]): boolean {
  return addresses.length > 0 && addresses.every((address) => !isBlockedIp(address));
}

/** Node's URL.hostname keeps brackets on IPv6. Sockets and DNS need the bare address. */
export function bareHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
}

export function isBlockedHostname(hostname: string): boolean {
  const host = bareHostname(hostname);
  if (!host || BLOCKED_HOSTS.has(host)) return true;
  if (isIP(host)) return isBlockedIp(host);
  if (
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".localdomain") ||
    host.endsWith(".invalid") ||
    host.endsWith(".test") ||
    host.endsWith(".onion") ||
    host.endsWith(".home.arpa") ||
    host.endsWith(".lan") ||
    host.endsWith(".corp") ||
    host.endsWith(".home") ||
    host.endsWith(".alt") ||
    host.endsWith(".example") ||
    host.endsWith(".docker.internal") ||
    host.endsWith(".cluster.local") ||
    host.endsWith(".svc") ||
    host.endsWith(".nip.io") ||
    host.endsWith(".sslip.io") ||
    host.endsWith(".localtest.me") ||
    host.endsWith(".lvh.me") ||
    host.endsWith(".vcap.me")
  ) {
    return true;
  }
  if (host.endsWith(".metadata.google.internal") || host === "metadata.google.internal") return true;
  if (/^0x[0-9a-f.]+$/i.test(host)) return true;
  if (/^[\d.]+$/.test(host)) {
    const parts = host.split(".");
    if (parts.length === 1) return true;
    if (parts.length > 1 && parts.length < 4) return true;
    if (parts.length === 4) {
      if (parts.some((p) => p.length > 1 && p.startsWith("0"))) return true;
      if (parts.some((p) => Number(p) > 255)) return true;
    }
    if (parts.length > 4) return true;
  }
  return false;
}

export type ParsedTarget = { url: URL; host: string };

/**
 * Synchronous URL policy. Does not resolve DNS.
 * A bare host such as `example.com` is treated as `https://example.com`.
 */
export function parsePublicUrl(input: string): { ok: true; target: ParsedTarget } | { ok: false; error: string } {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 500) {
    return { ok: false, error: "Enter a website URL, up to 500 characters." };
  }
  if (/[\s\\]/.test(trimmed) || trimmed.includes("@")) {
    return { ok: false, error: "That URL is not allowed." };
  }
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { ok: false, error: "Enter a valid http or https URL." };
  }
  if (url.username || url.password) {
    return { ok: false, error: "URLs with a username or password are not allowed." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "Only http and https URLs can be scanned." };
  }
  const port = url.port;
  const expectedEmpty = port === "";
  const httpOk = url.protocol === "http:" && (expectedEmpty || port === "80");
  const httpsOk = url.protocol === "https:" && (expectedEmpty || port === "443");
  if (!httpOk && !httpsOk) {
    return { ok: false, error: "Only ports 80 and 443 are scanned. This is not a port scan." };
  }
  const host = bareHostname(url.hostname);
  if (!host || isBlockedHostname(host)) {
    return { ok: false, error: "That hostname is not allowed." };
  }
  if (isIP(host) && isBlockedIp(host)) {
    return { ok: false, error: "That address is not allowed." };
  }
  url.hash = "";
  return { ok: true, target: { url, host } };
}

type LookupCallback = (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;

/**
 * DNS lookup for http/tls sockets. Rejects the connection when any resolved
 * address is private, link-local, or otherwise blocked.
 */
export function safeLookup(hostname: string, options: LookupOptions, callback: LookupCallback): void {
  if (isBlockedHostname(hostname) || (isIP(hostname) && isBlockedIp(hostname))) {
    const error = Object.assign(new Error("blocked address"), { code: "EBLOCKED" });
    callback(error, "", 4);
    return;
  }
  dnsLookup(hostname, { ...options, all: true, verbatim: true }, (err, addresses) => {
    if (err) {
      callback(err, "", 4);
      return;
    }
    const list = addresses as LookupAddress[];
    if (!list.length || list.some((entry) => isBlockedIp(entry.address))) {
      const error = Object.assign(new Error("blocked address"), { code: "EBLOCKED" });
      callback(error, "", 4);
      return;
    }
    if (options.all) {
      callback(null, list);
      return;
    }
    callback(null, list[0].address, list[0].family);
  });
}

export function publicErrorMessage(err: unknown): string {
  if (err instanceof SsrfError) return err.message;
  const raw = err instanceof Error ? err.message : "";
  if (/blocked address|EBLOCKED/i.test(raw)) return "The host resolved to a blocked address.";
  if (/timeout|ETIMEDOUT|ESOCKETTIMEDOUT/i.test(raw)) return "The host did not respond in time.";
  if (/ENOTFOUND|EAI_AGAIN|queryA/i.test(raw)) return "The hostname did not resolve.";
  if (/certificate|UNABLE_TO_VERIFY|CERT_/i.test(raw)) return "TLS certificate verification failed.";
  if (/too large/i.test(raw)) return "The response was larger than the scan limit.";
  if (/ECONNREFUSED/i.test(raw)) return "The host refused the connection.";
  if (/ECONNRESET|EPIPE/i.test(raw)) return "The connection closed before the check finished.";
  return "The check could not be completed.";
}
