import { TRUE_BADGES } from "../lib/brand";

/**
 * Trust badges. Only literally true statements about how the service works (see TRUE_BADGES in
 * lib/brand.ts). These are not certifications and must never be styled or worded as one.
 */
export function TrustBadges({
  compact = false,
  className = "",
  keys,
}: {
  compact?: boolean;
  className?: string;
  keys?: string[];
} = {}) {
  const badgeList =
    keys && keys.length > 0
      ? TRUE_BADGES.filter((b) => keys.map((k) => k.toLowerCase()).includes(b.key.toLowerCase()))
      : TRUE_BADGES;
  const baseClass = compact ? "badges badges-compact" : "badges";
  const cls = className ? `${baseClass} ${className}` : baseClass;
  return (
    <ul className={cls} aria-label="How we work">
      {badgeList.map((b) => (
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
