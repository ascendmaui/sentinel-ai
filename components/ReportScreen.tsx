"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isReport } from "../lib/scan/report";
import type { Report } from "../lib/scan/types";
import { ReportView } from "./ReportView";

export function ReportScreen({ token, initial }: { token: string; initial: Report | null }) {
  const [report, setReport] = useState<Report | null>(initial);
  const [phase, setPhase] = useState<"ready" | "checking" | "missing">(initial ? "ready" : "checking");

  useEffect(() => {
    if (initial) return;
    let cancelled = false;
    const stored = readStored(token);
    if (stored) {
      setReport(stored);
      setPhase("ready");
      return;
    }
    void (async () => {
      try {
        const response = await fetch(`/api/scan/${encodeURIComponent(token)}`);
        if (!response.ok) {
          if (!cancelled) setPhase("missing");
          return;
        }
        const payload = (await response.json()) as { report?: unknown };
        if (!cancelled && isReport(payload.report) && payload.report.id === token) {
          setReport(payload.report);
          setPhase("ready");
          return;
        }
      } catch {
        /* The memory store is best-effort in v1. */
      }
      if (!cancelled) setPhase("missing");
    })();
    return () => {
      cancelled = true;
    };
  }, [initial, token]);

  if (phase === "checking") {
    return (
      <main className="home cs">
        <p className="eyebrow">Report</p>
        <h1>Looking up this report…</h1>
      </main>
    );
  }
  if (!report || phase === "missing") {
    return (
      <main className="home cs">
        <header className="cs-head">
          <p className="eyebrow">Report</p>
          <h1>
            This report is <span className="gold-text">not on this server.</span>
          </h1>
          <p className="lead">
            v1 keeps reports in memory for a short time and in the browser that ran the scan. There is no database yet, so a link from
            another device or a later visit can expire. Run the scan again to produce a new report.
          </p>
          <Link className="btn btn-gold" href="/scan">
            Start a scan
          </Link>
        </header>
      </main>
    );
  }
  return (
    <main className="home cs">
      <ReportView report={report} />
    </main>
  );
}

function readStored(token: string): Report | null {
  try {
    const raw = sessionStorage.getItem(`seraphim-scan-report:${token}`);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isReport(parsed) || parsed.id !== token) return null;
    return parsed;
  } catch {
    return null;
  }
}
