import type { Metadata } from "next";
import { Suspense } from "react";
import { StartForm } from "./StartForm";
import { BRAND_NAME } from "../../lib/brand";

export const metadata: Metadata = {
  title: "Get started",
  description: `Start with ${BRAND_NAME}: a free passive preliminary check, a call, or the $99 Basic Scan.`,
  alternates: { canonical: "/start" },
};

export default function StartPage() {
  return (
    <main className="home cs">
      <header className="cs-head">
        <p className="eyebrow">Get started</p>
        <h1>
          See what an attacker&apos;s AI agent sees. <span className="gold-text">Then close it.</span>
        </h1>
        <p className="lead">
          Three ways to start. Nothing is scanned automatically when you submit: every check is passive, uses public
          information only, and is reviewed by a person first.
        </p>
      </header>
      <section className="section">
        <Suspense fallback={null}>
          <StartForm />
        </Suspense>
      </section>
    </main>
  );
}
