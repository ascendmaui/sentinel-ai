import { json, parseLimit, parseOffset, parseSearchQuery, parseSortOrder, PUBLIC_CACHE } from "../../../lib/http";
import { incidentById, incidents, scenarios, unverified, INCIDENTS_DISCLAIMER } from "../../../lib/incidents";

/** Incident case studies index as JSON. Lists incidents, summaries, counts, and disclaimer. Supports ?id=, ?n=, ?num=, ?incident=, ?case=, ?source=, ?ref=, ?year=, ?date=, ?title=, ?standing=, ?kicker=, ?vuln=, ?cve=, ?impact=, ?q=, ?order=, ?sort=, ?offset=, ?limit=, ?take=, and ?page=. */
export function GET(): Response;
export function GET(req: Request): Response;
export function GET(req?: Request): Response {
  let list = incidents;

  if (req?.url) {
    try {
      const url = new URL(req.url, "http://localhost");
      const q = parseSearchQuery(url.searchParams);
      const id =
        parseSearchQuery(url.searchParams, "id") ||
        parseSearchQuery(url.searchParams, "incident") ||
        parseSearchQuery(url.searchParams, "incident_id") ||
        parseSearchQuery(url.searchParams, "incidentId") ||
        parseSearchQuery(url.searchParams, "incident_slug") ||
        parseSearchQuery(url.searchParams, "incidentSlug") ||
        parseSearchQuery(url.searchParams, "case") ||
        parseSearchQuery(url.searchParams, "case_id") ||
        parseSearchQuery(url.searchParams, "caseId") ||
        parseSearchQuery(url.searchParams, "case_slug") ||
        parseSearchQuery(url.searchParams, "caseSlug") ||
        parseSearchQuery(url.searchParams, "inc") ||
        parseSearchQuery(url.searchParams, "inc_id") ||
        parseSearchQuery(url.searchParams, "incId") ||
        parseSearchQuery(url.searchParams, "slug");
      const n =
        parseSearchQuery(url.searchParams, "n") ||
        parseSearchQuery(url.searchParams, "num") ||
        parseSearchQuery(url.searchParams, "number") ||
        parseSearchQuery(url.searchParams, "no") ||
        parseSearchQuery(url.searchParams, "incident_no") ||
        parseSearchQuery(url.searchParams, "case_no");
      const source =
        parseSearchQuery(url.searchParams, "source") ||
        parseSearchQuery(url.searchParams, "source_id") ||
        parseSearchQuery(url.searchParams, "sourceId") ||
        parseSearchQuery(url.searchParams, "src") ||
        parseSearchQuery(url.searchParams, "src_id") ||
        parseSearchQuery(url.searchParams, "srcId") ||
        parseSearchQuery(url.searchParams, "ref") ||
        parseSearchQuery(url.searchParams, "reference");
      const year =
        parseSearchQuery(url.searchParams, "year") ||
        parseSearchQuery(url.searchParams, "date") ||
        parseSearchQuery(url.searchParams, "timeframe") ||
        parseSearchQuery(url.searchParams, "period");
      const title =
        parseSearchQuery(url.searchParams, "title") ||
        parseSearchQuery(url.searchParams, "name") ||
        parseSearchQuery(url.searchParams, "headline");
      const standing =
        parseSearchQuery(url.searchParams, "standing") ||
        parseSearchQuery(url.searchParams, "status") ||
        parseSearchQuery(url.searchParams, "credibility");
      const kicker =
        parseSearchQuery(url.searchParams, "kicker") ||
        parseSearchQuery(url.searchParams, "tag") ||
        parseSearchQuery(url.searchParams, "badge") ||
        parseSearchQuery(url.searchParams, "category");
      const vuln =
        parseSearchQuery(url.searchParams, "vuln") ||
        parseSearchQuery(url.searchParams, "vulnerability") ||
        parseSearchQuery(url.searchParams, "cve") ||
        parseSearchQuery(url.searchParams, "weakness") ||
        parseSearchQuery(url.searchParams, "flaw");
      const impact =
        parseSearchQuery(url.searchParams, "impact") ||
        parseSearchQuery(url.searchParams, "severity") ||
        parseSearchQuery(url.searchParams, "consequence") ||
        parseSearchQuery(url.searchParams, "effect");
      const limit = parseLimit(url.searchParams);
      const offset = parseOffset(url.searchParams, 10000, limit);
      const order = parseSortOrder(url.searchParams);

      if (id) {
        const matched = incidentById(id);
        let cleanId = id.replace(/^\/+|\/+$/g, "").replace(/\.(html|json)$/, "");
        cleanId = cleanId.replace(/^(incident|case|inc)[-_]/, "");
        if (cleanId.startsWith("incident") && /^\d+$/.test(cleanId.slice(8))) cleanId = cleanId.slice(8);
        else if (cleanId.startsWith("case") && /^\d+$/.test(cleanId.slice(4))) cleanId = cleanId.slice(4);
        else if (cleanId.startsWith("i-") || cleanId.startsWith("i_")) cleanId = cleanId.slice(2);
        else if (cleanId.startsWith("inc") && /^\d+$/.test(cleanId.slice(3))) cleanId = cleanId.slice(3);
        else if (cleanId.startsWith("i") && /^\d+$/.test(cleanId.slice(1))) cleanId = cleanId.slice(1);
        list = list.filter(
          (i) =>
            i.id.toLowerCase() === id ||
            i.id.toLowerCase() === cleanId ||
            i.n.toLowerCase() === id ||
            i.n.toLowerCase() === cleanId ||
            i.n.toLowerCase() === cleanId.padStart(2, "0") ||
            (cleanId.replace(/^0+/, "") && i.n.replace(/^0+/, "") === cleanId.replace(/^0+/, "")) ||
            (matched && i.id.toLowerCase() === matched.id.toLowerCase())
        );
      }

      if (n) {
        const matched = incidentById(n);
        let cleanN = n.replace(/^\/+|\/+$/g, "").replace(/\.(html|json)$/, "");
        cleanN = cleanN.replace(/^(incident|case|inc)[-_]/, "");
        if (cleanN.startsWith("incident") && /^\d+$/.test(cleanN.slice(8))) cleanN = cleanN.slice(8);
        else if (cleanN.startsWith("case") && /^\d+$/.test(cleanN.slice(4))) cleanN = cleanN.slice(4);
        else if (cleanN.startsWith("i-") || cleanN.startsWith("i_")) cleanN = cleanN.slice(2);
        else if (cleanN.startsWith("inc") && /^\d+$/.test(cleanN.slice(3))) cleanN = cleanN.slice(3);
        else if (cleanN.startsWith("i") && /^\d+$/.test(cleanN.slice(1))) cleanN = cleanN.slice(1);
        list = list.filter(
          (i) =>
            i.n.toLowerCase() === n ||
            i.n.toLowerCase() === cleanN ||
            i.n.toLowerCase() === cleanN.padStart(2, "0") ||
            (cleanN.replace(/^0+/, "") && i.n.replace(/^0+/, "") === cleanN.replace(/^0+/, "")) ||
            (matched && i.id.toLowerCase() === matched.id.toLowerCase())
        );
      }

      if (source) {
        const cleanSource = source.replace(/^(source|src)[-_]/, "").replace(/\.(html|json)$/, "");
        list = list.filter(
          (i) =>
            i.sources.some(
              (s) => s.toLowerCase() === source || (cleanSource && s.toLowerCase() === cleanSource)
            )
        );
      }

      if (year) {
        list = list.filter((i) => i.date.toLowerCase().includes(year));
      }

      if (title) {
        list = list.filter((i) => i.title.toLowerCase().includes(title));
      }

      if (standing) {
        list = list.filter((i) => i.standing.toLowerCase().includes(standing));
      }

      if (kicker) {
        list = list.filter((i) => i.kicker.toLowerCase().includes(kicker));
      }

      if (vuln) {
        list = list.filter((i) => i.vuln.some((v) => v.toLowerCase().includes(vuln)));
      }

      if (impact) {
        list = list.filter((i) => i.impact.some((im) => im.toLowerCase().includes(impact)));
      }

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
            i.seraphim.limits.toLowerCase().includes(q) ||
            i.sources.some((s) => s.toLowerCase().includes(q))
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
