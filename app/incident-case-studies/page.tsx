import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "../../components/Icons";
import { TierCta } from "../../components/TierCta";
import { TrustBadges } from "../../components/TrustBadges";
import { BRAND_EMAIL, BRAND_MAIL, BRAND_NAME } from "../../lib/brand";
import { INCIDENTS_DISCLAIMER, incidents, scenarios, unverified } from "../../lib/incidents";
import { S } from "../../lib/sources";

const title = "Incident Case Studies";
const description = `Rogue agent investigations. Documented incidents in which AI systems reached systems they should not have, with what is known, what is our analysis, and how ${BRAND_NAME} would help you find and close the same gaps.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/incident-case-studies" },
  openGraph: { type: "article", siteName: BRAND_NAME, title: `${title}: rogue agent investigations`, description, url: "/incident-case-studies" },
};

function SrcList({ ids }: { ids: string[] }) {
  return (
    <div className="inc-src">
      <span className="tag tag-known">Sources</span>
      <ul>
        {ids.map((id) => {
          const s = S[id];
          if (!s) return null;
          return (
            <li key={id}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.label}
              </a>{" "}
              <span className="muted">({s.date})</span>
              {s.note ? <span className="muted"> {s.note}</span> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Block({ label, tag, children }: { label: string; tag: "known" | "inferred" | "ours"; children: React.ReactNode }) {
  const t = tag === "known" ? "Known (sourced)" : tag === "inferred" ? "Inferred / our analysis" : "Our analysis";
  return (
    <div className="inc-block">
      <h4>
        <span className={`tag tag-${tag}`}>{t}</span> {label}
      </h4>
      {children}
    </div>
  );
}

export default function IncidentCaseStudiesPage() {
  return (
    <main className="home cs">
      <header className="cs-head">
        <p className="eyebrow">Incident Case Studies</p>
        <h1>
          Rogue agent <span className="gold-text">investigations</span>
        </h1>
        <p className="lead">
          AI systems have now reached systems they were never meant to touch. Some did it as a byproduct of a goal, some
          were pointed there by people, and some were simply given too much access. {BRAND_NAME} exists to help teams
          find and close those gaps before an automated adversary or an over-eager agent does.
        </p>
        <p className="lead">
          Below are the documented cases we could verify from primary sources, each with a timeline, technical breakdown,
          the weaknesses involved, impact, and how our method (passive recon, Scoped Assessment, remediation and retest)
          would have flagged or helped prepare for it. We keep what is known apart from what is our analysis.
        </p>
        <TrustBadges />
        <p className="fine">{INCIDENTS_DISCLAIMER}</p>
        <ul className="inc-toc" aria-label="Contents">
          {incidents.map((i) => (
            <li key={i.id}>
              <a href={`#${i.id}`}>
                <b>{i.n}</b> {i.title}
              </a>
            </li>
          ))}
          <li>
            <a href="#hypothetical-scenarios">
              <b>H</b> Hypothetical Scenarios (our analysis, not incidents)
            </a>
          </li>
          <li>
            <a href="#not-verified">
              <b>?</b> What we could not verify
            </a>
          </li>
        </ul>
      </header>

      <section className="section" aria-labelledby="premise">
        <div className="panel">
          <p className="eyebrow">A note on the headline</p>
          <h2 id="premise">Did an AI really hack Hugging Face?</h2>
          <p>
            Yes, according to both companies involved. Hugging Face disclosed on 16 July 2026 an intrusion &quot;driven,
            end to end, by an autonomous AI agent system&quot;, and OpenAI acknowledged on 21 July that the activity came
            from its own models during an internal cyber evaluation. OpenAI&apos;s 26 August report and an independent
            METR and Redwood Research review add detail. Case 01 tells that story. Hugging Face has also had other,
            unrelated incidents (a 2024 Spaces secrets exposure and malicious uploaded models); those involve no AI
            attacker and are labeled as such in cases 08 and 09.
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="cases">
        <div className="section-head">
          <p className="eyebrow">Documented incidents</p>
          <h2 id="cases">{incidents.length} cases, each with sources</h2>
        </div>
        <div className="cs-findings">
          {incidents.map((i) => (
            <article className="card inc" key={i.id} id={i.id}>
              <p className="kick">
                Case {i.n} · {i.kicker}
              </p>
              <h3>{i.title}</h3>
              <p className="date">{i.date}</p>
              <p>
                <strong style={{ color: "var(--ao-text)" }}>{i.oneLine}</strong>
              </p>
              <p>
                <span className="tag tag-known">Standing of the record</span>
                {i.standing}
              </p>

              <Block label="Timeline" tag="known">
                <ul className="tl">
                  {i.timeline.map((t) => (
                    <li key={t.d + t.t.slice(0, 12)}>
                      <b>{t.d}</b>
                      <span>{t.t}</span>
                    </li>
                  ))}
                </ul>
              </Block>
              <Block label="1. What the AI did" tag="known">
                <ul>{i.did.map((x) => <li key={x}>{x}</li>)}</ul>
              </Block>
              <Block label="2. How it got in" tag="known">
                <ul>{i.howIn.map((x) => <li key={x}>{x}</li>)}</ul>
              </Block>
              <Block label="3. The vulnerability in the target" tag="known">
                <ul>{i.vuln.map((x) => <li key={x}>{x}</li>)}</ul>
              </Block>
              <Block label="Impact" tag="known">
                <ul>{i.impact.map((x) => <li key={x}>{x}</li>)}</ul>
              </Block>
              <Block label="What we take from it" tag="inferred">
                <ul>{i.inferred.map((x) => <li key={x}>{x}</li>)}</ul>
              </Block>

              <div className="inc-seraphim">
                <h4>
                  <span className="tag tag-ours">Our analysis</span> 4. How {BRAND_NAME} would help
                </h4>
                <h5>What a Scoped Assessment and passive recon would have flagged</h5>
                <ul>{i.seraphim.flag.map((x) => <li key={x}>{x}</li>)}</ul>
                <h5>How we would help you prepare</h5>
                <ul>{i.seraphim.prepare.map((x) => <li key={x}>{x}</li>)}</ul>
                <h5>Honest limits</h5>
                <p>{i.seraphim.limits}</p>
              </div>

              <SrcList ids={i.sources} />
            </article>
          ))}
        </div>
        <TierCta
          tier="seraphim"
          lead="These cases span applications, cloud, and AI agent systems. The full engagement covers that range: Scoped Assessment, remediation, retest and ongoing advisory."
        />
      </section>

      <section className="section" id="hypothetical-scenarios" aria-labelledby="hyp">
        <div className="section-head">
          <p className="eyebrow">
            <span className="tag tag-ours">Hypothetical, our analysis</span>
          </p>
          <h2 id="hyp">Hypothetical Scenarios</h2>
          <p className="lead">
            These are not incidents. They are conceptual walk-throughs we wrote to show how ordinary weaknesses in
            older systems and in AI agents can combine, and how a Scoped Assessment finds them first.
          </p>
          <p className="callout">
            <strong>Conceptual and educational only.</strong> Nothing here is exploit code, a payload, a command, a
            step-by-step method, a vulnerable version or a CVE walkthrough. We describe classes of weakness and
            defender-side controls. Speed comparisons are qualitative unless we cite a published figure.
          </p>
        </div>
        <div className="cs-findings">
          {scenarios.map((s) => (
            <article className="card scn" key={s.id} id={s.id}>
              <p className="kick" style={{ fontFamily: "var(--font-code)", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ao-primary)" }}>
                Scenario {s.n} · <span className="tag tag-ours">Hypothetical</span>
              </p>
              <h3>{s.title}</h3>
              <p>{s.target}</p>
              <h4>Classes of weakness involved</h4>
              <ul>{s.weaknessClass.map((x) => <li key={x}>{x}</li>)}</ul>
              <h4>The attack approach, conceptually</h4>
              <p>{s.approach}</p>
              <h4>AI-assisted speed versus a human operator</h4>
              <p>{s.speed}</p>
              <h4>Defender-side controls</h4>
              <ul>{s.controls.map((x) => <li key={x}>{x}</li>)}</ul>
              <div className="inc-seraphim">
                <h4>How {BRAND_NAME} would find and close the gap first</h4>
                <ul>{s.seraphim.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
              {s.refs.length ? (
                <div className="inc-src">
                  <span className="tag tag-known">Related sources</span>
                  <ul>
                    {s.refs.map((id) => {
                      const src = S[id];
                      if (!src) return null;
                      return (
                        <li key={id}>
                          <a href={src.url} target="_blank" rel="noopener noreferrer">
                            {src.label}
                          </a>{" "}
                          <span className="muted">({src.date})</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </article>
          ))}
        </div>
        <TierCta tier="thrones" lead="Have one system in mind, such as a legacy app, an API or an agent? A single deep Scoped Assessment with remediation guidance and a retest is our fixed-scope option." />
      </section>

      <section className="section" id="not-verified" aria-labelledby="nv">
        <div className="panel">
          <p className="eyebrow">Integrity</p>
          <h2 id="nv">What we could not verify, and how this page handles it</h2>
          <ul className="cs-limits">
            {unverified.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" aria-labelledby="how">
        <div className="panel">
          <p className="eyebrow">What we actually do</p>
          <h2 id="how">The method behind part 4 of every case</h2>
          <ul className="cs-limits">
            <li>Passive public recon: DNS and mail authentication, TLS, security headers and certificate transparency. Public information only.</li>
            <li>Scoped Assessment, with written client authorization, of applications and AI agent systems: tool permissions, secrets exposure, prompt-injection paths and sandbox boundaries. Scenario design uses private local models.</li>
            <li>Remediation guidance and retest, so fixes are verified rather than assumed.</li>
            <li>We do not run a monitoring platform, sensors or real-time blocking. We hold no certifications and claim no past clients. See <Link href="/pricing#terms">engagement terms</Link>.</li>
          </ul>
        </div>
      </section>

      <section className="section" id="contact">
        <div className="cta-band">
          <div>
            <h2>Want to know what your version of this looks like?</h2>
            <p className="lead">Tell us what you run. We reply with scope questions and a suggested tier.</p>
          </div>
          <div className="row">
            <Link className="btn btn-gold" href="/pricing#compare">
              Compare the four tiers
            </Link>
            <a className="btn btn-glass" href={`mailto:${BRAND_EMAIL}?subject=${BRAND_MAIL}%20scope%20request`}>
              <Icon name="mail" /> {BRAND_EMAIL}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
