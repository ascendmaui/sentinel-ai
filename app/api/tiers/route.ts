import { json, PUBLIC_CACHE } from "../../../lib/http";
import { tiers, matrix, helper, ENGAGEMENT_TERMS } from "../../../lib/tiers";

/** Service tiers index as JSON: all four engagement tiers and comparison matrix. */
export function GET() {
  return json(
    {
      count: tiers.length,
      tiers: tiers.map((t) => ({
        id: t.id,
        rank: t.rank,
        name: t.name,
        tagline: t.tagline,
        positioning: t.positioning,
        cadence: t.cadence,
        summary: t.summary,
        includedCount: t.included.length,
        url: `/pricing#${t.id}`,
      })),
      matrix,
      helper,
      terms: ENGAGEMENT_TERMS,
    },
    { cacheControl: PUBLIC_CACHE }
  );
}
