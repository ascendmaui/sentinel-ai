"use client";

import { useEffect } from "react";
import Link from "next/link";
import { BRAND_EMAIL, BRAND_MAIL, BRAND_NAME } from "../lib/brand";
import { Icon } from "../components/Icons";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected client exceptions in non-production environments
    if (process.env.NODE_ENV !== "production") {
      console.error("App error boundary caught:", error);
    }
  }, [error]);

  return (
    <main className="home cs">
      <section
        className="section"
        aria-labelledby="error-h"
        style={{ textAlign: "center", padding: "80px 24px" }}
      >
        <p className="eyebrow" style={{ color: "var(--ao-primary)" }}>
          500 · Unexpected condition
        </p>
        <h1
          id="error-h"
          style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", margin: "16px 0 24px" }}
        >
          Assessment <span className="gold-text">interrupted</span>
        </h1>
        <p className="lead" style={{ maxWidth: 560, margin: "0 auto 32px" }}>
          An unexpected error occurred while loading this view. You can retry the operation or return to the main scope.
        </p>
        <div className="row" style={{ justifyContent: "center", gap: 12 }}>
          <button
            type="button"
            onClick={() => reset()}
            className="btn btn-gold"
          >
            Try again
          </button>
          <Link href="/" className="btn btn-glass">
            Return home
          </Link>
          <Link href="/pricing" className="btn btn-glass">
            Services &amp; tiers
          </Link>
          <a
            className="btn btn-glass"
            href={`mailto:${BRAND_EMAIL}?subject=${BRAND_MAIL}%20support`}
          >
            <Icon name="mail" /> Contact team
          </a>
        </div>
      </section>
    </main>
  );
}
