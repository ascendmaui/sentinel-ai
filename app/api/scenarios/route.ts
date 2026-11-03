import { json, parseLimit, parseOffset, parseSearchQuery, parseSortOrder, PUBLIC_CACHE } from "../../../lib/http";
import { scenarioById, scenarios } from "../../../lib/incidents";
import { sourceById } from "../../../lib/sources";

/** Hypothetical scenarios index as JSON. Lists conceptual threat models and controls. Supports ?id=, ?n=, ?num=, ?scenario=, ?ref=, ?source=, ?weakness=, ?target=, ?control=, ?speed=, ?approach=, ?seraphim=, ?analysis=, ?q=, ?order=, ?sort=, ?offset=, ?limit=, ?take=, and ?page=. */
export function GET(): Response;
export function GET(req: Request): Response;
export function GET(req?: Request): Response {
  let list = scenarios;

  if (req?.url) {
    try {
      const url = new URL(req.url, "http://localhost");
      const id = parseSearchQuery(
        url.searchParams,
        "id",
        "scenario",
        "scenario_id",
        "scenarioId",
        "scenario_no",
        "scenarioNo",
        "scenario_slug",
        "scenarioSlug",
        "sc",
        "sc_id",
        "scId",
        "h",
        "h_id",
        "hId",
        "slug"
      );
      const n = parseSearchQuery(
        url.searchParams,
        "n",
        "num",
        "number",
        "no",
        "h",
        "h_id",
        "hId",
        "scenario_no",
        "scenarioNo"
      );
      const title = parseSearchQuery(url.searchParams, "title", "name", "headline");
      const ref = parseSearchQuery(
        url.searchParams,
        "ref",
        "ref_id",
        "refId",
        "reference",
        "source",
        "source_id",
        "sourceId",
        "src",
        "src_id",
        "srcId"
      );
      const weakness = parseSearchQuery(
        url.searchParams,
        "weakness",
        "weaknessClass",
        "weakness_class",
        "vuln",
        "vulnerability",
        "flaw"
      );
      const target = parseSearchQuery(
        url.searchParams,
        "target",
        "victim",
        "system",
        "environment",
        "host"
      );
      const control = parseSearchQuery(
        url.searchParams,
        "control",
        "controls",
        "mitigation",
        "defense",
        "remediation"
      );
      const speed = parseSearchQuery(
        url.searchParams,
        "speed",
        "rate",
        "tempo",
        "pace",
        "velocity"
      );
      const approach = parseSearchQuery(
        url.searchParams,
        "approach",
        "technique",
        "method",
        "attack",
        "vector"
      );
      const seraphim = parseSearchQuery(
        url.searchParams,
        "seraphim",
        "analysis",
        "assessment",
        "recommendation"
      );
      const q = parseSearchQuery(url.searchParams);
      const limit = parseLimit(url.searchParams);
      const offset = parseOffset(url.searchParams, 10000, limit);
      const order = parseSortOrder(url.searchParams);

      if (id) {
        const matched = scenarioById(id);
        let cleanId = id.replace(/^\/+|\/+$/g, "").replace(/\.(html|json)$/, "");
        cleanId = cleanId.replace(/^[#+]+/, "").replace(/[#+]+$/, "");
        cleanId = cleanId.replace(/^(?:(?:api\/)?(?:scenarios|scenario|hypothetical-scenarios|hypothetical)\/)+/, "");
        cleanId = cleanId.replace(/^[#+]+/, "").replace(/[#+]+$/, "");
        cleanId = cleanId.replace(/^(scenario|sc)[-_]/, "");
        if (cleanId.startsWith("scenario") && /^(?:h)?\d+$/.test(cleanId.slice(8))) cleanId = cleanId.slice(8);
        else if (cleanId.startsWith("sc") && /^\d+$/.test(cleanId.slice(2))) cleanId = cleanId.slice(2);
        cleanId = cleanId.replace(/^[#+]+/, "").replace(/[#+]+$/, "");
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
        let cleanN = n.replace(/^\/+|\/+$/g, "").replace(/\.(html|json)$/, "");
        cleanN = cleanN.replace(/^[#+]+/, "").replace(/[#+]+$/, "");
        cleanN = cleanN.replace(/^(?:(?:api\/)?(?:scenarios|scenario|hypothetical-scenarios|hypothetical)\/)+/, "");
        cleanN = cleanN.replace(/^[#+]+/, "").replace(/[#+]+$/, "");
        cleanN = cleanN.replace(/^(scenario|sc)[-_]/, "");
        if (cleanN.startsWith("scenario") && /^(?:h)?\d+$/.test(cleanN.slice(8))) cleanN = cleanN.slice(8);
        else if (cleanN.startsWith("sc") && /^\d+$/.test(cleanN.slice(2))) cleanN = cleanN.slice(2);
        cleanN = cleanN.replace(/^[#+]+/, "").replace(/[#+]+$/, "");
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
        const matchedRef = sourceById(ref);
        let cleanRef = ref.replace(/^\/+|\/+$/g, "").replace(/\.(html|json)$/, "");
        cleanRef = cleanRef.replace(/^[#+]+/, "").replace(/[#+]+$/, "");
        cleanRef = cleanRef.replace(/^(?:(?:api\/)?(?:sources|source|refs|ref|references|reference)\/)+/, "");
        cleanRef = cleanRef.replace(/^[#+]+/, "").replace(/[#+]+$/, "");
        cleanRef = cleanRef.replace(/^(source|src|ref|reference)[-_]/, "");
        cleanRef = cleanRef.replace(/^[#+]+/, "").replace(/[#+]+$/, "");
        list = list.filter(
          (s) =>
            s.refs.some(
              (r) =>
                r.toLowerCase() === ref ||
                r.toLowerCase() === cleanRef ||
                (cleanRef && r.toLowerCase().includes(cleanRef)) ||
                (matchedRef && r.toLowerCase() === matchedRef.id.toLowerCase())
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
