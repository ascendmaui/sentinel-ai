import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_NAME, BRAND_SLOGAN } from "../../lib/brand";

export const metadata: Metadata = {
  title: "Partners",
  description: `${BRAND_SLOGAN} Partner with ${BRAND_NAME}: agencies, dev shops and advisors who want scoped security assessments for their clients.`,
  alternates: { canonical: "/partners" },
};

export default function PartnersPage() {
  return (
    <main className="home cs">
      <header className="cs-head">
        <p className="eyebrow">Partners</p>
        <h1>
          {BRAND_SLOGAN.replace(` with ${BRAND_NAME}.`, "")} <span className="gold-text">with {BRAND_NAME}.</span>
        </h1>
        <p className="lead">
          We work with agencies, development shops, fractional CTOs and advisors whose clients ship AI agents and web
          platforms. You refer or bring us in; we run passive recon, a Scoped Assessment with written client
          authorization, and remediation with retest.
        </p>
      </header>
      <section className="section">
        <div className="panel">
          <h2>How it works</h2>
          <ul className="cs-limits">
            <li>Introduce a client, or tell us about a project where security review would help.</li>
            <li>We scope in writing with the client. Nothing starts without their written authorization.</li>
            <li>You stay in the loop on findings and fixes, as agreed with the client.</li>
            <li>We do not claim past partner engagements or display partner logos.</li>
          </ul>
          <div className="row">
            <Link className="btn btn-gold" href="/start?path=call">Talk to us about partnering</Link>
            <Link className="btn btn-glass" href="/pricing">See tiers and pricing</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
