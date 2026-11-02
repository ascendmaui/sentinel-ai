import { getFirstParam, json, parseLimit, parseOffset, parseSearchQuery, parseSortOrder, PUBLIC_CACHE } from "../../../lib/http";
import { tiers, tierById, tierHref, matrix, helper, ENGAGEMENT_TERMS } from "../../../lib/tiers";

/** Service tiers index as JSON: all four engagement tiers and comparison matrix. Supports ?id=, ?tier=, ?name=, ?cadence=, ?positioning=, ?rank=, ?feature=, ?included=, ?deliverable=, ?q=, ?order=, ?sort=, ?offset=, ?limit=, ?take=, and ?page=. */
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
      const feature =
        parseSearchQuery(url.searchParams, "feature") ||
        parseSearchQuery(url.searchParams, "included") ||
        parseSearchQuery(url.searchParams, "deliverable") ||
        parseSearchQuery(url.searchParams, "service");
      const rankParam = getFirstParam(
        url.searchParams,
        "rank",
        "rank_id",
        "rankId",
        "r",
        "r_id",
        "rId",
        "rank_num",
        "rankNum",
        "tier_rank",
        "tierRank",
        "order_rank"
      );
      let cleanRank = rankParam;
      if (cleanRank) {
        cleanRank = cleanRank.replace(/^[#+]+/, "").replace(/[#+]+$/, "");
        if (cleanRank.startsWith("rank-") || cleanRank.startsWith("rank_")) cleanRank = cleanRank.slice(5);
        else if (cleanRank.startsWith("rank") && /^\d+$/.test(cleanRank.slice(4))) cleanRank = cleanRank.slice(4);
        else if (cleanRank.startsWith("r-") || cleanRank.startsWith("r_")) cleanRank = cleanRank.slice(2);
        else if (cleanRank.startsWith("r") && /^\d+$/.test(cleanRank.slice(1))) cleanRank = cleanRank.slice(1);
        else if (cleanRank.startsWith("tier-") || cleanRank.startsWith("tier_")) cleanRank = cleanRank.slice(5);
        else if (cleanRank.startsWith("tier") && /^\d+$/.test(cleanRank.slice(4))) cleanRank = cleanRank.slice(4);
        else if (cleanRank.startsWith("t-") || cleanRank.startsWith("t_")) cleanRank = cleanRank.slice(2);
        else if (cleanRank.startsWith("t") && /^\d+$/.test(cleanRank.slice(1))) cleanRank = cleanRank.slice(1);
        cleanRank = cleanRank.replace(/^[#+]+/, "").replace(/[#+]+$/, "");
        cleanRank = cleanRank.replace(/^0+/, "");
      }
      const rankFromTier = cleanRank ? tierById(cleanRank)?.rank : undefined;
      const rank = cleanRank && /^\d+$/.test(cleanRank) ? Number(cleanRank) : rankFromTier;
      const limit = parseLimit(url.searchParams);
      const offset = parseOffset(url.searchParams, 10000, limit);
      const order = parseSortOrder(url.searchParams);

      if (id) {
        const matched = tierById(id);
        let cleanId = id.replace(/^\/+|\/+$/g, "").replace(/\.(html|json)$/, "");
        cleanId = cleanId.replace(/^[#+]+/, "").replace(/[#+]+$/, "");
        if (cleanId.startsWith("tier-") || cleanId.startsWith("tier_")) cleanId = cleanId.slice(5);
        else if (cleanId.startsWith("tier") && /^\d+$/.test(cleanId.slice(4))) cleanId = cleanId.slice(4);
        else if (cleanId.startsWith("tier")) cleanId = cleanId.slice(4);
        else if (cleanId.startsWith("rank-") || cleanId.startsWith("rank_")) cleanId = cleanId.slice(5);
        else if (cleanId.startsWith("rank") && /^\d+$/.test(cleanId.slice(4))) cleanId = cleanId.slice(4);
        else if (cleanId.startsWith("r-") || cleanId.startsWith("r_")) cleanId = cleanId.slice(2);
        else if (cleanId.startsWith("r") && /^\d+$/.test(cleanId.slice(1))) cleanId = cleanId.slice(1);
        else if (cleanId.startsWith("t-") || cleanId.startsWith("t_")) cleanId = cleanId.slice(2);
        else if (cleanId.startsWith("t") && /^\d+$/.test(cleanId.slice(1))) cleanId = cleanId.slice(1);
        cleanId = cleanId.replace(/^[#+]+/, "").replace(/[#+]+$/, "");
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

      if (feature) {
        list = list.filter(
          (t) =>
            t.included.some((item) => item.toLowerCase().includes(feature)) ||
            t.summary.toLowerCase().includes(feature) ||
            matrix.some((m) => m.row.toLowerCase().includes(feature) && m.values[t.id] !== false)
        );
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
