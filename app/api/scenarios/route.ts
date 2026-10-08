import { json, PUBLIC_CACHE } from "../../../lib/http";
import { scenarios } from "../../../lib/incidents";

/** Hypothetical scenarios index as JSON. Lists conceptual threat models and controls. */
export function GET() {
  const items = scenarios.map((s) => ({
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
      scenarios: items,
    },
    { cacheControl: PUBLIC_CACHE }
  );
}
