import { json, parseLimit, parseOffset, parseSearchQuery, parseSortOrder, PUBLIC_CACHE } from "../../../lib/http";
import { tiers, tierById, tierHref, matrix, helper, ENGAGEMENT_TERMS } from "../../../lib/tiers";

/** Service tiers index as JSON: all four engagement tiers and comparison matrix. Supports ?id=, ?tier=, ?name=, ?cadence=, ?positioning=, ?rank=, ?q=, ?order=, ?sort=, ?offset=, ?limit=, ?take=, and ?page=. */
export function GET(): Response;
export function GET(req: Request): Response;
export function GET(req?: Request): Response {
  let list = tiers;

  if (req?.url) {
    try {
      const url = new URL(req.url, "http://localhost");
      const q = parseSearchQuery(url.searchParams);
      const id =
        parseSearchQuery(url.searchParams, "id") ||
        parseSearchQuery(url.searchParams, "tier") ||
        parseSearchQuery(url.searchParams, "tier_id") ||
        parseSearchQuery(url.searchParams, "tierId") ||
        parseSearchQuery(url.searchParams, "tier_slug") ||
        parseSearchQuery(url.searchParams, "tierSlug") ||
        parseSearchQuery(url.searchParams, "t") ||
        parseSearchQuery(url.searchParams, "t_id") ||
        parseSearchQuery(url.searchParams, "tId") ||
        parseSearchQuery(url.searchParams, "slug") ||
        parseSearchQuery(url.searchParams, "n") ||
        parseSearchQuery(url.searchParams, "num") ||
        parseSearchQuery(url.searchParams, "number");
      const name =
        parseSearchQuery(url.searchParams, "name") ||
        parseSearchQuery(url.searchParams, "tier_name") ||
        parseSearchQuery(url.searchParams, "tierName") ||
        parseSearchQuery(url.searchParams, "title");
      const cadence =
        parseSearchQuery(url.searchParams, "cadence") ||
        parseSearchQuery(url.searchParams, "frequency") ||
        parseSearchQuery(url.searchParams, "schedule");
      const positioning =
        parseSearchQuery(url.searchParams, "positioning") ||
        parseSearchQuery(url.searchParams, "price") ||
        parseSearchQuery(url.searchParams, "pricing") ||
        parseSearchQuery(url.searchParams, "level");
      const rankParam = (
        url.searchParams.get("rank") ??
        url.searchParams.get("tier_rank") ??
        url.searchParams.get("tierRank") ??
        url.searchParams.get("order_rank")
      )?.trim();
      const rank = rankParam && /^\+?\d+$/.test(rankParam) ? Number(rankParam) : undefined;
      const limit = parseLimit(url.searchParams);
      const offset = parseOffset(url.searchParams, 10000, limit);
      const order = parseSortOrder(url.searchParams);

      if (id) {
        const matched = tierById(id);
        let cleanId = id.replace(/^\/+|\/+$/g, "").replace(/\.(html|json)$/, "");
        if (cleanId.startsWith("tier-") || cleanId.startsWith("tier_")) cleanId = cleanId.slice(5);
        else if (cleanId.startsWith("tier")) cleanId = cleanId.slice(4);
        else if (cleanId.startsWith("t-") || cleanId.startsWith("t_")) cleanId = cleanId.slice(2);
        else if (cleanId.startsWith("t") && /^\d+$/.test(cleanId.slice(1))) cleanId = cleanId.slice(1);
        if (cleanId.startsWith("+")) cleanId = cleanId.slice(1);
        const numClean = cleanId.replace(/^0+/, "");
        list = list.filter(
          (t) =>
            t.id.toLowerCase() === id ||
            t.id.toLowerCase() === cleanId ||
            String(t.rank) === cleanId ||
            (numClean && String(t.rank) === numClean) ||
            (matched && t.id.toLowerCase() === matched.id.toLowerCase())
        );
      }

      if (name) {
        list = list.filter((t) => t.name.toLowerCase().includes(name));
      }

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

      if (order === "desc") {
        list = [...list].reverse();
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
