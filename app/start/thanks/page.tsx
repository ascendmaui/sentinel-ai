"use client";

import Link from "next/link";
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { SCAN_DAYS } from "../../../lib/lead";

function Thanks() {
  const sp = useSearchParams();
  const path = sp.get("path");
  const sid = sp.get("session_id");
  useEffect(() => {
    if (path === "basic" && sid) fetch("/api/lead", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ session_id: sid }) }).catch(() => {});
  }, [path, sid]);
  const steps =
    path === "call"
      ? ["We read your notes and reply by email within one business day to confirm a time.", "On the call we walk through your stack and suggest a tier.", "If it is a fit, you get a written scope and quote. Nothing starts without written authorization."]
      : path === "basic"
        ? ["Thank you for your order. Stripe confirms the payment to us directly.", `Automated passive checks run on the domain you authorized, each finding is re-verified, and the PDF report is emailed to you, usually within minutes and always within ${SCAN_DAYS} business days.`, "Reply to that email any time with questions. No active testing is done."]
        : ["Your request is queued for review. Nothing has been scanned yet.", `A person runs a passive check using public information only and emails you the results within ${SCAN_DAYS} business days.`, "If you want more, we suggest a tier and a written scope."];
  return (
    <main className="home cs">
      <header className="cs-head">
        <p className="eyebrow">Confirmation</p>
        <h1>Got it. <span className="gold-text">Here is what happens next.</span></h1>
        <ol className="lead-next">{steps.map((s) => (<li key={s}>{s}</li>))}</ol>
        <div className="row"><Link className="btn btn-glass" href="/pricing">See tiers and pricing</Link><Link className="btn btn-glass" href="/">Back to home</Link></div>
      </header>
    </main>
  );
}

export default function ThanksPage() {
  return (<Suspense fallback={null}><Thanks /></Suspense>);
}
