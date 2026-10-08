import {
  BRAND_EMAIL,
  BRAND_MAIL,
  BRAND_NAME,
  BRAND_PARENT,
  BRAND_SUFFIX,
  BRAND_TAGLINE,
  BRAND_WORD,
  SHOW_CODE_RAIN,
  SITE_URL,
  TRUE_BADGES,
} from "../../../lib/brand";
import { json, PUBLIC_CACHE } from "../../../lib/http";
import { THEME_META, THEME_NAMES } from "../../../lib/theme";

/** Brand identity, trust badges, and public configuration metadata as JSON. */
export function GET() {
  return json(
    {
      name: BRAND_NAME,
      word: BRAND_WORD,
      suffix: BRAND_SUFFIX,
      parent: BRAND_PARENT,
      email: BRAND_EMAIL,
      mailSubject: `${BRAND_MAIL}%20inquiry`,
      tagline: BRAND_TAGLINE,
      siteUrl: SITE_URL,
      showCodeRain: SHOW_CODE_RAIN,
      badges: TRUE_BADGES,
      theme: {
        default: "dark",
        names: THEME_NAMES,
        meta: THEME_META,
      },
    },
    { cacheControl: PUBLIC_CACHE }
  );
}
