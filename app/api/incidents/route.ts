import { json, parseLimit, parseSearchQuery, PUBLIC_CACHE } from "../../../lib/http";
import { incidents, scenarios, unverified, INCIDENTS_DISCLAIMER } from "../../../lib/incidents";

/** Incident case studies index as JSON. Lists incidents, summaries, counts, and disclaimer. Supports ?q=. */
export function GET(): Response;
export function GET(req: Request): Response;
export function GET(req?: Request): Response {
  let list = incidents;

  if (req?.url) {
    try {
      const url = new URL(req.url, "http://localhost");
      const q = parseSearchQuery(url.searchParams);
      const limit = parseLimit(url.searchParams);

      if (q) {
        list = list.filter(
          (i) =>
            i.id.toLowerCase().includes(q) ||
            i.n.toLowerCase().includes(q) ||
            i.title.toLowerCase().includes(q) ||
            i.date.toLowerCase().includes(q) ||
            i.kicker.toLowerCase().includes(q) ||
            i.oneLine.toLowerCase().includes(q) ||
            i.standing.toLowerCase().includes(q) ||
            i.timeline.some((t) => t.d.toLowerCase().includes(q) || t.t.toLowerCase().includes(q)) ||
            i.did.some((d) => d.toLowerCase().includes(q)) ||
            i.howIn.some((h) => h.toLowerCase().includes(q)) ||
            i.vuln.some((v) => v.toLowerCase().includes(q)) ||
            i.impact.some((im) => im.toLowerCase().includes(q)) ||
            i.inferred.some((inf) => inf.toLowerCase().includes(q)) ||
            i.seraphim.flag.some((sf) => sf.toLowerCase().includes(q)) ||
            i.seraphim.prepare.some((sp) => sp.toLowerCase().includes(q)) ||
            i.seraphim.limits.toLowerCase().includes(q)
        );
      }

      if (limit) {
        list = list.slice(0, limit);
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
