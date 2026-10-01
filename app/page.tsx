import { HeroStage } from "../components/HeroStage";
import Link from "next/link";
import { Icon, type IconName } from "../components/Icons";
import { TrustBadges } from "../components/TrustBadges";
import { ScanTierStrip } from "../components/ScanTierStrip";
import { BRAND_EMAIL, BRAND_MAIL, BRAND_NAME } from "../lib/brand";

const phases: { icon: IconName; n: string; title: string; body: string }[] = [
  {
    icon: "scan",
    n: "01",
    title: "Passive scan",
    body: "You choose a tier and affirm you are authorized. The scan reads public DNS, the certificate on port 443, response headers, and — on higher tiers — the public page. It does not log in or send prompts.",
  },
  {
    icon: "list",
    n: "02",
    title: "Report",
    body: "Findings carry a severity, a short piece of evidence, and a remediation note. Anything the engine cannot check safely is marked pending. Active work is marked as a human engagement and is not invented.",
  },
  {
    icon: "fix",
    n: "03",
    title: "Scoped Assessment",
    body: "When the public report is not enough, a person takes a written scope: scenario design with private local models, remediation guidance, and a retest. That work is separate from the automated scan.",
  },
];

const audiences: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "shield",
    title: "Security and AppSec teams",
    body: "Need clear evidence of risk within an agreed scope, not another unchecked scanner dump.",
  },
  {
    icon: "users",
    title: "Founders and product leads",
    body: "Shipping fast and want a sober read on real risk before launch or fundraising diligence.",
  },
  {
    icon: "list",
    title: "Compliance and risk owners",
    body: "Require scoped assessments with audit-friendly notes and remediation trails.",
  },
];

const steps = [
  {
    n: "01",
    t: "Affirm authorization",
    d: "Name the site and confirm you own it or have written permission. The scan will not start without that checkbox.",
  },
  {
    n: "02",
    t: "Read the passive report",
    d: "DNS, TLS, headers, and the public-page checks your tier includes. Pending means we did not guess.",
  },
  {
    n: "03",
    t: "Commission a person",
    d: "A Scoped Assessment, remediation guidance, and retest stay written engagements. They are not auto-run.",
  },
];

export default function HomePage() {
  return (
    <main className="home">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="pulse" aria-hidden="true" /> Passive scan · written report
          </p>
          <h1>
            See the public surface.
            <br />
            <span className="gold-text">Before rogue AI does.</span>
          </h1>
          <p className="lead">
            {BRAND_NAME} scans a startup, company, or website you are authorized to check, then delivers a report.
            Basic coverage is DNS, TLS, and headers. Higher tiers add public clues of AI-agent exposure and a remediation
            template. Active testing stays a human Scoped Assessment.
          </p>
          <div className="row">
            <Link className="btn btn-gold" href="/scan">
              <Icon name="scan" /> Start a scan
            </Link>
            <Link className="btn btn-glass" href="/pricing">
              Compare scan tiers
            </Link>
          </div>
          <TrustBadges compact />
          <p className="fine">Always scoped · Built by Ascend Maui</p>
        </div>
        <HeroStage />
      </section>

      <section className="section" id="phases">
        <div className="section-head">
          <p className="eyebrow">What it does</p>
          <h2>Scan, report, then a person if you need one.</h2>
          <p className="lead">
            The automated path stops at public information. The human path is still recon, a Scoped Assessment, and remediation with retest.
          </p>
        </div>
        <div className="card-grid">
          {phases.map((p) => (
            <article className="card" key={p.title}>
              <span className="icon-badge">
                <Icon name={p.icon} />
              </span>
              <p className="eyebrow" style={{ marginBottom: 8 }}>
                Phase {p.n}
              </p>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="who">
        <div className="section-head">
          <p className="eyebrow">Who it&apos;s for</p>
          <h2>Teams that need clear answers within a defined scope.</h2>
        </div>
        <div className="card-grid">
          {audiences.map((a) => (
            <article className="card" key={a.title}>
              <span className="icon-badge">
                <Icon name={a.icon} />
              </span>
              <h3>{a.title}</h3>
              <p>{a.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="tiers">
        <div className="section-head">
          <p className="eyebrow">Scan tiers</p>
          <h2>From a light public report to a full passive package.</h2>
          <p className="lead">
            Same honesty at every size: passive checks only, and no prices until a scoping conversation.{" "}
            <Link href="/pricing#scans" style={{ color: "var(--ao-primary)" }}>
              Compare the scan tiers
            </Link>
            , or see the{" "}
            <Link href="/pricing#engagements" style={{ color: "var(--ao-primary)" }}>
              human Scoped Assessment tiers
            </Link>
            .
          </p>
        </div>
        <ScanTierStrip />
      </section>

      <section className="section" id="incidents">
        <div className="panel steps-teaser">
          <div>
            <p className="eyebrow">Why this matters now</p>
            <h2>AI agents have already crossed lines nobody intended.</h2>
            <p className="lead">
              In July 2026, OpenAI models running a cyber evaluation escaped their sandbox and compromised parts of
              Hugging Face, per OpenAI and Hugging Face&apos;s own reports. We read the primary sources so you do not
              have to.
            </p>
            <Link className="btn btn-gold" href="/incident-case-studies">
              Read the Incident Case Studies →
            </Link>
          </div>
          <ol className="mini-steps">
            <li>
              <span className="step-num">01</span>
              <div>
                <strong>Sourced, not sensational</strong>
                <p>Every incident separates what is documented from what is our analysis.</p>
              </div>
            </li>
            <li>
              <span className="step-num">02</span>
              <div>
                <strong>Hypothetical scenarios</strong>
                <p>Conceptual walk-throughs of weak spots in older systems and over-permissioned agents.</p>
              </div>
            </li>
            <li>
              <span className="step-num">03</span>
              <div>
                <strong>What a Scoped Assessment would flag</strong>
                <p>Honest about what we do: passive recon, assessment, remediation and retest.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section className="section" id="how">
        <div className="panel steps-teaser">
          <div>
            <p className="eyebrow">How it works</p>
            <h2>From an affirmed URL to a report you can hand over.</h2>
            <a className="btn btn-glass" href="#contact">
              Start a conversation →
            </a>
          </div>
          <ol className="mini-steps">
            {steps.map((s) => (
              <li key={s.n}>
                <span className="step-num">{s.n}</span>
                <div>
                  <strong>{s.t}</strong>
                  <p>{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section" id="contact">
        <div className="cta-band">
          <div>
            <h2>Start with the public report.</h2>
            <p className="lead">
              Run a passive scan of a site you are authorized to check, or email us if you want a human Scoped Assessment.
            </p>
          </div>
          <div className="row">
            <Link className="btn btn-gold" href="/scan">
              <Icon name="scan" /> Start a scan
            </Link>
            <a className="btn btn-glass" href={`mailto:${BRAND_EMAIL}?subject=${BRAND_MAIL}%20scope%20request`}>
              <Icon name="mail" /> Request a Scoped Assessment
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
