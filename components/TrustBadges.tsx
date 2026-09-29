import { TRUE_BADGES } from "../lib/brand";

/**
 * Trust badges. Only literally true statements about how the service works (see TRUE_BADGES in
 * lib/brand.ts). These are not certifications and must never be styled or worded as one.
 */
export function TrustBadges({ compact = false }: { compact?: boolean }) {
  return (
    <ul className={compact ? "badges badges-compact" : "badges"} aria-label="How we work">
      {TRUE_BADGES.map((b) => (
        <li key={b.key} className="badge">
          <span className="badge-dot" aria-hidden="true" />
          <span className="badge-text">
            <strong>{b.label}</strong>
            {compact ? null : <span>{b.note}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
