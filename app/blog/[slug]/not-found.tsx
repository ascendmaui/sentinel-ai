import Link from "next/link";
import { BRAND_NAME } from "../../../lib/brand";
import { posts } from "../../../lib/posts";

export default function BlogPostNotFound() {
  return (
    <main className="home cs">
      <section
        className="section"
        aria-labelledby="post-not-found-h"
        style={{ textAlign: "center", padding: "80px 24px" }}
      >
        <p className="eyebrow" style={{ color: "var(--ao-primary)" }}>
          404 · Article not found
        </p>
        <h1
          id="post-not-found-h"
          style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", margin: "16px 0 24px" }}
        >
          Post <span className="gold-text">out of scope</span>
        </h1>
        <p className="lead" style={{ maxWidth: 560, margin: "0 auto 32px" }}>
          The requested article does not exist or has been renamed. Explore our published notes on AI security below.
        </p>
        <div style={{ maxWidth: 640, margin: "0 auto 36px", textAlign: "left" }}>
          <p className="eyebrow" style={{ textAlign: "center", marginBottom: 12 }}>
            Available articles
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {posts.map((p) => (
              <li
                key={p.slug}
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <Link
                  href={`/blog/${p.slug}`}
                  style={{ color: "var(--ao-text)", textDecoration: "none", fontWeight: 500 }}
                >
                  {p.title}
                </Link>
                <span className="muted" style={{ display: "block", fontSize: "0.85rem", marginTop: 4 }}>
                  {p.date} · {p.readMins} min read
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="row" style={{ justifyContent: "center", gap: 12 }}>
          <Link href="/blog" className="btn btn-gold">
            Return to blog
          </Link>
          <Link href="/" className="btn btn-glass">
            Return home
          </Link>
          <Link href="/incident-case-studies" className="btn btn-glass">
            Incident case studies
          </Link>
        </div>
      </section>
    </main>
  );
}
