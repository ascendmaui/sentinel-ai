import { HeroStage } from "../components/HeroStage";
import { Icon, type IconName } from "../components/Icons";

const phases: { icon: IconName; n: string; title: string; body: string }[] = [
  {
    icon: "scan",
    n: "01",
    title: "Recon",
    body: "Passive review of public information: the hosts, apps, and exposures that can be seen from outside, so the next phase is aimed at what matters, not noise.",
  },
  {
    icon: "target",
    n: "02",
    title: "Scoped Assessment",
    body: "Scenario design with private local models, carried out within an agreed scope. Findings are documented and the work stops at the boundaries you set.",
  },
  {
    icon: "fix",
    n: "03",
    title: "Remediation and Retest",
    body: "Turn findings into ranked fixes, clear owners, and verification steps, then retest so engineering can confirm the gaps are closed.",
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
    t: "Define scope",
    d: "Agree on systems, accounts, windows, and hard stop conditions. Nothing starts without a written scope.",
  },
  {
    n: "02",
    t: "Run the three phases",
    d: "Recon, Scoped Assessment, then Remediation and Retest, reported as you go so surprises stay visible.",
  },
  {
    n: "03",
    t: "Verify and hand off",
    d: "Confirm critical fixes, leave a durable record, and leave the door open for a follow-up pass when the stack changes.",
  },
];

export default function HomePage() {
  return (
    <main className="home">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="pulse" aria-hidden="true" /> Scoped security assessments
          </p>
          <h1>
            Find what breaks.
            <br />
            <span className="gold-text">Fix it on purpose.</span>
          </h1>
          <p className="lead">
            Sentinel AI helps teams run scoped security work in three clear phases: passive recon, a
            Scoped Assessment, and remediation with retest, so you learn where the real risk is and how to
            close it.
          </p>
          <div className="row">
            <a className="btn btn-gold" href="mailto:ascendmaui@gmail.com?subject=Sentinel%20AI%20inquiry">
              <Icon name="mail" /> Contact us
            </a>
            <a className="btn btn-glass" href="#phases">
              See the phases
            </a>
          </div>
          <p className="fine">Always scoped · Built by Ascend Maui</p>
        </div>
        <HeroStage />
      </section>

      <section className="section" id="phases">
        <div className="section-head">
          <p className="eyebrow">What it does</p>
          <h2>Three phases. One clear outcome.</h2>
          <p className="lead">
            A disciplined path from public surface map to scoped findings to a verified fix list.
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

      <section className="section" id="how">
        <div className="panel steps-teaser">
          <div>
            <p className="eyebrow">How it works</p>
            <h2>From written scope to verified fixes.</h2>
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
            <h2>Ready to put a sentry on the gate?</h2>
            <p className="lead">
              Tell us what you need assessed. We&apos;ll reply with scope questions and next steps, with no cold
              scanner spam.
            </p>
          </div>
          <div className="row">
            <a className="btn btn-gold" href="mailto:ascendmaui@gmail.com?subject=Sentinel%20AI%20inquiry">
              <Icon name="mail" /> ascendmaui@gmail.com
            </a>
            <a className="btn btn-glass" href="mailto:ascendmaui@gmail.com?subject=Sentinel%20AI%20scope%20request">
              Request a scoped assessment
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
