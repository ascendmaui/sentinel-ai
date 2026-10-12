import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "../../components/Icons";
import { TierEmblem } from "../../components/TierEmblem";
import { HaloIncluded } from "../../components/HaloIncluded";
import { TrustBadges } from "../../components/TrustBadges";
import { BRAND_EMAIL, BRAND_MAIL, BRAND_NAME } from "../../lib/brand";
import { ENGAGEMENT_TERMS, helper, matrix, tierHref, tiers, type TierId } from "../../lib/tiers";

const title = "Services and tiers";
const description = `${BRAND_NAME} offers four ways to work together: Seraphim, Cherubim, Thrones and Angels. Starting-at prices from $950, with Seraphim as the flagship. Every engagement is scoped and quoted in writing.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/pricing" },
  openGraph: { type: "website", siteName: BRAND_NAME, title: `${BRAND_NAME}: ${title}`, description, url: "/pricing" },
};

const order: TierId[] = ["seraphim", "cherubim", "thrones", "angels"];

function Cell({ v }: { v: boolean | string }) {
  if (v === true) return <span className="yes">Included</span>;
  if (v === false) return <span className="no">Not included</span>;
  return <span className="yes">{v}</span>;
}

export default function PricingPage() {
  const flagship = tiers.find((t) => t.id === "seraphim")!;
  const rest = tiers.filter((t) => t.id !== "seraphim");
  return (
    <main className="home cs">
      <header className="cs-head">
        <p className="eyebrow">Services</p>
        <h1>
          Four tiers. <span className="gold-text">One honest method.</span>
        </h1>
        <p className="lead">
          {BRAND_NAME} is passive public recon, Scoped Assessments of applications and AI agent systems, and remediation
          with retest. The tiers below are simply different amounts of that work, over different periods. Pick the
          one that fits, or start small and move up.
        </p>
        <TrustBadges />
        <p className="fine">
          Prices below are starting points per scoped engagement. Your final price depends on the size of the scope
          and is agreed in writing before any work starts.
        </p>
      </header>

      <section className="section" aria-labelledby="tiers-h">
        <div className="section-head">
          <p className="eyebrow">The line-up</p>
          <h2 id="tiers-h">From full engagement to a light first look</h2>
        </div>
        <article id="basic" className="card tier-card" style={{ marginBottom: 24, borderColor: "var(--ao-line-gold)" }}>
          <span className="tier-pos">Instant, automated</span>
          <h3>Halo Scan</h3>
          <p className="tier-price">
            <strong className="gold-text" style={{ fontSize: 30 }}>$99</strong> <span className="fine">flat, one-time</span>
          </p>
          <p>
            A full passive perimeter sweep of your external footprint, run with your permission: DNS and mail authentication,
            TLS, security headers and certificate transparency. Every finding is dual-verified and delivered in a branded PDF report with a prioritized fix list.
          </p>
          <p className="fine"><strong>Timeline:</strong> automated passive checks start after payment; the PDF report is usually emailed within minutes, and always within 3 business days.</p>
          <p className="fine">
            <strong>Not included:</strong> active testing or exploitation, application or AI agent review, retest, compliance
            certification. Checks are passive and limited to the one domain you authorize, and every finding is re-verified by a second check before it goes in the report.
          </p>
          <HaloIncluded />
          <div className="tier-cta">
            <Link className="btn btn-gold" href="/start?path=basic">Get the $99 Halo Scan</Link>
          </div>
        </article>
        <div className="tier-grid">
          {[flagship, ...rest].map((t) => (
            <article
              key={t.id}
              id={t.id}
              className={t.id === "seraphim" ? "card tier-card tier-flagship" : "card tier-card"}
            >
              <div className="tier-top">
                <span className="tier-emblem-wrap">
                  <TierEmblem id={t.id} size={t.id === "seraphim" ? 56 : 40} />
                </span>
                <div>
                  <p className="tier-rank">Tier {t.rank} of 4</p>
                  <h3>{t.name}</h3>
                </div>
              </div>
              {t.id === "seraphim" && <span className="tier-pos">Flagship</span>}
              <p className="tier-price">
                <span className="fine">Starting at</span> <strong className="gold-text" style={{ fontSize: t.id === "seraphim" ? 34 : 26 }}>{t.price}</strong>{" "}
                <span className="fine">{t.priceUnit}</span>
              </p>
              <p className="fine"><strong>Timeline:</strong> {t.timeline}</p>
              <p className="tier-tag">{t.tagline}</p>
              <p>{t.summary}</p>
              <div className={t.id === "seraphim" ? "tier-cols" : undefined}>
                <div>
                  <h4>What is included</h4>
                  <ul>
                    {t.included.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4>Deliverables</h4>
                  <ul>
                    {t.deliverables.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                  <h4>Who it is for</h4>
                  <p>{t.forWho}</p>
                  <h4>Not included</h4>
                  <ul className="tier-not">
                    {t.notIncluded.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="tier-cta">
                <a
                  className={t.id === "seraphim" ? "btn btn-gold" : "btn btn-glass"}
                  href={`/start?path=call&tier=${t.id}`}
                >
                  Start with {t.name}
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="compare" aria-labelledby="cmp-h">
        <div className="section-head">
          <p className="eyebrow">Compare</p>
          <h2 id="cmp-h">Side by side</h2>
          <p className="lead">What each tier includes today. If a cell says not included, it is not part of that tier.</p>
        </div>
        <div className="table-wrap">
          <table className="cmp">
            <thead>
              <tr>
                <th scope="col">What you get</th>
                {order.map((id) => (
                  <th scope="col" key={id} className={id === "seraphim" ? "cmp-hi" : undefined}>
                    {tiers.find((t) => t.id === id)!.name}
                  </th>
                ))}
              </tr>
              <tr>
                <th scope="col">Positioning</th>
                {order.map((id) => (
                  <th scope="col" key={id} className={id === "seraphim" ? "cmp-hi" : undefined} style={{ fontSize: 12.5, fontWeight: 500 }}>
                    {tiers.find((t) => t.id === id)!.positioning}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((r) => (
                <tr key={r.row}>
                  <th scope="row">{r.row}</th>
                  {order.map((id) => (
                    <td key={id} className={id === "seraphim" ? "cmp-hi" : undefined}>
                      <Cell v={r.values[id]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section" id="fit" aria-labelledby="fit-h">
        <div className="panel">
          <p className="eyebrow">Which tier fits</p>
          <h2 id="fit-h">{helper[0].q}</h2>
          <div className="helper">
            {helper[0].a.map((o) => (
              <Link key={o.label} href={tierHref(o.tier)}>
                <span>{o.label}</span>
                <span>{tiers.find((t) => t.id === o.tier)!.name} →</span>
              </Link>
            ))}
          </div>
          <p className="fine">Not sure? Email us with a sentence about your stack and we will suggest a starting point.</p>
        </div>
      </section>

      <section className="section" id="terms" aria-labelledby="terms-h">
        <div className="panel">
          <p className="eyebrow">Engagement terms</p>
          <h2 id="terms-h">Written authorization comes first</h2>
          <p>{ENGAGEMENT_TERMS}</p>
          <ul className="cs-limits">
            <li>We do not run a monitoring platform, install sensors or agents, or offer round-the-clock response.</li>
            <li>We do not hold security certifications, and we do not display client logos or client statistics.</li>
            <li>No past engagements are claimed on this site. The one case study we publish is a self-assessment.</li>
            <li>
              Learn from real incidents on the <Link href="/incident-case-studies">Incident Case Studies</Link> page and
              the <Link href="/blog">blog</Link>.
            </li>
          </ul>
        </div>
      </section>

      <section className="section" id="contact">
        <div className="cta-band">
          <div>
            <h2>Custom scope? Talk to us.</h2>
            <p className="lead">Several apps, an unusual stack, or a deadline? Tell us what you run and what worries you. We reply with scope questions, a suggested tier and a written quote.</p>
          </div>
          <div className="row">
            <a className="btn btn-gold" href="/start?path=call">
              Custom scope? Talk to us
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
