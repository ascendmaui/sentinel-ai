/**
 * Single source of truth for the brand. Change BRAND_NAME here and every page, the metadata,
 * the nav, the footer and the wordmark follow. (The logo SVG in components/Logo.tsx and
 * app/icon.svg contain no text, so they never need editing for a rename.)
 *
 * Display name set 2026-10-01: Seraphim Scan AI. The previous public name was Seraphim AI.
 * The GitHub repo and the Vercel project are still named sentinel-ai.
 * seraphimscanai.com is the intended domain; DNS status is unknown until it is checked.
 * Not cleared for trademark.
 */
export const BRAND_NAME = "Seraphim Scan AI";

/** Earlier marketing name, kept so docs and history stay accurate. */
export const BRAND_FORMER_NAME = "Seraphim AI";

/** GitHub repository and Vercel project slug. Not the customer-facing name. */
export const BRAND_REPO = "sentinel-ai";

/** Intended apex domain. Do not treat this as live until DNS is confirmed. */
export const BRAND_INTENDED_DOMAIN = "seraphimscanai.com";

/** Split form for the two-tone wordmark. A trailing "AI" is the gold suffix. Derived, do not edit separately. */
export const BRAND_WORD = BRAND_NAME.replace(/\s+AI$/i, "");
export const BRAND_SUFFIX = /\sAI$/i.test(BRAND_NAME) ? "AI" : "";

export const BRAND_PARENT = "Ascend Maui";
export const BRAND_EMAIL = "ascendmaui@gmail.com";
export const BRAND_TAGLINE = "Passive scans and reports for rogue-AI exposure";

/** URL-encoded name for mailto subjects. */
export const BRAND_MAIL = encodeURIComponent(BRAND_NAME);

/** Preview and production builds resolve their own origin; localhost otherwise. */
export const SITE_URL = process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL
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
  { key: "passive", label: "Automated scans stay passive", note: "Public DNS, TLS, headers, and pages" },
  { key: "auth", label: "Authorization required", note: "You confirm you may scan the target" },
  { key: "honest", label: "No invented results", note: "Checks we cannot run stay pending" },
  { key: "human", label: "Human Scoped Assessment", note: "Deeper work is a written engagement" },
  { key: "local", label: "Private local models", note: "Scenario design for human work stays on our hardware" },
] as const;
