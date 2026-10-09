import { json, parseLimit, parseSearchQuery, PUBLIC_CACHE } from "../../../lib/http";
import { tiers, matrix, helper, ENGAGEMENT_TERMS } from "../../../lib/tiers";

/** Service tiers index as JSON: all four engagement tiers and comparison matrix. Supports ?q=. */
export function GET(): Response;
export function GET(req: Request): Response;
export function GET(req?: Request): Response {
  let list = tiers;

  if (req?.url) {
    try {
      const url = new URL(req.url);
      const q = parseSearchQuery(url.searchParams);
      const limit = parseLimit(url.searchParams);

      if (q) {
        list = list.filter(
          (t) =>
            t.id.toLowerCase().includes(q) ||
            t.name.toLowerCase().includes(q) ||
            t.tagline.toLowerCase().includes(q) ||
            t.positioning.toLowerCase().includes(q) ||
            t.summary.toLowerCase().includes(q)
        );
      }

      if (limit) {
        list = list.slice(0, limit);
      }
    } catch {
      // Ignore malformed URL
    }
  }

  return json(
    {
      count: list.length,
      totalCount: tiers.length,
      tiers: list.map((t) => ({
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
