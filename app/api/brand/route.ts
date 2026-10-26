import {
  badgeByKey,
  BRAND_EMAIL,
  BRAND_MAIL,
  BRAND_NAME,
  BRAND_PARENT,
  BRAND_SUFFIX,
  BRAND_TAGLINE,
  BRAND_WORD,
  resolveSiteUrl,
  SHOW_CODE_RAIN,
  TRUE_BADGES,
} from "../../../lib/brand";
import { json, parseSearchQuery, PUBLIC_CACHE } from "../../../lib/http";
import { DEFAULT_THEME, THEME_META, THEME_NAMES } from "../../../lib/theme";

/** Brand identity, trust badges, and public configuration metadata as JSON. Supports optional ?badge= or ?key= filter. */
export function GET(): Response;
export function GET(req: Request): Response;
export function GET(req?: Request): Response {
  let badgeMatch: unknown = undefined;
  if (req?.url) {
    try {
      const url = new URL(req.url, "http://localhost");
      const badgeKey =
        parseSearchQuery(url.searchParams, "badge") ||
        parseSearchQuery(url.searchParams, "badge_key") ||
        parseSearchQuery(url.searchParams, "badgeKey") ||
        parseSearchQuery(url.searchParams, "key") ||
        parseSearchQuery(url.searchParams, "id") ||
        parseSearchQuery(url.searchParams, "slug") ||
        parseSearchQuery(url.searchParams, "name") ||
        parseSearchQuery(url.searchParams, "n");
      if (badgeKey) {
        badgeMatch = badgeByKey(badgeKey) ?? null;
      }
    } catch {
      // Ignore malformed URL
    }
  }

  const payload: Record<string, unknown> = {
    name: BRAND_NAME,
    word: BRAND_WORD,
    suffix: BRAND_SUFFIX,
    parent: BRAND_PARENT,
    email: BRAND_EMAIL,
    mailSubject: `${BRAND_MAIL}%20inquiry`,
    tagline: BRAND_TAGLINE,
    siteUrl: resolveSiteUrl(),
    showCodeRain: SHOW_CODE_RAIN,
    badges: TRUE_BADGES,
    theme: {
      default: DEFAULT_THEME,
      names: THEME_NAMES,
      meta: THEME_META,
    },
  };

  if (badgeMatch !== undefined) {
    payload.badge = badgeMatch;
  }

  return json(payload, { cacheControl: PUBLIC_CACHE });
}
