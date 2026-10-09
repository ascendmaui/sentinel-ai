import { json, PUBLIC_CACHE } from "../../../lib/http";
import { scenarios } from "../../../lib/incidents";

/** Hypothetical scenarios index as JSON. Lists conceptual threat models and controls. Supports ?q=. */
export function GET(): Response;
export function GET(req: Request): Response;
export function GET(req?: Request): Response {
  let list = scenarios;

  if (req?.url) {
    try {
      const url = new URL(req.url);
      const q = url.searchParams.get("q");

      if (q) {
        const targetQ = q.trim().toLowerCase();
        list = list.filter(
          (s) =>
            s.id.toLowerCase().includes(targetQ) ||
            s.title.toLowerCase().includes(targetQ) ||
            s.target.toLowerCase().includes(targetQ) ||
            s.weaknessClass.some((w) => w.toLowerCase().includes(targetQ))
        );
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
