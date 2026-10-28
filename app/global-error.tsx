"use client";

import { useEffect } from "react";
import { BRAND_NAME } from "../lib/brand";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("Global root layout error caught:", error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          backgroundColor: "#0b0c10",
          color: "#f3f4f6",
          fontFamily: "system-ui, -apple-system, sans-serif",
          margin: 0,
          padding: 0,
        }}
      >
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 520 }}>
            <p
              style={{
                color: "#f2b544",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                fontSize: "0.85rem",
                fontWeight: 600,
                marginBottom: "12px",
              }}
            >
              500 · Root layout failure
            </p>
            <h1 style={{ fontSize: "2.4rem", margin: "0 0 16px", fontWeight: 700 }}>
              System boundary error
            </h1>
            <p style={{ color: "#9ca3af", marginBottom: "32px", lineHeight: 1.5, fontSize: "1rem" }}>
              An unexpected failure prevented the {BRAND_NAME} application shell from rendering.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => reset()}
                style={{
                  backgroundColor: "#f2b544",
                  color: "#0b0c10",
                  border: "none",
                  padding: "12px 24px",
                  borderRadius: "6px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "0.95rem",
                }}
              >
                Try again
              </button>
              <a
                href="/"
                style={{
                  color: "#f3f4f6",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  padding: "12px 24px",
                  borderRadius: "6px",
                  textDecoration: "none",
                  fontWeight: 500,
                  fontSize: "0.95rem",
                }}
              >
                Return home
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
