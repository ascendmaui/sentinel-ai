import { json, parseLimit, parseOffset, parseSearchQuery, parseSortOrder, PUBLIC_CACHE } from "../../../lib/http";
import { scenarioById, scenarios } from "../../../lib/incidents";

/** Hypothetical scenarios index as JSON. Lists conceptual threat models and controls. Supports ?id=, ?n=, ?ref=, ?source=, ?weakness=, ?target=, ?control=, ?speed=, ?approach=, ?seraphim=, ?analysis=, ?q=, ?order=, ?offset=, ?limit=, and ?page=. */
export function GET(): Response;
export function GET(req: Request): Response;
export function GET(req?: Request): Response {
  let list = scenarios;

  if (req?.url) {
    try {
      const url = new URL(req.url, "http://localhost");
      const id =
        parseSearchQuery(url.searchParams, "id") ||
        parseSearchQuery(url.searchParams, "scenario") ||
        parseSearchQuery(url.searchParams, "scenario_id") ||
        parseSearchQuery(url.searchParams, "scenarioId") ||
        parseSearchQuery(url.searchParams, "slug");
      const n = parseSearchQuery(url.searchParams, "n");
      const title = parseSearchQuery(url.searchParams, "title");
      const ref = parseSearchQuery(url.searchParams, "ref") || parseSearchQuery(url.searchParams, "source");
      const weakness =
        parseSearchQuery(url.searchParams, "weakness") ||
        parseSearchQuery(url.searchParams, "weaknessClass") ||
        parseSearchQuery(url.searchParams, "weakness_class");
      const target = parseSearchQuery(url.searchParams, "target");
      const control = parseSearchQuery(url.searchParams, "control") || parseSearchQuery(url.searchParams, "controls");
      const speed = parseSearchQuery(url.searchParams, "speed");
      const approach = parseSearchQuery(url.searchParams, "approach");
      const seraphim = parseSearchQuery(url.searchParams, "seraphim") || parseSearchQuery(url.searchParams, "analysis");
      const q = parseSearchQuery(url.searchParams);
      const limit = parseLimit(url.searchParams);
      const offset = parseOffset(url.searchParams, 10000, limit);
      const order = parseSortOrder(url.searchParams);

      if (id) {
        const matched = scenarioById(id);
        let cleanId = id.replace(/\.(html|json)$/, "");
        cleanId = cleanId.replace(/^(scenario|sc)[-_]/, "");
        if (cleanId.startsWith("scenario") && /^(?:h)?\d+$/.test(cleanId.slice(8))) cleanId = cleanId.slice(8);
        else if (cleanId.startsWith("sc") && /^\d+$/.test(cleanId.slice(2))) cleanId = cleanId.slice(2);
        if (cleanId.startsWith("h-") || cleanId.startsWith("h_")) cleanId = `h${cleanId.slice(2)}`;
        cleanId = cleanId.replace(/^h0*(\d+)$/, "h$1").replace(/^0*(\d+)$/, "$1");
        const normalized = cleanId.startsWith("h") ? cleanId : `h${cleanId}`;
        list = list.filter(
          (s) =>
            s.id.toLowerCase() === id ||
            s.id.toLowerCase() === cleanId ||
            s.n.toLowerCase() === id ||
            s.n.toLowerCase() === cleanId ||
            s.n.toLowerCase() === normalized ||
            (matched && s.id.toLowerCase() === matched.id.toLowerCase())
        );
      }

      if (n) {
        const matched = scenarioById(n);
        let cleanN = n.replace(/\.(html|json)$/, "");
        cleanN = cleanN.replace(/^(scenario|sc)[-_]/, "");
        if (cleanN.startsWith("scenario") && /^(?:h)?\d+$/.test(cleanN.slice(8))) cleanN = cleanN.slice(8);
        else if (cleanN.startsWith("sc") && /^\d+$/.test(cleanN.slice(2))) cleanN = cleanN.slice(2);
        if (cleanN.startsWith("h-") || cleanN.startsWith("h_")) cleanN = `h${cleanN.slice(2)}`;
        cleanN = cleanN.replace(/^h0*(\d+)$/, "h$1").replace(/^0*(\d+)$/, "$1");
        const normalized = cleanN.startsWith("h") ? cleanN : `h${cleanN}`;
        list = list.filter(
          (s) =>
            s.n.toLowerCase() === n ||
            s.n.toLowerCase() === cleanN ||
            s.n.toLowerCase() === normalized ||
            (matched && s.id.toLowerCase() === matched.id.toLowerCase())
        );
      }

      if (ref) {
        const cleanRef = ref.replace(/^(source|src)[-_]/, "").replace(/\.(html|json)$/, "");
        list = list.filter(
          (s) =>
            s.refs.some(
              (r) => r.toLowerCase() === ref || (cleanRef && r.toLowerCase() === cleanRef)
            )
        );
      }

      if (title) {
        list = list.filter((s) => s.title.toLowerCase().includes(title));
      }

      if (weakness) {
        list = list.filter((s) => s.weaknessClass.some((w) => w.toLowerCase().includes(weakness)));
      }

      if (target) {
        list = list.filter((s) => s.target.toLowerCase().includes(target));
      }

      if (control) {
        list = list.filter((s) => s.controls.some((c) => c.toLowerCase().includes(control)));
      }

      if (speed) {
        list = list.filter((s) => s.speed.toLowerCase().includes(speed));
      }

      if (approach) {
        list = list.filter((s) => s.approach.toLowerCase().includes(approach));
      }

      if (seraphim) {
        list = list.filter((s) => s.seraphim.some((sp) => sp.toLowerCase().includes(seraphim)));
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

      if (order === "desc") {
        list = [...list].reverse();
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
