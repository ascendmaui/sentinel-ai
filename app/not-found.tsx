import Link from "next/link";
import { BRAND_NAME } from "../lib/brand";

export default function NotFound() {
  return (
    <main className="home cs">
      <section className="section" style={{ textAlign: "center", padding: "80px 24px" }}>
        <p className="eyebrow" style={{ color: "var(--ao-primary)" }}>
          404 · Page not found
        </p>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", margin: "16px 0 24px" }}>
          Target <span className="gold-text">out of scope</span>
        </h1>
        <p className="lead" style={{ maxWidth: 560, margin: "0 auto 32px" }}>
          The path you requested does not exist or has moved. Every {BRAND_NAME} assessment stays strictly within agreed
          boundaries.
        </p>
        <div className="row" style={{ justifyContent: "center", gap: 12 }}>
          <Link href="/" className="btn btn-gold">
            Return home
          </Link>
          <Link href="/blog" className="btn btn-glass">
            Read the blog
          </Link>
          <Link href="/incident-case-studies" className="btn btn-glass">
            Incident case studies
          </Link>
          <Link href="/pricing" className="btn btn-glass">
            Services &amp; tiers
          </Link>
        </div>
      </section>
    </main>
  );
}
