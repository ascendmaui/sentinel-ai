import { promises as dns } from "node:dns";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import tls from "node:tls";
import { headerMap, mailDomain, sitemapUrlsFromRobots, summarizeSetCookie } from "./parse";
import { bareHostname, isBlockedHostname, isBlockedIp, parsePublicUrl, publicErrorMessage, safeLookup } from "./ssrf";
import type { AuxResult, CtResult, DnsResult, FetchResult, TlsResult } from "./types";

const TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 3;
const USER_AGENT = "SeraphimScanAI/0.1 (passive public scan; authorization affirmed by requester)";

type RawResponse = {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
  truncated: boolean;
};

/**
 * One GET. The TLS observation socket is separate and does not send this request.
 * Lookup rejects private and metadata addresses at connect time.
 */
function requestOnce(url: URL, maxBytes: number): Promise<RawResponse> {
  const lib = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        protocol: url.protocol,
        hostname: bareHostname(url.hostname),
        port: url.port === "" ? (url.protocol === "https:" ? "443" : "80") : url.port,
        path: `${url.pathname || "/"}${url.search}`,
        method: "GET",
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/xhtml+xml,text/plain,application/xml;q=0.9,*/*;q=0.1",
          "accept-encoding": "identity",
        },
        lookup: safeLookup,
        timeout: TIMEOUT_MS,
        rejectUnauthorized: true,
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        let truncated = false;
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks), truncated });
        };
        res.on("data", (chunk: Buffer) => {
          if (size >= maxBytes) return;
          const room = maxBytes - size;
          if (chunk.length > room) {
            chunks.push(chunk.subarray(0, room));
            size = maxBytes;
            truncated = true;
            res.destroy();
            return;
          }
          chunks.push(chunk);
          size += chunk.length;
        });
        res.on("end", finish);
        res.on("close", finish);
        res.on("error", (err) => {
          if (settled) return;
          settled = true;
          reject(err);
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end();
  });
}

function isRedirect(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function textual(contentType: string | null): boolean {
  if (!contentType) return true;
  return /text\/|json|xml|javascript|svg/i.test(contentType);
}

export async function observeHttp(input: string, maxBytes = 1_200_000, sameHostOnly = false): Promise<FetchResult> {
  const parsed = parsePublicUrl(input);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const originalHost = parsed.target.host;
  let current = parsed.target.url;
  const hops: string[] = [];
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      const response = await requestOnce(current, maxBytes);
      const location = response.headers.location;
      if (isRedirect(response.status) && typeof location === "string" && hop < MAX_REDIRECTS) {
        const next = new URL(location, current);
        const check = parsePublicUrl(next.toString());
        if (!check.ok) return { ok: false, error: check.error };
        if (sameHostOnly && check.target.host !== originalHost) {
          return { ok: false, error: "The response redirected to a different host, so it was not followed." };
        }
        hops.push(current.toString());
        current = check.target.url;
        continue;
      }
      const setCookieHeader = response.headers["set-cookie"];
      const setCookie = Array.isArray(setCookieHeader) ? setCookieHeader : setCookieHeader ? [setCookieHeader] : [];
      const contentType = typeof response.headers["content-type"] === "string" ? response.headers["content-type"] : null;
      return {
        ok: true,
        status: response.status,
        finalUrl: current.toString(),
        redirectHops: hops,
        headers: headerMap(response.headers),
        cookies: summarizeSetCookie(setCookie),
        body: textual(contentType) ? response.body.toString("utf8") : "",
        truncated: response.truncated,
        contentType,
      };
    }
    return { ok: false, error: "Too many redirects." };
  } catch (err) {
    return { ok: false, error: publicErrorMessage(err) };
  }
}

export async function observeDns(host: string): Promise<DnsResult> {
  const mailHost = mailDomain(host);
  const empty: DnsResult = { ok: true, mailHost, a: [], aaaa: [], ns: [], mx: [], txt: [], dmarcTxt: [] };
  if (isBlockedHostname(host) || (isIP(host) && isBlockedIp(host))) {
    return { ...empty, ok: false, error: "That hostname is not allowed." };
  }
  if (isIP(host)) {
    return {
      ...empty,
      a: isIP(host) === 4 ? [host] : [],
      aaaa: isIP(host) === 6 ? [host] : [],
    };
  }
  try {
    const [a, aaaa, ns, mx, txt, dmarc] = await Promise.all([
      dns.resolve4(host).catch(() => [] as string[]),
      dns.resolve6(host).catch(() => [] as string[]),
      dns.resolveNs(host).catch(() => [] as string[]),
      dns.resolveMx(mailHost).catch(() => [] as { exchange: string; priority: number }[]),
      dns.resolveTxt(mailHost).catch(() => [] as string[][]),
      dns.resolveTxt(`_dmarc.${mailHost}`).catch(() => [] as string[][]),
    ]);
    return {
      ok: true,
      mailHost,
      a: a.slice(0, 12),
      aaaa: aaaa.slice(0, 12),
      ns: ns.slice(0, 12),
      mx: [...mx].sort((left, right) => left.priority - right.priority).slice(0, 12).map((item) => `${item.priority} ${item.exchange}`),
      txt: txt.map((parts) => parts.join("")).slice(0, 20),
      dmarcTxt: dmarc.map((parts) => parts.join("")).slice(0, 5),
    };
  } catch (err) {
    return { ...empty, ok: false, error: publicErrorMessage(err) };
  }
}

/**
 * Reads the certificate presented on port 443 and closes the socket.
 * rejectUnauthorized is false only so an untrusted certificate can be described.
 * No HTTP request is sent on this socket.
 */
export function observeTls(host: string): Promise<TlsResult> {
  if (isBlockedHostname(host) || (isIP(host) && isBlockedIp(host))) {
    return Promise.resolve({ ok: false, error: isIP(host) ? "That address is not allowed." : "That hostname is not allowed." });
  }
  return new Promise((resolve) => {
    let settled = false;
    let socket: tls.TLSSocket;
    const finish = (result: TlsResult) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };
    socket = tls.connect({
      host,
      port: 443,
      servername: isIP(host) ? undefined : host,
      rejectUnauthorized: false,
      timeout: TIMEOUT_MS,
      lookup: safeLookup,
    });
    socket.once("secureConnect", () => {
      const cert = socket.getPeerCertificate();
      const validTo = cert.valid_to ? new Date(cert.valid_to) : null;
      const valid = validTo !== null && !Number.isNaN(validTo.getTime());
      const days = valid ? Math.floor((validTo.getTime() - Date.now()) / 86_400_000) : null;
      finish({
        ok: true,
        protocol: socket.getProtocol() ?? null,
        subject: cert.subject?.CN ? String(cert.subject.CN).slice(0, 180) : null,
        issuer: cert.issuer?.CN ? String(cert.issuer.CN).slice(0, 180) : null,
        validTo: valid ? validTo.toISOString() : null,
        daysRemaining: days,
        authorized: socket.authorized,
        authorizationError: socket.authorizationError ? String(socket.authorizationError).slice(0, 180) : null,
      });
    });
    socket.once("timeout", () => finish({ ok: false, error: "The host did not respond in time." }));
    socket.once("error", (err) => finish({ ok: false, error: publicErrorMessage(err) }));
  });
}

export async function observeCt(host: string): Promise<CtResult> {
  if (isIP(host)) {
    return { state: "pending", reason: "Certificate transparency is not queried for a raw IP address." };
  }
  const queryHost = mailDomain(host);
  if (isIP(queryHost)) {
    return { state: "pending", reason: "Certificate transparency is not queried for a raw IP address." };
  }
  if (isBlockedHostname(host) || isBlockedHostname(queryHost)) {
    return { state: "pending", reason: "Certificate transparency is not queried for blocked or local hostnames." };
  }
  const url = new URL(`https://crt.sh/?q=${encodeURIComponent(queryHost)}&output=json`);
  try {
    const response = await requestOnce(url, 350_000);
    if (response.status !== 200) {
      return { state: "pending", reason: "The public certificate-transparency lookup did not return a usable answer. This is not a finding against the site." };
    }
    const parsed: unknown = JSON.parse(response.body.toString("utf8"));
    if (!Array.isArray(parsed)) {
      return { state: "pending", reason: "Certificate transparency returned an unexpected payload." };
    }
    const names = new Set<string>();
    for (const row of parsed) {
      if (!row || typeof row !== "object" || !("name_value" in row)) continue;
      const value = String((row as { name_value?: unknown }).name_value ?? "");
      for (const name of value.split("\n")) {
        const clean = name.trim().toLowerCase().replace(/^\*\./, "");
        if (clean) names.add(clean);
        if (names.size >= 15) break;
      }
      if (names.size >= 15) break;
    }
    return { state: "observed", queryHost, names: [...names] };
  } catch {
    return { state: "pending", reason: "The public certificate-transparency lookup did not answer in time. This is not a finding against the site." };
  }
}

export async function observeAux(url: string, maxBytes: number): Promise<AuxResult> {
  const fetched = await observeHttp(url, maxBytes, true);
  if (!fetched.ok) return { state: "fail", error: fetched.error };
  return {
    state: "ok",
    status: fetched.status,
    finalUrl: fetched.finalUrl,
    body: fetched.body,
    truncated: fetched.truncated,
  };
}

export async function observeSitemap(pageUrl: string, robots: AuxResult): Promise<AuxResult> {
  const origin = new URL(pageUrl);
  let candidate = new URL("/sitemap.xml", origin);
  if (robots.state === "ok") {
    for (const listed of sitemapUrlsFromRobots(robots.body)) {
      try {
        const next = new URL(listed, origin);
        if (next.host === origin.host) {
          candidate = next;
          break;
        }
      } catch {
        continue;
      }
    }
  }
  return observeAux(candidate.toString(), 400_000);
}
