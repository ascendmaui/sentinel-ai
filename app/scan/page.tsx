import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ScanForm } from "../../components/ScanForm";
import { TrustBadges } from "../../components/TrustBadges";
import { BRAND_NAME } from "../../lib/brand";
import { scanTiers } from "../../lib/scanTiers";

const title = "Run a passive scan";
const description = `Choose a ${BRAND_NAME} tier, confirm you are authorized, and receive a passive public report. Active testing is not included.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/scan" },
  openGraph: { type: "website", siteName: BRAND_NAME, title: `${BRAND_NAME}: ${title}`, description, url: "/scan" },
};

export default function ScanPage() {
  return (
    <main className="home cs">
      <header className="cs-head">
        <p className="eyebrow">Scan</p>
        <h1>
          Scan the public surface. <span className="gold-text">Leave with a report.</span>
        </h1>
        <p className="lead">
          {BRAND_NAME} checks a website you are authorized to look at: DNS, the certificate on port 443, and response headers. Higher tiers
          add the public page, AI-widget hints, and a remediation template. Nothing active runs from this form.
        </p>
        <TrustBadges compact />
      </header>
      <Suspense fallback={<p className="fine">Loading the scan form…</p>}>
        <ScanForm />
      </Suspense>
      <section className="section" aria-labelledby="included-h">
        <div className="section-head">
          <p className="eyebrow">What each tier runs</p>
          <h2 id="included-h">Basic through Full</h2>
          <p className="lead">
            Human Scoped Assessments stay on the <Link href="/pricing#engagements">services page</Link>. They are not started here.
          </p>
        </div>
        <div className="card-grid">
          {scanTiers.map((tier) => (
            <article key={tier.id} className="card">
              <p className="eyebrow">
                {tier.label} · {tier.className}
              </p>
              <h3>{tier.positioning}</h3>
              <ul>
                {tier.runsNow.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
