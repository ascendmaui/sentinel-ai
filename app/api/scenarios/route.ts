import { json, parseLimit, parseSearchQuery, PUBLIC_CACHE } from "../../../lib/http";
import { scenarios } from "../../../lib/incidents";

/** Hypothetical scenarios index as JSON. Lists conceptual threat models and controls. Supports ?q=. */
export function GET(): Response;
export function GET(req: Request): Response;
export function GET(req?: Request): Response {
  let list = scenarios;

  if (req?.url) {
    try {
      const url = new URL(req.url);
      const q = parseSearchQuery(url.searchParams);
      const limit = parseLimit(url.searchParams);

      if (q) {
        list = list.filter(
          (s) =>
            s.id.toLowerCase().includes(q) ||
            s.title.toLowerCase().includes(q) ||
            s.target.toLowerCase().includes(q) ||
            s.weaknessClass.some((w) => w.toLowerCase().includes(q))
        );
      }

      if (limit) {
        list = list.slice(0, limit);
      }
    } catch {
      // Ignore malformed URL
    }
  }

  const items = list.map((s) => ({
    id: s.id,
    n: s.n,
    title: s.title,
    target: s.target,
    weaknessClass: s.weaknessClass,
    speed: s.speed,
    refsCount: s.refs.length,
    url: `/incident-case-studies#${s.id}`,
  }));

  return json(
    {
      count: items.length,
      totalCount: scenarios.length,
      scenarios: items,
    },
    { cacheControl: PUBLIC_CACHE }
  );
}
