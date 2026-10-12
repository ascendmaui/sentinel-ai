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

/** Only lines whose checks are in HALO_INCLUDED. Exposed-files, outdated-software and CORS lines omitted: not performed. */
export const HALO_VALUE: [string, number][] = [
  ["SSL/TLS certificate review", 150],
  ["Security headers audit", 150],
  ["Cookie settings review", 75],
  ["DNS & email security (SPF/DKIM/DMARC)", 200],
  ["Subdomain discovery", 200],
  ["Second-pass verification of every finding", 250],
  ["Branded PDF report with fixes", 300],
];

export function HaloValue() {
  const total = HALO_VALUE.reduce((s, [, v]) => s + v, 0);
  const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
  return (
    <div className="halo-value">
      <h4>Value breakdown</h4>
      <p className="fine">Estimated value if done separately by a consultant (~$150/hr)</p>
      <table>
        <tbody>
          {HALO_VALUE.map(([k, v]) => <tr key={k}><td>{k}</td><td>{usd(v)}</td></tr>)}
          <tr className="halo-value-total"><td>Total estimated value</td><td>{usd(total)}</td></tr>
          <tr className="halo-value-price"><td>Your price</td><td className="gold-text">$99</td></tr>
        </tbody>
      </table>
      <p className="fine">Estimates based on typical consultant time; not a quote from any third party.</p>
    </div>
  );
}
