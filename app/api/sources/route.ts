import { json, parseLimit, parseOffset, parseSearchQuery, parseSortOrder, PUBLIC_CACHE } from "../../../lib/http";
import { sources, sourceById } from "../../../lib/sources";

/** Authoritative sources index as JSON. Lists verified research references. Supports ?id=, ?source=, ?source_id=, ?sourceId=, ?src=, ?src_id=, ?ref=, ?reference=, ?slug=, ?n=, ?num=, ?url=, ?link=, ?domain=, ?year=, ?date=, ?label=, ?title=, ?note=, ?type=, ?q=, ?order=, ?sort=, ?offset=, ?limit=, ?take=, and ?page=. */
export function GET(): Response;
export function GET(req: Request): Response;
export function GET(req?: Request): Response {
  let list = sources;

  if (req?.url) {
    try {
      const url = new URL(req.url, "http://localhost");
      const id =
        parseSearchQuery(url.searchParams, "id") ||
        parseSearchQuery(url.searchParams, "source") ||
        parseSearchQuery(url.searchParams, "source_id") ||
        parseSearchQuery(url.searchParams, "sourceId") ||
        parseSearchQuery(url.searchParams, "source_slug") ||
        parseSearchQuery(url.searchParams, "sourceSlug") ||
        parseSearchQuery(url.searchParams, "src") ||
        parseSearchQuery(url.searchParams, "src_id") ||
        parseSearchQuery(url.searchParams, "srcId") ||
        parseSearchQuery(url.searchParams, "ref") ||
        parseSearchQuery(url.searchParams, "reference") ||
        parseSearchQuery(url.searchParams, "s") ||
        parseSearchQuery(url.searchParams, "s_id") ||
        parseSearchQuery(url.searchParams, "sId") ||
        parseSearchQuery(url.searchParams, "slug") ||
        parseSearchQuery(url.searchParams, "n") ||
        parseSearchQuery(url.searchParams, "num") ||
        parseSearchQuery(url.searchParams, "number");
      const q = parseSearchQuery(url.searchParams);
      const year = parseSearchQuery(url.searchParams, "year") || parseSearchQuery(url.searchParams, "date");
      const label =
        parseSearchQuery(url.searchParams, "label") ||
        parseSearchQuery(url.searchParams, "title") ||
        parseSearchQuery(url.searchParams, "name") ||
        parseSearchQuery(url.searchParams, "headline");
      const note =
        parseSearchQuery(url.searchParams, "note") ||
        parseSearchQuery(url.searchParams, "type") ||
        parseSearchQuery(url.searchParams, "credibility") ||
        parseSearchQuery(url.searchParams, "standing") ||
        parseSearchQuery(url.searchParams, "kind");
      const urlFilter =
        parseSearchQuery(url.searchParams, "url") ||
        parseSearchQuery(url.searchParams, "link") ||
        parseSearchQuery(url.searchParams, "domain") ||
        parseSearchQuery(url.searchParams, "href") ||
        parseSearchQuery(url.searchParams, "uri");
      const limit = parseLimit(url.searchParams);
      const offset = parseOffset(url.searchParams, 10000, limit);
      const order = parseSortOrder(url.searchParams);

      if (id) {
        const matched = sourceById(id);
        let cleanId = id.trim().toLowerCase().replace(/\.(html|json)$/, "");
        if (cleanId.startsWith("source-") || cleanId.startsWith("source_")) cleanId = cleanId.slice(7);
        else if (cleanId.startsWith("source") && /^\d+$/.test(cleanId.slice(6))) cleanId = cleanId.slice(6);
        else if (cleanId.startsWith("src-") || cleanId.startsWith("src_")) cleanId = cleanId.slice(4);
        else if (cleanId.startsWith("src") && /^\d+$/.test(cleanId.slice(3))) cleanId = cleanId.slice(3);
        else if (cleanId.startsWith("s-") || cleanId.startsWith("s_")) cleanId = cleanId.slice(2);
        else if (cleanId.startsWith("s") && /^\d+$/.test(cleanId.slice(1))) cleanId = cleanId.slice(1);
        const lowerId = id.trim().toLowerCase();
        list = list.filter(
          (s) =>
            s.id.toLowerCase() === lowerId ||
            s.id.toLowerCase() === cleanId ||
            (matched && s.id.toLowerCase() === matched.id.toLowerCase())
        );
      }

      if (year) {
        list = list.filter((s) => s.date.toLowerCase().includes(year));
      }
      if (label) {
        list = list.filter((s) => s.label.toLowerCase().includes(label));
      }
      if (note) {
        list = list.filter((s) => s.note && s.note.toLowerCase().includes(note));
      }
      if (urlFilter) {
        list = list.filter((s) => s.url.toLowerCase().includes(urlFilter));
      }
      if (q) {
        list = list.filter(
          (s) =>
            s.id.toLowerCase().includes(q) ||
            s.label.toLowerCase().includes(q) ||
            s.url.toLowerCase().includes(q) ||
            s.date.toLowerCase().includes(q) ||
            (s.note && s.note.toLowerCase().includes(q))
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
      totalCount: sources.length,
      sources: list,
    },
    { cacheControl: PUBLIC_CACHE }
  );
}
