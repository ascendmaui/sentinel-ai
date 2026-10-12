/** "What's included" checklist for the $99 Halo Scan. Lists only checks lib/pipeline/scan.ts actually performs. */
export const HALO_INCLUDED: { group: string; items: string[] }[] = [
  { group: "TLS certificate", items: ["Certificate presented on port 443", "Issuer and subject", "Expiry date, flagged if under 21 days"] },
  { group: "HTTP security headers", items: ["Strict-Transport-Security (HSTS)", "Content-Security-Policy", "Clickjacking protection (X-Frame-Options or CSP frame-ancestors)", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy", "Software version disclosure (Server, X-Powered-By, X-AspNet-Version, X-Generator)"] },
  { group: "Cookies", items: ["Secure and HttpOnly flags on cookies set by your homepage"] },
  { group: "DNS and email authentication", items: ["A, AAAA, MX and NS records", "SPF presence and overly permissive +all", "DMARC presence and monitor-only p=none", "DKIM on 12 common selectors", "CAA records"] },
  { group: "Discovery and disclosure", items: ["Subdomains in public certificate-transparency logs", "security.txt with a contact", "robots.txt disallowed paths", "sitemap.xml"] },
  { group: "Verification and report", items: ["Every finding re-checked by a second, independent pass; anything that does not reproduce is dropped", "Branded PDF report with severity, evidence and a fix for each finding", "Emailed to you, usually within minutes of payment"] },
];

export function HaloIncluded({ open = false }: { open?: boolean }) {
  return (
    <details className="halo-included" open={open}>
      <summary>What&apos;s included in the Halo Scan</summary>
      <div className="halo-included-grid">
        {HALO_INCLUDED.map((g) => (
          <div key={g.group}>
            <h4>{g.group}</h4>
            <ul>{g.items.map((i) => <li key={i}>{i}</li>)}</ul>
          </div>
        ))}
      </div>
      <p className="fine">All checks are passive: public DNS lookups, one TLS handshake and ordinary page requests to the one domain you authorize. No active testing, exploitation or login attempts.</p>
    </details>
  );
}
