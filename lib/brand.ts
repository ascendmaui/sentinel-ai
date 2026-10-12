/**
 * Single source of truth for the brand. Change BRAND_NAME here and every page, the metadata,
 * the nav, the footer and the wordmark follow. (The logo SVG in components/Logo.tsx and
 * app/icon.svg contain no text, so they never need editing for a rename.)
 *
 * Working name locked by the caller on 2026-09-29. Not yet cleared for trademark or domains.
 */
export const BRAND_NAME = "Seraphim Scan";

/** Split form for the two-tone wordmark: "Seraphim" + "Scan". Derived, do not edit separately. */
export const BRAND_WORD = BRAND_NAME.replace(/\s+(AI|Scan)$/i, "");
export const BRAND_SUFFIX = (BRAND_NAME.match(/\s(AI|Scan)$/i)?.[1] ?? "");

export const BRAND_PARENT = "Ascend Maui";
export const BRAND_EMAIL = "ascendmaui@gmail.com";
/** Secondary slogan: closing CTA band, footer, meta description. */
export const BRAND_SLOGAN = "In the age of AI, fight rogue agents with Seraphim Scan.";
export const BRAND_TAGLINE = "Scoped security assessments for the age of AI agents";

/** URL-encoded name for mailto subjects. */
export const BRAND_MAIL = encodeURIComponent(BRAND_NAME);

/** Preview and production builds resolve their own origin; localhost otherwise. */
export const SITE_URL = process.env.SITE_URL
  ? process.env.SITE_URL.replace(/\/$/, "")
  : process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

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
