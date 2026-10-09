import { json, PUBLIC_CACHE } from "../../../lib/http";
import { tiers, matrix, helper, ENGAGEMENT_TERMS } from "../../../lib/tiers";

/** Service tiers index as JSON: all four engagement tiers and comparison matrix. Supports ?q=. */
export function GET(): Response;
export function GET(req: Request): Response;
export function GET(req?: Request): Response {
  let list = tiers;

  if (req?.url) {
    try {
      const url = new URL(req.url);
      const q = url.searchParams.get("q");

      if (q) {
        const targetQ = q.trim().toLowerCase();
        list = list.filter(
          (t) =>
            t.id.toLowerCase().includes(targetQ) ||
            t.name.toLowerCase().includes(targetQ) ||
            t.tagline.toLowerCase().includes(targetQ) ||
            t.positioning.toLowerCase().includes(targetQ) ||
            t.summary.toLowerCase().includes(targetQ)
        );
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
