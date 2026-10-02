"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { AUTHORIZATION_STATEMENT, isScanTierId, scanTiers, type ScanTierId } from "../lib/scanTiers";
import { TierEmblem } from "./TierEmblem";

export function ScanForm() {
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("tier");
  const [tier, setTier] = useState<ScanTierId>(requested && isScanTierId(requested) ? requested : "standard");
  const [targetUrl, setTargetUrl] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authorized || pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          targetUrl,
          companyName,
          tier,
          authorization: true,
        }),
      });
      const payload = (await response.json()) as { error?: string; report?: { id: string } };
      if (!response.ok || !payload.report?.id) {
        setError(payload.error || "The scan could not be started.");
        setPending(false);
        return;
      }
      sessionStorage.setItem(`seraphim-scan-report:${payload.report.id}`, JSON.stringify(payload.report));
      router.push(`/report/${payload.report.id}`);
    } catch {
      setError("The scan request did not complete. Check the URL and try again.");
      setPending(false);
    }
  }

  return (
    <form className="scan-form" onSubmit={onSubmit}>
      <div className="scan-fields">
        <label>
          Website URL
          <input
            name="targetUrl"
            type="url"
            inputMode="url"
            autoComplete="url"
            required
            placeholder="https://example.com"
            value={targetUrl}
            onChange={(event) => setTargetUrl(event.target.value)}
          />
        </label>
        <label>
          Company or product name <span className="optional">(optional)</span>
          <input
            name="companyName"
            type="text"
            maxLength={120}
            placeholder="Northwind"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
          />
        </label>
      </div>

      <fieldset className="tier-pick">
        <legend>Scan tier</legend>
        <div className="tier-pick-grid">
          {scanTiers.map((item) => (
            <label key={item.id} className={item.id === tier ? "tier-option is-selected" : "tier-option"}>
              <input
                type="radio"
                name="tier"
                value={item.id}
                checked={tier === item.id}
                onChange={() => setTier(item.id)}
              />
              <span className="tier-emblem-wrap">
                <TierEmblem id={item.emblem} size={28} />
              </span>
              <span className="tier-option-copy">
                <strong>
                  {item.label} · {item.className}
                </strong>
                <span>{item.tagline}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="check-line">
        <input type="checkbox" checked={authorized} onChange={(event) => setAuthorized(event.target.checked)} required />
        <span>{AUTHORIZATION_STATEMENT}</span>
      </label>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="row">
        <button className="btn btn-gold" type="submit" disabled={!authorized || pending}>
          {pending ? "Scanning public surface…" : "Run passive scan"}
        </button>
      </div>
      <p className="fine">
        The scan fetches the public page, DNS, and the certificate on port 443. It does not log in, send prompts, or scan other ports.
        A report usually returns within half a minute. Checks that cannot be completed are marked pending.
      </p>
    </form>
  );
}
