import { json, parseLimit, parseOffset, parseSearchQuery, PUBLIC_CACHE } from "../../../lib/http";
import { scenarios } from "../../../lib/incidents";

/** Hypothetical scenarios index as JSON. Lists conceptual threat models and controls. Supports ?id=, ?n=, ?ref=, ?weakness=, ?target=, ?q=, ?offset=, and ?limit=. */
export function GET(): Response;
export function GET(req: Request): Response;
export function GET(req?: Request): Response {
  let list = scenarios;

  if (req?.url) {
    try {
      const url = new URL(req.url, "http://localhost");
      const id = parseSearchQuery(url.searchParams, "id");
      const n = parseSearchQuery(url.searchParams, "n");
      const ref = parseSearchQuery(url.searchParams, "ref");
      const weakness = parseSearchQuery(url.searchParams, "weakness") || parseSearchQuery(url.searchParams, "weaknessClass");
      const target = parseSearchQuery(url.searchParams, "target");
      const q = parseSearchQuery(url.searchParams);
      const offset = parseOffset(url.searchParams);
      const limit = parseLimit(url.searchParams);

      if (id) {
        let cleanId = id;
        if (cleanId.startsWith("scenario-")) cleanId = cleanId.slice(9);
        else if (cleanId.startsWith("sc-")) cleanId = cleanId.slice(3);
        if (cleanId.startsWith("h-")) cleanId = `h${cleanId.slice(2)}`;
        const normalized = cleanId.startsWith("h") ? cleanId : `h${cleanId}`;
        list = list.filter(
          (s) =>
            s.id.toLowerCase() === id ||
            s.id.toLowerCase() === cleanId ||
            s.n.toLowerCase() === id ||
            s.n.toLowerCase() === cleanId ||
            s.n.toLowerCase() === normalized
        );
      }

      if (n) {
        let cleanN = n;
        if (cleanN.startsWith("scenario-")) cleanN = cleanN.slice(9);
        else if (cleanN.startsWith("sc-")) cleanN = cleanN.slice(3);
        if (cleanN.startsWith("h-")) cleanN = `h${cleanN.slice(2)}`;
        const normalized = cleanN.startsWith("h") ? cleanN : `h${cleanN}`;
        list = list.filter(
          (s) =>
            s.n.toLowerCase() === n ||
            s.n.toLowerCase() === cleanN ||
            s.n.toLowerCase() === normalized
        );
      }

      if (ref) {
        list = list.filter((s) => s.refs.some((r) => r.toLowerCase() === ref));
      }

      if (weakness) {
        list = list.filter((s) => s.weaknessClass.some((w) => w.toLowerCase().includes(weakness)));
      }

      if (target) {
        list = list.filter((s) => s.target.toLowerCase().includes(target));
      }

      if (q) {
        list = list.filter(
          (s) =>
            s.id.toLowerCase().includes(q) ||
            s.n.toLowerCase().includes(q) ||
            s.title.toLowerCase().includes(q) ||
            s.target.toLowerCase().includes(q) ||
            s.weaknessClass.some((w) => w.toLowerCase().includes(q)) ||
            s.approach.toLowerCase().includes(q) ||
            s.speed.toLowerCase().includes(q) ||
            s.controls.some((c) => c.toLowerCase().includes(q)) ||
            s.seraphim.some((sp) => sp.toLowerCase().includes(q)) ||
            s.refs.some((r) => r.toLowerCase().includes(q))
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
