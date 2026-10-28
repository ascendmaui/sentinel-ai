import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_NAME, OG_IMAGES, SITE_URL } from "../../lib/brand";
import { posts } from "../../lib/posts";
import { TierCta } from "../../components/TierCta";

const title = "Blog";
const description = `Sourced writing on rogue AI incidents and AI-driven attacks from ${BRAND_NAME}: what is documented, what is our analysis, and what to do about it.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/blog" },
  openGraph: { type: "website", siteName: BRAND_NAME, title: `${BRAND_NAME} blog`, description, url: "/blog", images: OG_IMAGES },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND_NAME} blog`,
    description,
    images: OG_IMAGES,
  },
};

export default function BlogIndex() {
  return (
    <main className="home cs">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            name: `${BRAND_NAME} Blog`,
            description,
            url: `${SITE_URL}/blog`,
            publisher: {
              "@type": "Organization",
              name: BRAND_NAME,
              url: SITE_URL,
            },
            blogPost: posts.map((p) => ({
              "@type": "BlogPosting",
              headline: p.title,
              description: p.description,
              datePublished: p.date,
              url: `${SITE_URL}/blog/${p.slug}`,
            })),
          }),
        }}
      />
      <header className="cs-head">
        <p className="eyebrow">Blog</p>
        <h1>
          Rogue agents, <span className="gold-text">read carefully</span>
        </h1>
        <p className="lead">
          Long-form notes on AI incidents and AI-driven attacks. Each post cites its sources, separates what is known from
          what is our analysis, and ends with what you can do about it. The full evidence base lives on the{" "}
          <Link href="/incident-case-studies" style={{ color: "var(--ao-primary)" }}>
            Incident Case Studies
          </Link>{" "}
          page.
        </p>
      </header>
      <section className="section" aria-labelledby="posts-h">
        <h2 id="posts-h" className="sr-only">
          Posts
        </h2>
        <div className="blog-grid">
          {posts.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="card post-card">
              <span className="post-meta">
                <time dateTime={p.date}>{p.date}</time> · {p.readMins} min read
              </span>
              <h3>{p.title}</h3>
              <p>{p.description}</p>
            </Link>
          ))}
        </div>
      </section>
      <div className="section">
        <TierCta tier="seraphim" lead="Not sure where to start? Compare the four ways to work with us, from an entry-level passive-recon report to a full engagement." />
      </div>
    </main>
  );
}
