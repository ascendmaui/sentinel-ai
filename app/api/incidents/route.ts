import { json, PUBLIC_CACHE } from "../../../lib/http";
import { incidents, scenarios, unverified, INCIDENTS_DISCLAIMER } from "../../../lib/incidents";

/** Incident case studies index as JSON. Lists incidents, summaries, counts, and disclaimer. */
export function GET() {
  const items = incidents.map((i) => ({
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
      incidents: items,
      scenariosCount: scenarios.length,
      unverifiedCount: unverified.length,
      disclaimer: INCIDENTS_DISCLAIMER,
    },
    { cacheControl: PUBLIC_CACHE }
  );
}
