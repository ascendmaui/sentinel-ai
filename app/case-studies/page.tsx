import type { Metadata } from "next";
import { Icon } from "../../components/Icons";
import { findings, severityCounts } from "../../lib/caseStudies";

const title = "Case studies";
const description =
  "Self-engagement: airport ride platform. How Sentinel AI assessed an application owned by the same principal — findings, proposed severities, and documented before/after fixes.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/case-studies" },
  openGraph: {
    type: "article",
    siteName: "Sentinel AI",
    title: "Case study — Self-engagement: airport ride platform",
    description,
    url: "/case-studies",
  },
};

const phases = [
  {
    n: "01",
    title: "Reconnaissance",
    state: "Performed (observational)",
    body: "An observational inventory of the application: what it does, its tech stack, whether it handles user data and payments, and a sketch of its surface (accounts, public API routes, payments, an admin area). No probing was involved.",
  },
  {
    n: "02",
    title: "Authorized offensive pass",
    state: "Not performed",
    body: "No active scanning or exploitation was carried out. In its place, the assessor did a read-only review of the application's source code, which is where the code-review findings below come from.",
  },
  {
    n: "03",
    title: "Remediation",
    state: "Performed, with verification",
    body: "Fixes were written and merged. Where the remediation log records a production change or a verification check, it is stated with the finding.",
  },
];

const summary: { k: string; v: string }[] = [
  { k: "Assessor", v: "Sentinel AI, an Ascend Maui initiative" },
  {
    k: "Target",
    v: "A regional airport ride-booking platform (rider and driver apps, web API, card payments), owned and operated by the same principal. This is a self-engagement.",
  },
  {
    k: "Method",
    v: "Reconnaissance, code review, and remediation with verification. See the phase table below for what was and was not done.",
  },
  {
    k: "Scope and authorization",
    v: "Owner-authorized self-assessment of the owner's own application. Scope is limited to the application's own code and configuration.",
  },
  {
    k: "Report status",
    v: "No formal engagement memo or scan report has been issued for this self-assessment. This page summarizes documented code-review findings and the application's remediation log.",
  },
];

export default function CaseStudiesPage() {
  return (
    <main className="home cs">
      <header className="cs-head">
        <p className="eyebrow">Case studies</p>
        <h1>
          Self-engagement: <span className="gold-text">airport ride platform</span>
        </h1>
        <p className="lead">
          The first Sentinel AI case study: an assessment of an application its owner also built and
          runs. We show what was found, how we rate it, what changed, and — just as important — what was
          not done.
        </p>
        <p className="fine">
          Case study 01 · September 2026 · Findings are summarized in public-safe language; no exploit
          steps, secrets, or internal identifiers are published.
        </p>
      </header>

      <section className="section" aria-labelledby="cs-summary">
        <div className="panel">
          <p className="eyebrow">Assessment summary</p>
          <h2 id="cs-summary">Who, what, and how</h2>
          <dl className="cs-dl">
            {summary.map((s) => (
              <div key={s.k}>
                <dt>{s.k}</dt>
                <dd>{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="section" aria-labelledby="cs-phases">
        <div className="section-head">
          <p className="eyebrow">Method, honestly</p>
          <h2 id="cs-phases">The three phases: what actually happened</h2>
          <p className="lead">
            Sentinel AI&apos;s method has three phases. For this engagement they were not all performed
            in full, and we say so.
          </p>
        </div>
        <div className="card-grid">
          {phases.map((p) => (
            <article className="card" key={p.title}>
              <p className="eyebrow" style={{ marginBottom: 8 }}>
                Phase {p.n}
              </p>
              <h3>{p.title}</h3>
              <p className="cs-state">{p.state}</p>
              <p>{p.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="cs-findings">
        <div className="section-head">
          <p className="eyebrow">Findings</p>
          <h2 id="cs-findings">
            {findings.length} findings, all documented and addressed
          </h2>
          <p className="lead">
            Severities are proposed assessor ratings, not the output of a formal scoring process.
          </p>
          <ul className="cs-counts" aria-label="Findings by proposed severity">
            {(["Critical", "High", "Medium", "Low", "Info"] as const)
              .filter((s) => severityCounts[s])
              .map((s) => (
                <li key={s}>
                  <span className={`cs-sev cs-sev-${s.toLowerCase()}`}>{s}</span> {severityCounts[s]}
                </li>
              ))}
          </ul>
        </div>

        <div className="cs-findings">
          {findings.map((f) => (
            <article className="card cs-finding" key={f.id} id={f.id.toLowerCase()}>
              <div className="cs-finding-top">
                <span className="cs-id">{f.id}</span>
                <span className={`cs-sev cs-sev-${f.severity.toLowerCase()}`}>
                  {f.severity} <span className="cs-sev-note">· proposed</span>
                </span>
              </div>
              <h3>{f.title}</h3>
              <p className="cs-rationale">{f.rationale}</p>

              <h4>What it was</h4>
              <p>{f.what}</p>

              <div className="cs-ba">
                <div>
                  <h4>Before</h4>
                  <p>{f.before}</p>
                </div>
                <div>
                  <h4>After</h4>
                  <p>{f.after}</p>
                </div>
              </div>

              <h4>Suggested fix</h4>
              <p>{f.fix}</p>

              <p className="cs-status">
                <Icon name="check" /> <strong>Status:</strong> {f.status}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="cs-limits">
        <div className="panel">
          <p className="eyebrow">Limits of this write-up</p>
          <h2 id="cs-limits">What this case study does not claim</h2>
          <ul className="cs-limits">
            <li>It does not describe an active penetration test, vulnerability scan, or exploitation.</li>
            <li>
              Findings come from a read-only code review and the application&apos;s own remediation log;
              they are not an exhaustive list of the application&apos;s weaknesses.
            </li>
            <li>
              Ratings are proposed by the assessor. Because the assessor and owner are the same
              principal, this is a self-assessment and not independent assurance.
            </li>
          </ul>
        </div>
      </section>

      <section className="section" id="contact">
        <div className="cta-band">
          <div>
            <h2>Want an assessment of your own?</h2>
            <p className="lead">
              Tell us what you need assessed. We&apos;ll reply with scope questions and next steps.
            </p>
          </div>
          <div className="row">
            <a className="btn btn-gold" href="mailto:ascendmaui@gmail.com?subject=Sentinel%20AI%20inquiry">
              <Icon name="mail" /> ascendmaui@gmail.com
            </a>
            <a className="btn btn-glass" href="mailto:ascendmaui@gmail.com?subject=Sentinel%20AI%20scope%20request">
              Request a scoped pass
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
