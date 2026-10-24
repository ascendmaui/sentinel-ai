import { json, parseLimit, parseOffset, parseSearchQuery, PUBLIC_CACHE } from "../../../lib/http";
import { tiers, tierHref, matrix, helper, ENGAGEMENT_TERMS } from "../../../lib/tiers";

/** Service tiers index as JSON: all four engagement tiers and comparison matrix. Supports ?cadence=, ?positioning=, ?rank=, ?q=, ?offset=, and ?limit=. */
export function GET(): Response;
export function GET(req: Request): Response;
export function GET(req?: Request): Response {
  let list = tiers;

  if (req?.url) {
    try {
      const url = new URL(req.url, "http://localhost");
      const q = parseSearchQuery(url.searchParams);
      const cadence = parseSearchQuery(url.searchParams, "cadence");
      const positioning = parseSearchQuery(url.searchParams, "positioning");
      const rankParam = url.searchParams.get("rank")?.trim();
      const rank = rankParam && /^\d+$/.test(rankParam) ? Number(rankParam) : undefined;
      const offset = parseOffset(url.searchParams);
      const limit = parseLimit(url.searchParams);

      if (cadence) {
        list = list.filter((t) => t.cadence.toLowerCase().includes(cadence));
      }

      if (positioning) {
        list = list.filter((t) => t.positioning.toLowerCase().includes(positioning));
      }

      if (rank !== undefined) {
        list = list.filter((t) => t.rank === rank);
      }

      if (q) {
        list = list.filter(
          (t) =>
            t.id.toLowerCase().includes(q) ||
            t.name.toLowerCase().includes(q) ||
            t.tagline.toLowerCase().includes(q) ||
            t.positioning.toLowerCase().includes(q) ||
            t.cadence.toLowerCase().includes(q) ||
            t.summary.toLowerCase().includes(q) ||
            t.forWho.toLowerCase().includes(q) ||
            t.fitWhen.toLowerCase().includes(q) ||
            t.included.some((item) => item.toLowerCase().includes(q)) ||
            t.notIncluded.some((item) => item.toLowerCase().includes(q))
        );
      }

      if (offset && offset > 0) {
        list = list.slice(offset);
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
        url: tierHref(t.id),
      })),
      matrix,
      helper,
      terms: ENGAGEMENT_TERMS,
    },
    { cacheControl: PUBLIC_CACHE }
  );
}
