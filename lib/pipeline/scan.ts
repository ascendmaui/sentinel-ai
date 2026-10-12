/**
 * PASSIVE checks only, against the single authorized domain from the order. Each check is an ordinary
 * public lookup that any browser or resolver makes: DNS queries, one TLS handshake, plain GET requests for
 * the homepage, security.txt, robots.txt and sitemap.xml, and a certificate-transparency search on crt.sh.
 * No port scans, no fuzzing, no authentication attempts, no brute forcing, no path guessing.
 */
import { promises as dns } from "node:dns";
import tls from "node:tls";
import { SITE } from "./config";

export type Severity = "high" | "medium" | "low" | "info";
export type Finding = { id: string; title: string; severity: Severity; evidence: string; fix: string };
export type Recon = {
  domain: string;
  at: string;
  dns: Record<string, string[]>;
  spf: string | null;
  dmarc: string | null;
  dkimSelectors: string[];
  cert: { issuer?: string; subject?: string; validTo?: string; daysLeft?: number; error?: string };
  http: { status?: number; finalUrl?: string; headers: Record<string, string>; error?: string };
  securityTxt: { status?: number; hasContact?: boolean };
  robots: { status?: number; disallows?: string[] };
  sitemap: { status?: number };
  ctHosts: string[];
  ctError?: string;
};

const UA = `SeraphimScan-PassiveCheck/1.0 (+${SITE})`;
const SELECTORS = ["default", "google", "selector1", "selector2", "k1", "s1", "s2", "mail", "dkim", "resend", "mandrill", "smtp"];

async function tryDns<T>(f: () => Promise<T>, d: T): Promise<T> {
  try { return await f(); } catch { return d; }
}

async function txt(name: string) {
  return tryDns(async () => (await dns.resolveTxt(name)).map((r) => r.join("")), [] as string[]);
}

async function fetchT(url: string, ms = 10000, method = "GET") {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    return await fetch(url, { method, redirect: "follow", signal: c.signal, headers: { "user-agent": UA } });
  } finally {
    clearTimeout(t);
  }
}

export function cert(domain: string): Promise<Recon["cert"]> {
  return new Promise((resolve) => {
    const s = tls.connect({ host: domain, port: 443, servername: domain, timeout: 10000, rejectUnauthorized: false }, () => {
      const c = s.getPeerCertificate();
      s.end();
      if (!c || !c.valid_to) return resolve({ error: "no certificate presented" });
      const daysLeft = Math.floor((new Date(c.valid_to).getTime() - Date.now()) / 86400000);
      resolve({ issuer: (c.issuer as Record<string, string>)?.O ?? (c.issuer as Record<string, string>)?.CN, subject: (c.subject as Record<string, string>)?.CN, validTo: new Date(c.valid_to).toISOString().slice(0, 10), daysLeft, error: s.authorized ? undefined : String(s.authorizationError ?? "") || undefined });
    });
    s.on("error", (e) => resolve({ error: e.message }));
    s.on("timeout", () => { s.destroy(); resolve({ error: "timeout" }); });
  });
}

export async function homepage(domain: string): Promise<Recon["http"]> {
  try {
    const r = await fetchT(`https://${domain}/`);
    const headers: Record<string, string> = {};
    r.headers.forEach((v, k) => (headers[k] = v));
    await r.body?.cancel();
    return { status: r.status, finalUrl: r.url, headers };
  } catch (e) {
    return { headers: {}, error: (e as Error).message };
  }
}

export async function securityTxt(domain: string): Promise<Recon["securityTxt"]> {
  try {
    const r = await fetchT(`https://${domain}/.well-known/security.txt`);
    const body = r.ok ? (await r.text()).slice(0, 20000) : "";
    if (!r.ok) await r.body?.cancel();
    return { status: r.status, hasContact: /^\s*contact:/im.test(body) };
  } catch {
    return {};
  }
}

async function robots(domain: string): Promise<Recon["robots"]> {
  try {
    const r = await fetchT(`https://${domain}/robots.txt`);
    const ct = r.headers.get("content-type") ?? "";
    const body = r.ok && ct.includes("text/plain") ? (await r.text()).slice(0, 50000) : "";
    if (!body) await r.body?.cancel().catch(() => {});
    const disallows = [...body.matchAll(/^\s*disallow:\s*(\S+)/gim)].map((m) => m[1]).slice(0, 15);
    return { status: body ? r.status : r.ok ? 404 : r.status, disallows };
  } catch {
    return {};
  }
}

async function sitemap(domain: string) {
  try {
    const r = await fetchT(`https://${domain}/sitemap.xml`);
    const ok = r.ok && (r.headers.get("content-type") ?? "").includes("xml");
    await r.body?.cancel();
    return { status: ok ? r.status : r.ok ? 404 : r.status };
  } catch {
    return {};
  }
}

async function ct(domain: string): Promise<{ hosts: string[]; error?: string }> {
  try {
    const r = await fetchT(`https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`, 20000);
    if (!r.ok) return { hosts: [], error: `crt.sh ${r.status}` };
    const rows = (await r.json()) as { name_value: string }[];
    const set = new Set<string>();
    for (const row of rows) for (const n of row.name_value.split("\n")) {
      const h = n.trim().toLowerCase().replace(/^\*\./, "");
      if (h.endsWith(domain) && h !== domain) set.add(h);
    }
    return { hosts: [...set].sort().slice(0, 200) };
  } catch (e) {
    return { hosts: [], error: (e as Error).message };
  }
}

export async function spfDmarc(domain: string) {
  const root = await txt(domain);
  const dm = await txt(`_dmarc.${domain}`);
  return { root, spf: root.find((t) => t.toLowerCase().startsWith("v=spf1")) ?? null, dmarc: dm.find((t) => t.toLowerCase().startsWith("v=dmarc1")) ?? null };
}

export async function recon(domain: string): Promise<Recon> {
  const [a, aaaa, mx, ns, sd, c, http, st, rb, sm, cth] = await Promise.all([
    tryDns(() => dns.resolve4(domain), [] as string[]),
    tryDns(() => dns.resolve6(domain), [] as string[]),
    tryDns(async () => (await dns.resolveMx(domain)).map((m) => `${m.priority} ${m.exchange}`), [] as string[]),
    tryDns(() => dns.resolveNs(domain), [] as string[]),
    spfDmarc(domain),
    cert(domain),
    homepage(domain),
    securityTxt(domain),
    robots(domain),
    sitemap(domain),
    ct(domain),
  ]);
  const dkimSelectors: string[] = [];
  await Promise.all(SELECTORS.map(async (s) => {
    const t = await txt(`${s}._domainkey.${domain}`);
    if (t.some((x) => /v=dkim1|p=/i.test(x))) dkimSelectors.push(s);
  }));
  return { domain, at: new Date().toISOString(), dns: { A: a, AAAA: aaaa, MX: mx, NS: ns, TXT: sd.root }, spf: sd.spf, dmarc: sd.dmarc, dkimSelectors, cert: c, http, securityTxt: st, robots: rb, sitemap: sm, ctHosts: cth.hosts, ctError: cth.error };
}

const H = (r: Recon, k: string) => r.http.headers[k];

/** Turns recon into candidate findings. Each id has a matching re-verification in verify(). */
export function findings(r: Recon): Finding[] {
  const f: Finding[] = [];
  const hasMail = r.dns.MX.length > 0;
  if (r.cert.error && !r.cert.validTo) f.push({ id: "tls-missing", title: "No valid TLS certificate on port 443", severity: "high", evidence: `TLS handshake to ${r.domain}:443 failed: ${r.cert.error}`, fix: "Serve HTTPS with a certificate from a trusted CA (for example Let's Encrypt) and redirect HTTP to HTTPS." });
  if (r.cert.daysLeft !== undefined && r.cert.daysLeft < 21) f.push({ id: "tls-expiring", title: `TLS certificate expires in ${r.cert.daysLeft} days`, severity: r.cert.daysLeft < 7 ? "high" : "medium", evidence: `Certificate for ${r.cert.subject} valid until ${r.cert.validTo}.`, fix: "Renew the certificate and confirm automatic renewal is working." });
  if (r.http.status) {
    if (!H(r, "strict-transport-security")) f.push({ id: "hdr-hsts", title: "Missing Strict-Transport-Security header", severity: "medium", evidence: `GET https://${r.domain}/ returned ${r.http.status} with no Strict-Transport-Security header.`, fix: "Add Strict-Transport-Security: max-age=31536000; includeSubDomains once every subdomain serves HTTPS." });
    if (!H(r, "content-security-policy")) f.push({ id: "hdr-csp", title: "No Content-Security-Policy header", severity: "low", evidence: `GET https://${r.domain}/ returned no Content-Security-Policy header.`, fix: "Start with a Content-Security-Policy-Report-Only policy, review reports, then enforce." });
    if (!H(r, "x-frame-options") && !/frame-ancestors/i.test(H(r, "content-security-policy") ?? "")) f.push({ id: "hdr-frame", title: "No clickjacking protection header", severity: "low", evidence: "Neither X-Frame-Options nor a CSP frame-ancestors directive was returned on the homepage.", fix: "Add Content-Security-Policy: frame-ancestors 'self' (or X-Frame-Options: DENY)." });
    if (!H(r, "x-content-type-options")) f.push({ id: "hdr-nosniff", title: "Missing X-Content-Type-Options header", severity: "low", evidence: "The homepage response has no X-Content-Type-Options header.", fix: "Add X-Content-Type-Options: nosniff." });
    if (!H(r, "referrer-policy")) f.push({ id: "hdr-referrer", title: "No Referrer-Policy header", severity: "info", evidence: "The homepage response has no Referrer-Policy header.", fix: "Add Referrer-Policy: strict-origin-when-cross-origin." });
    const tech = ["server", "x-powered-by", "x-aspnet-version", "x-generator"].filter((k) => H(r, k) && /\d/.test(H(r, k)!));
    if (tech.length) f.push({ id: "hdr-version", title: "Software version disclosed in response headers", severity: "low", evidence: tech.map((k) => `${k}: ${H(r, k)}`).join("; "), fix: "Remove version numbers from public response headers." });
  }
  if (hasMail && !r.spf) f.push({ id: "mail-spf", title: "No SPF record although the domain receives mail", severity: "medium", evidence: `MX records exist (${r.dns.MX.slice(0, 2).join(", ")}) but no v=spf1 TXT record was found at ${r.domain}.`, fix: "Publish an SPF record listing your real senders, ending in ~all or -all." });
  if (r.spf && /\+all\b/i.test(r.spf)) f.push({ id: "mail-spf-all", title: "SPF record allows any sender (+all)", severity: "high", evidence: `SPF: ${r.spf}`, fix: "Replace +all with ~all or -all." });
  if (hasMail && !r.dmarc) f.push({ id: "mail-dmarc", title: "No DMARC record", severity: "medium", evidence: `No v=DMARC1 TXT record at _dmarc.${r.domain}.`, fix: "Publish a DMARC record, starting with p=none and a rua report address, then move to quarantine or reject." });
  if (r.dmarc && /p=none/i.test(r.dmarc)) f.push({ id: "mail-dmarc-none", title: "DMARC policy is monitor-only (p=none)", severity: "low", evidence: `_dmarc.${r.domain}: ${r.dmarc}`, fix: "After reviewing reports, move to p=quarantine and then p=reject." });
  if (r.http.status && !(r.securityTxt.status === 200 && r.securityTxt.hasContact)) f.push({ id: "sectxt", title: "No security.txt with a contact", severity: "info", evidence: `GET https://${r.domain}/.well-known/security.txt returned ${r.securityTxt.status ?? "no response"}${r.securityTxt.status === 200 ? " without a Contact: line" : ""}.`, fix: "Publish /.well-known/security.txt (RFC 9116) with Contact and Expires fields so researchers can reach you." });
  return f;
}

/** Second, independent passive check for one finding. Returns true only if the finding reproduces. */
export async function verify(domain: string, f: Finding): Promise<boolean> {
  if (f.id === "tls-missing" || f.id === "tls-expiring") {
    const c = await cert(domain);
    return f.id === "tls-missing" ? !!c.error && !c.validTo : c.daysLeft !== undefined && c.daysLeft < 21;
  }
  if (f.id.startsWith("hdr-")) {
    const h = await homepage(domain);
    if (!h.status) return false;
    const g = (k: string) => h.headers[k];
    switch (f.id) {
      case "hdr-hsts": return !g("strict-transport-security");
      case "hdr-csp": return !g("content-security-policy");
      case "hdr-frame": return !g("x-frame-options") && !/frame-ancestors/i.test(g("content-security-policy") ?? "");
      case "hdr-nosniff": return !g("x-content-type-options");
      case "hdr-referrer": return !g("referrer-policy");
      case "hdr-version": return ["server", "x-powered-by", "x-aspnet-version", "x-generator"].some((k) => g(k) && /\d/.test(g(k)!));
    }
  }
  if (f.id.startsWith("mail-")) {
    const s = await spfDmarc(domain);
    switch (f.id) {
      case "mail-spf": return !s.spf;
      case "mail-spf-all": return !!s.spf && /\+all\b/i.test(s.spf);
      case "mail-dmarc": return !s.dmarc;
      case "mail-dmarc-none": return !!s.dmarc && /p=none/i.test(s.dmarc);
    }
  }
  if (f.id === "sectxt") {
    const s = await securityTxt(domain);
    return !(s.status === 200 && s.hasContact);
  }
  return false;
}
