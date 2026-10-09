import { json, PUBLIC_CACHE } from "../../../lib/http";
import { incidents, scenarios, unverified, INCIDENTS_DISCLAIMER } from "../../../lib/incidents";

/** Incident case studies index as JSON. Lists incidents, summaries, counts, and disclaimer. Supports ?q=. */
export function GET(): Response;
export function GET(req: Request): Response;
export function GET(req?: Request): Response {
  let list = incidents;

  if (req?.url) {
    try {
      const url = new URL(req.url);
      const q = url.searchParams.get("q");

      if (q) {
        const targetQ = q.trim().toLowerCase();
        list = list.filter(
          (i) =>
            i.id.toLowerCase().includes(targetQ) ||
            i.title.toLowerCase().includes(targetQ) ||
            i.kicker.toLowerCase().includes(targetQ) ||
            i.oneLine.toLowerCase().includes(targetQ) ||
            i.standing.toLowerCase().includes(targetQ) ||
            i.timeline.some((t) => t.t.toLowerCase().includes(targetQ)) ||
            i.did.some((d) => d.toLowerCase().includes(targetQ)) ||
            i.howIn.some((h) => h.toLowerCase().includes(targetQ))
        );
      }
    } catch {
      // Ignore malformed URL
    }
  }

  const items = list.map((i) => ({
    id: i.id,
    n: i.n,
    title: i.title,
    date: i.date,
    kicker: i.kicker,
    oneLine: i.oneLine,
    standing: i.standing,
    sourcesCount: i.sources.length,
    url: `/incident-case-studies#${i.id}`,
  }));

  return json(
    {
      count: items.length,
      totalCount: incidents.length,
      incidents: items,
      scenariosCount: scenarios.length,
      unverifiedCount: unverified.length,
      unverified,
      disclaimer: INCIDENTS_DISCLAIMER,
    },
    { cacheControl: PUBLIC_CACHE }
  );
}
