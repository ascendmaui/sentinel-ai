import { getFirstParam, json, parseLimit, parseOffset, parseSearchQuery, parseSortOrder, PUBLIC_CACHE } from "../../../lib/http";
import { tiers, tierById, tierHref, matrix, helper, ENGAGEMENT_TERMS } from "../../../lib/tiers";

/** Service tiers index as JSON: all four engagement tiers and comparison matrix. Supports ?id=, ?tier=, ?name=, ?cadence=, ?positioning=, ?rank=, ?feature=, ?included=, ?deliverable=, ?tagline=, ?forWho=, ?audience=, ?fitWhen=, ?fit=, ?excluded=, ?summary=, ?q=, ?order=, ?sort=, ?offset=, ?limit=, ?take=, and ?page=. */
export function GET(): Response;
export function GET(req: Request): Response;
export function GET(req?: Request): Response {
  let list = tiers;

  if (req?.url) {
    try {
      const url = new URL(req.url, "http://localhost");
      const q = parseSearchQuery(url.searchParams);
      const id = parseSearchQuery(
        url.searchParams,
        "id",
        "tier",
        "tier_id",
        "tierId",
        "tier_slug",
        "tierSlug",
        "t",
        "t_id",
        "tId",
        "slug",
        "n",
        "num",
        "number"
      );
      const name = parseSearchQuery(
        url.searchParams,
        "name",
        "tier_name",
        "tierName",
        "title"
      );
      const cadence = parseSearchQuery(
        url.searchParams,
        "cadence",
        "frequency",
        "schedule"
      );
      const positioning = parseSearchQuery(
        url.searchParams,
        "positioning",
        "price",
        "pricing",
        "level"
      );
      const feature = parseSearchQuery(
        url.searchParams,
        "feature",
        "included",
        "deliverable",
        "service"
      );
      const tagline = parseSearchQuery(
        url.searchParams,
        "tagline",
        "motto",
        "slogan"
      );
      const forWho = parseSearchQuery(
        url.searchParams,
        "forWho",
        "for_who",
        "audience",
        "target",
        "who",
        "for"
      );
      const fitWhen = parseSearchQuery(
        url.searchParams,
        "fitWhen",
        "fit_when",
        "fit",
        "when",
        "scenario"
      );
      const excluded = parseSearchQuery(
        url.searchParams,
        "excluded",
        "notIncluded",
        "not_included",
        "omitted",
        "out_of_scope",
        "outOfScope"
      );
      const summary = parseSearchQuery(
        url.searchParams,
        "summary",
        "overview",
        "desc",
        "description"
      );
      let rank: number | undefined;
      const rankKeys = [
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
        "order_rank",
      ];
      for (const k of rankKeys) {
        const values = typeof url.searchParams.getAll === "function" ? url.searchParams.getAll(k) : [url.searchParams.get(k)];
        for (const raw of values) {
          if (typeof raw !== "string") continue;
          let cleanRank = raw.trim().replace(/^[#+]+/, "").replace(/[#+]+$/, "");
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
          const fromTier = tierById(cleanRank)?.rank;
          if (fromTier !== undefined) {
            rank = fromTier;
            break;
          }
          if (/^\d+$/.test(cleanRank)) {
            const num = Number(cleanRank);
            if (num >= 1 && num <= 4) {
              rank = num;
              break;
            }
          }
        }
        if (rank !== undefined) break;
      }
      const limit = parseLimit(url.searchParams);
      const offset = parseOffset(url.searchParams, 10000, limit);
      const order = parseSortOrder(url.searchParams);

      if (id) {
        const matched = tierById(id);
        let cleanId = id.replace(/^\/+|\/+$/g, "").replace(/\.(html|json)$/, "");
        cleanId = cleanId.replace(/^[#+]+/, "").replace(/[#+]+$/, "");
        cleanId = cleanId.replace(/^(?:(?:api\/)?(?:tiers|tier|pricing|services|service|plans|plan)\/)+/, "");
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

      if (tagline) {
        list = list.filter((t) => t.tagline.toLowerCase().includes(tagline));
      }

      if (forWho) {
        list = list.filter((t) => t.forWho.toLowerCase().includes(forWho));
      }

      if (fitWhen) {
        list = list.filter((t) => t.fitWhen.toLowerCase().includes(fitWhen));
      }

      if (excluded) {
        list = list.filter((t) => t.notIncluded.some((item) => item.toLowerCase().includes(excluded)));
      }

      if (summary) {
        list = list.filter((t) => t.summary.toLowerCase().includes(summary));
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
