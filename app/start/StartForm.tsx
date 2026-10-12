"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { tiers } from "../../lib/tiers";
import { BASIC, SCAN_DAYS } from "../../lib/lead";

type Path = "scan" | "call" | "basic";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const PATHS: { id: Path; title: string; price: string; body: string }[] = [
  { id: "scan", title: "Free preliminary scan", price: "Free", body: `A passive check of your public footprint, reviewed by a person and delivered within ${SCAN_DAYS} business days.` },
  { id: "basic", title: "Buy the $100 Basic Scan now", price: BASIC.price, body: `A written passive overview of your external footprint with top fixes. Delivered within ${SCAN_DAYS} business days.` },
  { id: "call", title: "Book a call", price: "30 min", body: "Talk through your stack and pick the right tier. We confirm a time by email." },
];

export function StartForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const initPath = (["scan", "call", "basic"].includes(sp.get("path") ?? "") ? sp.get("path") : null) as Path | null;
  const [path, setPath] = useState<Path | null>(initPath);
  const [step, setStep] = useState(initPath ? 2 : 1);
  const [tier, setTier] = useState(sp.get("tier") ?? "unsure");
  const [f, setF] = useState({ name: "", email: "", company: "", role: "", website: "", notes: "", times: "", company_url: "" });
  const [days, setDays] = useState<string[]>([]);
  const [authorized, setAuthorized] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const tz = useMemo(() => (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : ""), []);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const err = (k: string) => (errors[k] ? <span className="lead-err">{errors[k]}</span> : null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const r = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...f, path, tier, days, authorized, timezone: tz, startedAt }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        setErrors(j.errors ?? { form: j.error ?? "Something went wrong. Please try again." });
        return;
      }
      if (j.checkoutUrl) window.location.href = j.checkoutUrl;
      else router.push(`/start/thanks?path=${path}`);
    } catch {
      setErrors({ form: "Network error. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lead-flow">
      <ol className="lead-steps" aria-label="Progress">
        <li className={step === 1 ? "on" : ""}>1. Choose a path</li>
        <li className={step === 2 ? "on" : ""}>2. Your details</li>
        <li>3. Confirmation</li>
      </ol>

      {step === 1 && (
        <>
          <div className="lead-paths">
            {PATHS.map((p) => (
              <button key={p.id} type="button" className={`card lead-path${path === p.id ? " on" : ""}${p.id === "basic" ? " lead-path-basic" : ""}`}
                onClick={() => { setPath(p.id); setStep(2); }}>
                <span className="tier-pos">{p.price}</span>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </button>
            ))}
          </div>
          <div className="panel lead-tiers">
            <p className="eyebrow">Tiers and starting prices</p>
            <div className="lead-tier-row">
              {tiers.map((t) => (
                <a key={t.id} href={`/pricing#${t.id}`} className={t.id === "seraphim" ? "lead-tier flagship" : "lead-tier"}>
                  <strong>{t.name}</strong> <span>from {t.price}</span>
                </a>
              ))}
            </div>
          </div>
        </>
      )}

      {step === 2 && path && (
        <form className="panel lead-form" onSubmit={submit} noValidate>
          <button type="button" className="btn btn-glass btn-sm" onClick={() => setStep(1)}>← Change path</button>
          <h2>{PATHS.find((p) => p.id === path)!.title}</h2>
          <p className="fine">{PATHS.find((p) => p.id === path)!.body}</p>

          <div className="lead-grid">
            {path !== "basic" && (<label>Name<input value={f.name} onChange={set("name")} autoComplete="name" required />{err("name")}</label>)}
            <label>Work email<input type="email" value={f.email} onChange={set("email")} autoComplete="email" required />{err("email")}</label>
            {path !== "basic" && (<label>Company<input value={f.company} onChange={set("company")} autoComplete="organization" required />{err("company")}</label>)}
            {path !== "basic" && (<label>Role<input value={f.role} onChange={set("role")} autoComplete="organization-title" /></label>)}
            <label>{path === "call" ? "Website" : "Domain to check"}<input value={f.website} onChange={set("website")} placeholder="example.com" required />{err("website")}</label>
            {path !== "basic" && (
              <label>Tier you are interested in
                <select value={tier} onChange={(e) => setTier(e.target.value)}>
                  <option value="unsure">Not sure yet</option>
                  {tiers.map((t) => (<option key={t.id} value={t.id}>{t.name} (from {t.price})</option>))}
                </select>
              </label>
            )}
          </div>

          {path === "call" && (
            <fieldset className="lead-days">
              <legend>Preferred days</legend>
              {DAYS.map((d) => (
                <label key={d} className="chip"><input type="checkbox" checked={days.includes(d)} onChange={(e) => setDays(e.target.checked ? [...days, d] : days.filter((x) => x !== d))} /> {d}</label>
              ))}
              {err("days")}
              <label>Preferred times<input value={f.times} onChange={set("times")} placeholder="e.g. 10am to 1pm" />{err("times")}</label>
              <p className="fine">Your timezone: {tz || "unknown"}. We reply by email to confirm a slot.</p>
            </fieldset>
          )}

          <label>Notes<textarea rows={4} value={f.notes} onChange={set("notes")} placeholder="What do you run, and what worries you?" /></label>

          {(path === "scan" || path === "basic") && (
            <label className="lead-auth">
              <input type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} required />
              I own or am authorized to request an assessment of this domain.
              {err("authorized")}
            </label>
          )}

          <input className="lead-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.company_url} onChange={set("company_url")} name="company_url" />

          {(path === "scan" || path === "basic") && (
            <p className="fine">
              Passive check only, delivered within {SCAN_DAYS} business days. We look at public information (DNS and mail
              authentication, TLS, security headers, certificate transparency). No active testing, no exploitation, no
              compliance certification. Nothing runs automatically: a person reviews every request first.
            </p>
          )}
          {path === "basic" && BASIC.stripeMode === "test" && <p className="fine lead-test">Checkout is in Stripe test mode while we finish setup. No real charge is made.</p>}
          {errors.form && <p className="lead-err">{errors.form}</p>}
          <button className="btn btn-gold" type="submit" disabled={busy}>
            {busy ? "Sending…" : path === "basic" ? `Continue to secure checkout (${BASIC.price})` : path === "scan" ? "Request my free preliminary scan" : "Request a call"}
          </button>
        </form>
      )}
    </div>
  );
}
