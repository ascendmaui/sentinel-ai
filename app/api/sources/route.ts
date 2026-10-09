import { json, parseLimit, parseSearchQuery, PUBLIC_CACHE } from "../../../lib/http";
import { sources } from "../../../lib/sources";

/** Authoritative sources index as JSON. Lists verified research references. Supports ?q= and ?year=. */
export function GET(): Response;
export function GET(req: Request): Response;
export function GET(req?: Request): Response {
  let list = sources;

  if (req?.url) {
    try {
      const url = new URL(req.url);
      const q = parseSearchQuery(url.searchParams);
      const year = parseSearchQuery(url.searchParams, "year");
      const limit = parseLimit(url.searchParams);

      if (year) {
        list = list.filter((s) => s.date.includes(year));
      }
      if (q) {
        list = list.filter(
          (s) =>
            s.id.toLowerCase().includes(q) ||
            s.label.toLowerCase().includes(q) ||
            s.url.toLowerCase().includes(q) ||
            (s.note && s.note.toLowerCase().includes(q))
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
      totalCount: sources.length,
      sources: list,
    },
    { cacheControl: PUBLIC_CACHE }
  );
}
