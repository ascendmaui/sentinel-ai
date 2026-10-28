import { BRAND_NAME } from "../lib/brand";

export default function Loading() {
  return (
    <main className="home cs" aria-busy="true" aria-live="polite">
      <h1 id="loading-h" className="sr-only">Loading {BRAND_NAME}</h1>
      <section
        className="section"
        aria-labelledby="loading-h"
        style={{
          minHeight: "50vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "60px 24px",
        }}
      >
        <div
          role="status"
          aria-label={`Loading ${BRAND_NAME}...`}
          style={{
            display: "inline-block",
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "3px solid rgba(242, 181, 68, 0.2)",
            borderTopColor: "var(--ao-primary, #f2b544)",
            animation: "spin 0.8s linear infinite",
            marginBottom: 20,
          }}
        />
        <p className="eyebrow" style={{ color: "var(--ao-primary)" }}>
          Loading assessment content...
        </p>
      </section>
    </main>
  );
}
