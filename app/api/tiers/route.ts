import { json, parseLimit, parseOffset, parseSearchQuery, parseSortOrder, PUBLIC_CACHE } from "../../../lib/http";
import { tiers, tierHref, matrix, helper, ENGAGEMENT_TERMS } from "../../../lib/tiers";

/** Service tiers index as JSON: all four engagement tiers and comparison matrix. Supports ?id=, ?tier=, ?name=, ?cadence=, ?positioning=, ?rank=, ?q=, ?order=, ?offset=, ?limit=, and ?page=. */
export function GET(): Response;
export function GET(req: Request): Response;
export function GET(req?: Request): Response {
  let list = tiers;

  if (req?.url) {
    try {
      const url = new URL(req.url, "http://localhost");
      const q = parseSearchQuery(url.searchParams);
      const id = parseSearchQuery(url.searchParams, "id") || parseSearchQuery(url.searchParams, "tier");
      const name = parseSearchQuery(url.searchParams, "name");
      const cadence = parseSearchQuery(url.searchParams, "cadence");
      const positioning = parseSearchQuery(url.searchParams, "positioning");
      const rankParam = (url.searchParams.get("rank") ?? url.searchParams.get("tier_rank"))?.trim();
      const rank = rankParam && /^\+?\d+$/.test(rankParam) ? Number(rankParam) : undefined;
      const limit = parseLimit(url.searchParams);
      const offset = parseOffset(url.searchParams, 10000, limit);
      const order = parseSortOrder(url.searchParams);

      if (id) {
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
            (numClean && String(t.rank) === numClean)
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
