import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { Icon } from "../../../components/Icons";
import { TierCta } from "../../../components/TierCta";
import { BRAND_EMAIL, BRAND_MAIL, BRAND_NAME } from "../../../lib/brand";
import { postBySlug, posts } from "../../../lib/posts";
import { S } from "../../../lib/sources";

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = postBySlug(slug);
  if (!p) return {};
  return {
    title: p.title,
    description: p.description,
    alternates: { canonical: `/blog/${p.slug}` },
    openGraph: { type: "article", siteName: BRAND_NAME, title: p.title, description: p.description, url: `/blog/${p.slug}`, publishedTime: p.date },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = postBySlug(slug);
  if (!p) notFound();
  return (
    <main className="home cs">
      <article className="post">
        <header className="cs-head">
          <p className="eyebrow">
            <Link href="/blog">Blog</Link> · {p.date} · {p.readMins} min read
          </p>
          <h1>{p.title}</h1>
          <p className="lead">{p.description}</p>
        </header>

        {p.body.map((b, i) => {
          switch (b.t) {
            case "h2":
              return <h2 key={i}>{b.x}</h2>;
            case "h3":
              return <h3 key={i}>{b.x}</h3>;
            case "p":
              return <p key={i}>{b.x}</p>;
            case "quote":
              return <blockquote key={i}>{b.x}</blockquote>;
            case "ul":
              return (
                <ul key={i}>
                  {b.x.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              );
            case "ol":
              return (
                <ol key={i}>
                  {b.x.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ol>
              );
            default:
              return <Fragment key={i} />;
          }
        })}

        <p className="callout">
          <strong>Reading note.</strong> This post is analysis based on public reporting. Statements attributed to a source
          are that source&apos;s account. Where we say &quot;our analysis&quot; or &quot;we would&quot;, that is our own view. We
          have no past engagements to report. See the{" "}
          <Link href="/incident-case-studies#hypothetical-scenarios" style={{ color: "var(--ao-primary)" }}>
            Hypothetical Scenarios
          </Link>{" "}
          for conceptual, non-technical walk-throughs.
        </p>

        <section className="post-src" aria-labelledby="src-h" style={{ marginTop: 32 }}>
          <h2 id="src-h" style={{ fontSize: 22 }}>
            Sources
          </h2>
          <ul>
            {p.sources.map((id) => (
              <li key={id}>
                <a href={S[id].url} target="_blank" rel="noopener noreferrer">
                  {S[id].label}
                </a>{" "}
                <span className="muted">({S[id].date})</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="post-cta">
          <TierCta tier={p.tier} lead={p.ctaLead} />
          <div className="cta-band" style={{ marginTop: 24 }}>
            <div>
              <h2 style={{ fontSize: 26 }}>See the evidence behind this post.</h2>
              <p className="lead">The Incident Case Studies page has every incident with timeline, technical breakdown, sources and how we would help.</p>
            </div>
            <div className="row">
              <Link className="btn btn-gold" href="/incident-case-studies">
                Incident Case Studies
              </Link>
              <a className="btn btn-glass" href={`mailto:${BRAND_EMAIL}?subject=${BRAND_MAIL}%20inquiry`}>
                <Icon name="mail" /> Email us
              </a>
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}
