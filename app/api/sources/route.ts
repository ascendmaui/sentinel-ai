import { json, parseLimit, parseOffset, parseSearchQuery, PUBLIC_CACHE } from "../../../lib/http";
import { sources } from "../../../lib/sources";

/** Authoritative sources index as JSON. Lists verified research references. Supports ?id=, ?q=, ?year=, ?note=, ?type=, ?offset=, and ?limit=. */
export function GET(): Response;
export function GET(req: Request): Response;
export function GET(req?: Request): Response {
  let list = sources;

  if (req?.url) {
    try {
      const url = new URL(req.url, "http://localhost");
      const id = parseSearchQuery(url.searchParams, "id");
      const q = parseSearchQuery(url.searchParams);
      const year = parseSearchQuery(url.searchParams, "year");
      const note = parseSearchQuery(url.searchParams, "note") || parseSearchQuery(url.searchParams, "type");
      const offset = parseOffset(url.searchParams);
      const limit = parseLimit(url.searchParams);

      if (id) {
        let cleanId = id;
        if (cleanId.startsWith("source-")) cleanId = cleanId.slice(7);
        else if (cleanId.startsWith("src-")) cleanId = cleanId.slice(4);
        list = list.filter((s) => s.id.toLowerCase() === id || s.id.toLowerCase() === cleanId);
      }

      if (year) {
        list = list.filter((s) => s.date.toLowerCase().includes(year));
      }
      if (note) {
        list = list.filter((s) => s.note && s.note.toLowerCase().includes(note));
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
