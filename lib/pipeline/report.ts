import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Finding, Recon } from "./scan";
import { LOGO_PNG_B64 } from "./logo";
import { SITE } from "./config";

const BANNED = [/—/, /–/, /\bpentest(ing)?\b/i, /penetration test/i, /\bguarantee/i, /\bcertif(y|ied|ication)\b/i, /\bcompliant\b/i, /\bhack(ed)?\b/i];

/** Quality gate over every string in the report: wording rules plus "no claim without evidence". */
export function gate(verified: Finding[], texts: string[]): string[] {
  const problems: string[] = [];
  for (const t of texts) for (const b of BANNED) if (b.test(t)) problems.push(`banned wording ${b} in: ${t.slice(0, 80)}`);
  for (const f of verified) if (!f.evidence || f.evidence.length < 10) problems.push(`finding ${f.id} has no evidence`);
  return problems;
}

const SEV_ORDER = { high: 0, medium: 1, low: 2, info: 3 } as const;
const SEV_COLOR = { high: rgb(0.75, 0.16, 0.16), medium: rgb(0.85, 0.5, 0.1), low: rgb(0.55, 0.45, 0.1), info: rgb(0.35, 0.38, 0.45) };
const GOLD = rgb(0.72, 0.55, 0.18);
const INK = rgb(0.1, 0.1, 0.14);
const MUTED = rgb(0.38, 0.4, 0.46);

export const SCOPE_TEXT = (d: string) => `Passive checks of ${d} only, the single domain you authorized at checkout: public DNS records (A, AAAA, MX, NS, TXT, SPF, DMARC, common DKIM selectors), one TLS handshake to read the certificate, plain requests for the homepage, /.well-known/security.txt, /robots.txt and /sitemap.xml, and a certificate transparency search on crt.sh.`;
export const NOT_TEXT = [
  "Not a Scoped Assessment. No active testing, exploitation, port scanning, fuzzing, login attempts or brute forcing was performed.",
  "Not a review of your application logic, APIs, cloud configuration or AI agents.",
  "Not a compliance audit or an attestation of any kind.",
  "Not proof that no other issues exist. It is a snapshot of what was publicly visible at the time of the check.",
];

export function summaryText(domain: string, verified: Finding[], dropped: number) {
  if (!verified.length) return `Clean baseline. Our passive checks of ${domain} did not produce any finding that reproduced on a second independent check. That is a good sign for the public surface we looked at, and it is a useful baseline to compare against later.${dropped ? ` ${dropped} candidate observation(s) did not reproduce and were left out.` : ""}`;
  const c = (s: string) => verified.filter((f) => f.severity === s).length;
  return `We found ${verified.length} verified observation(s) on the public surface of ${domain}: ${c("high")} high, ${c("medium")} medium, ${c("low")} low and ${c("info")} informational. Every item below was confirmed by a second, independent passive check; ${dropped} candidate(s) that did not reproduce were left out. Start with the highest severity items.`;
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const w of para.split(/\s+/)) {
      const t = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(t, size) > width && line) { out.push(line); line = w; } else line = t;
    }
    out.push(line);
  }
  return out;
}

const clean = (s: string) => s.replace(/[^\x20-\x7E\n]/g, "?");

export async function buildPdf(r: Recon, verified: Finding[], dropped: number, orderRef: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Seraphim Halo Scan report: ${r.domain}`);
  doc.setAuthor("Seraphim Scan");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await doc.embedPng(Buffer.from(LOGO_PNG_B64, "base64"));
  const W = 612, Hh = 792, M = 54, CW = W - 2 * M;
  let page: PDFPage = doc.addPage([W, Hh]);
  let y = Hh - M;
  const newPage = () => { page = doc.addPage([W, Hh]); y = Hh - M; };
  const ensure = (h: number) => { if (y - h < M + 20) newPage(); };
  const text = (s: string, o: { size?: number; f?: PDFFont; color?: ReturnType<typeof rgb>; gap?: number; indent?: number } = {}) => {
    const size = o.size ?? 10.5, f = o.f ?? font, ind = o.indent ?? 0;
    for (const line of wrap(clean(s), f, size, CW - ind)) { ensure(size + 4); page.drawText(line, { x: M + ind, y: y - size, size, font: f, color: o.color ?? INK }); y -= size + 4; }
    y -= o.gap ?? 4;
  };
  const h2 = (s: string) => { ensure(40); y -= 8; text(s, { size: 14, f: bold, color: GOLD, gap: 6 }); };

  const lw = 190, lh = (logo.height / logo.width) * lw;
  page.drawImage(logo, { x: M, y: y - lh, width: lw, height: lh });
  y -= lh + 18;
  text("Halo Scan: passive perimeter sweep, dual-verified", { size: 18, f: bold });
  text(`Domain: ${r.domain}    Checked: ${r.at.slice(0, 16).replace("T", " ")} UTC    Reference: ${orderRef}`, { size: 9, color: MUTED, gap: 10 });

  h2("Executive summary");
  text(summaryText(r.domain, verified, dropped));

  h2("Findings");
  if (!verified.length) text("No verified findings. See the baseline below for what was observed.");
  for (const f of [...verified].sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity])) {
    ensure(70);
    text(`${f.severity.toUpperCase()}   ${f.title}`, { f: bold, color: SEV_COLOR[f.severity], gap: 2 });
    text(`Evidence: ${f.evidence}`, { size: 9.5, indent: 12, gap: 1 });
    text(`Fix: ${f.fix}`, { size: 9.5, indent: 12, gap: 8 });
  }

  h2("Baseline observed");
  const rows: [string, string][] = [
    ["A / AAAA", [...r.dns.A, ...r.dns.AAAA].slice(0, 6).join(", ") || "none"],
    ["MX", r.dns.MX.join(", ") || "none (domain does not receive mail)"],
    ["SPF", r.spf ?? "none"],
    ["DMARC", r.dmarc ?? "none"],
    ["DKIM selectors found", r.dkimSelectors.join(", ") || "none of the common selectors we check"],
    ["TLS certificate", r.cert.validTo ? `${r.cert.issuer ?? "unknown issuer"}, valid until ${r.cert.validTo} (${r.cert.daysLeft} days)` : `not readable: ${r.cert.error}`],
    ["Homepage", r.http.status ? `HTTP ${r.http.status}` : `no response: ${r.http.error}`],
    ["Public tech hints", ["server", "x-powered-by", "x-vercel-id", "cf-ray", "via"].filter((k) => r.http.headers[k]).map((k) => `${k}: ${r.http.headers[k].slice(0, 40)}`).join("; ") || "none"],
    ["security.txt", r.securityTxt.status === 200 ? (r.securityTxt.hasContact ? "present with Contact" : "present, no Contact") : "not found"],
    ["robots.txt", r.robots.status === 200 ? `present${r.robots.disallows?.length ? `, disallows: ${r.robots.disallows.slice(0, 6).join(" ")}` : ""}` : "not found"],
    ["sitemap.xml", r.sitemap.status === 200 ? "present" : "not found"],
    ["Certificate transparency", r.ctError ? `unavailable (${r.ctError})` : `${r.ctHosts.length} subdomain name(s) in public CT logs${r.ctHosts.length ? `: ${r.ctHosts.slice(0, 12).join(", ")}${r.ctHosts.length > 12 ? " ..." : ""}` : ""}`],
  ];
  for (const [k, v] of rows) text(`${k}: ${v}`, { size: 9.5, gap: 2 });
  if (r.ctHosts.length) text("Review the subdomain list and retire any hosts you no longer use; forgotten hosts are a common way in.", { size: 9.5, color: MUTED });

  h2("Scope");
  text(SCOPE_TEXT(r.domain));
  h2("What this is not");
  for (const n of NOT_TEXT) text(`- ${n}`, { size: 10 });
  h2("Next steps");
  text(`Want these fixed? Reply to the report email and we'll send a custom quote to fix every issue we found. No obligation. Or start at ${SITE}/start?path=call`);

  const pages = doc.getPages();
  pages.forEach((p, i) => p.drawText(`Seraphim Scan  |  Passive check, reviewed automatically  |  Page ${i + 1} of ${pages.length}`, { x: M, y: 28, size: 8, font, color: MUTED }));
  return doc.save();
}
