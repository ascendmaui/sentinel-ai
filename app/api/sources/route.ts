import { json, PUBLIC_CACHE } from "../../../lib/http";
import { sources } from "../../../lib/sources";

/** Authoritative sources index as JSON. Lists verified research references. Supports ?q= and ?year=. */
export function GET(): Response;
export function GET(req: Request): Response;
export function GET(req?: Request): Response {
  let list = sources;

  if (req?.url) {
    try {
      const url = new URL(req.url);
      const q = url.searchParams.get("q");
      const year = url.searchParams.get("year");
      const limitStr = url.searchParams.get("limit");

      if (year) {
        const targetYear = year.trim();
        if (targetYear.length > 0) {
          list = list.filter((s) => s.date.includes(targetYear));
        }
      }
      if (q) {
        const targetQ = q.trim().toLowerCase();
        if (targetQ.length > 0) {
          list = list.filter(
            (s) =>
              s.id.toLowerCase().includes(targetQ) ||
              s.label.toLowerCase().includes(targetQ) ||
              s.url.toLowerCase().includes(targetQ) ||
              (s.note && s.note.toLowerCase().includes(targetQ))
          );
        }
      }

      if (limitStr) {
        const limit = parseInt(limitStr, 10);
        if (!isNaN(limit) && limit > 0) {
          list = list.slice(0, limit);
        }
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
