/**
 * Single source of truth for the brand. Change BRAND_NAME here and every page, the metadata,
 * the nav, the footer and the wordmark follow. (The logo SVG in components/Logo.tsx and
 * app/icon.svg contain no text, so they never need editing for a rename.)
 *
 * Working name locked by the caller on 2026-09-29. Not yet cleared for trademark or domains.
 */
export const BRAND_NAME = "Seraphim AI";

/** Split form for the two-tone wordmark: "Seraphim" + "AI". Derived, do not edit separately. */
export const BRAND_WORD = BRAND_NAME.replace(/\s+AI$/i, "");
export const BRAND_SUFFIX = /\sAI$/i.test(BRAND_NAME) ? "AI" : "";

export const BRAND_PARENT = "Ascend Maui";
export const BRAND_EMAIL = "ascendmaui@gmail.com";
export const BRAND_TAGLINE = "Scoped security assessments for the age of AI agents";

/** URL-encoded name for mailto subjects. */
export const BRAND_MAIL = encodeURIComponent(BRAND_NAME);

/** Resolves current site origin from environment variables with localhost fallback. */
export function resolveSiteUrl(env: Record<string, string | undefined> = process.env): string {
  if (env.VERCEL_ENV === "production" && env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (env.VERCEL_URL) {
    return `https://${env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

/** Preview and production builds resolve their own origin; localhost otherwise. */
export const SITE_URL = resolveSiteUrl();

/**
 * FLAG: faint falling-code background layer (components/CodeRain.tsx).
 * Set to false to remove it everywhere; nothing else depends on it.
 * It is intentionally low opacity, uses gold and violet-grey glyphs (never green), and is
 * skipped entirely for visitors who prefer reduced motion.
 */
export const SHOW_CODE_RAIN = true;

/** Trust badges. Every entry must be literally true of the service. Do not add certifications. */
export const TRUE_BADGES = [
  { key: "passive", label: "Passive recon only", note: "Public information, no probing" },
  { key: "auth", label: "Written client authorization required", note: "Nothing starts without it" },
  { key: "scoped", label: "Scoped Assessment", note: "Inside an agreed scope" },
  { key: "retest", label: "Remediation and retest", note: "Fixes verified, not assumed" },
  { key: "local", label: "Private local models", note: "Scenario design stays on our hardware" },
] as const;

export type TrustBadge = (typeof TRUE_BADGES)[number];

export function badgeByKey(key: string): TrustBadge | undefined {
  if (!key || typeof key !== "string") return undefined;
  const target = key.toLowerCase();
  return TRUE_BADGES.find((b) => b.key.toLowerCase() === target);
}


