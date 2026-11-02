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
      const id = parseSearchQuery(
        url.searchParams,
        "id",
        "source",
        "source_id",
        "sourceId",
        "source_slug",
        "sourceSlug",
        "src",
        "src_id",
        "srcId",
        "ref",
        "ref_id",
        "refId",
        "reference",
        "reference_id",
        "referenceId",
        "s",
        "s_id",
        "sId",
        "slug",
        "n",
        "num",
        "number"
      );
      const q = parseSearchQuery(url.searchParams);
      const year = parseSearchQuery(url.searchParams, "year", "date", "published");
      const label = parseSearchQuery(
        url.searchParams,
        "label",
        "title",
        "name",
        "headline"
      );
      const note = parseSearchQuery(
        url.searchParams,
        "note",
        "type",
        "credibility",
        "standing",
        "kind"
      );
      const urlFilter = parseSearchQuery(
        url.searchParams,
        "url",
        "link",
        "domain",
        "href",
        "uri"
      );
      const limit = parseLimit(url.searchParams);
      const offset = parseOffset(url.searchParams, 10000, limit);
      const order = parseSortOrder(url.searchParams);

      if (id) {
        const matched = sourceById(id);
        let cleanId = id.trim().toLowerCase().replace(/^\/+|\/+$/g, "").replace(/\.(html|json)$/, "");
        cleanId = cleanId.replace(/^[#+]+/, "").replace(/[#+]+$/, "");
        if (cleanId.startsWith("source-") || cleanId.startsWith("source_")) cleanId = cleanId.slice(7);
        else if (cleanId.startsWith("source") && /^\d+$/.test(cleanId.slice(6))) cleanId = cleanId.slice(6);
        else if (cleanId.startsWith("src-") || cleanId.startsWith("src_")) cleanId = cleanId.slice(4);
        else if (cleanId.startsWith("src") && /^\d+$/.test(cleanId.slice(3))) cleanId = cleanId.slice(3);
        else if (cleanId.startsWith("ref-") || cleanId.startsWith("ref_")) cleanId = cleanId.slice(4);
        else if (cleanId.startsWith("ref") && /^\d+$/.test(cleanId.slice(3))) cleanId = cleanId.slice(3);
        else if (cleanId.startsWith("reference-") || cleanId.startsWith("reference_")) cleanId = cleanId.slice(10);
        else if (cleanId.startsWith("reference") && /^\d+$/.test(cleanId.slice(9))) cleanId = cleanId.slice(9);
        else if (cleanId.startsWith("s-") || cleanId.startsWith("s_")) cleanId = cleanId.slice(2);
        else if (cleanId.startsWith("s") && /^\d+$/.test(cleanId.slice(1))) cleanId = cleanId.slice(1);
        cleanId = cleanId.replace(/^[#+]+/, "").replace(/[#+]+$/, "");
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
