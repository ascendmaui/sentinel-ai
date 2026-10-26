import { json, parseLimit, parseOffset, parseSearchQuery, parseSortOrder, PUBLIC_CACHE } from "../../../lib/http";
import { incidents, scenarios, unverified, INCIDENTS_DISCLAIMER } from "../../../lib/incidents";

/** Incident case studies index as JSON. Lists incidents, summaries, counts, and disclaimer. Supports ?id=, ?n=, ?source=, ?ref=, ?year=, ?date=, ?title=, ?standing=, ?kicker=, ?vuln=, ?cve=, ?impact=, ?q=, ?order=, ?offset=, ?limit=, and ?page=. */
export function GET(): Response;
export function GET(req: Request): Response;
export function GET(req?: Request): Response {
  let list = incidents;

  if (req?.url) {
    try {
      const url = new URL(req.url, "http://localhost");
      const q = parseSearchQuery(url.searchParams);
      const id = parseSearchQuery(url.searchParams, "id");
      const n = parseSearchQuery(url.searchParams, "n");
      const source = parseSearchQuery(url.searchParams, "source") || parseSearchQuery(url.searchParams, "ref");
      const year = parseSearchQuery(url.searchParams, "year") || parseSearchQuery(url.searchParams, "date");
      const title = parseSearchQuery(url.searchParams, "title");
      const standing = parseSearchQuery(url.searchParams, "standing");
      const kicker = parseSearchQuery(url.searchParams, "kicker");
      const vuln =
        parseSearchQuery(url.searchParams, "vuln") ||
        parseSearchQuery(url.searchParams, "vulnerability") ||
        parseSearchQuery(url.searchParams, "cve");
      const impact = parseSearchQuery(url.searchParams, "impact");
      const limit = parseLimit(url.searchParams);
      const offset = parseOffset(url.searchParams, 10000, limit);
      const order = parseSortOrder(url.searchParams);

      if (id) {
        let cleanId = id.replace(/\.(html|json)$/, "");
        cleanId = cleanId.replace(/^(incident|case|inc)[-_]/, "");
        list = list.filter(
          (i) =>
            i.id.toLowerCase() === id ||
            i.id.toLowerCase() === cleanId ||
            i.n.toLowerCase() === id ||
            i.n.toLowerCase() === cleanId ||
            i.n.toLowerCase() === cleanId.padStart(2, "0") ||
            (cleanId.replace(/^0+/, "") && i.n.replace(/^0+/, "") === cleanId.replace(/^0+/, ""))
        );
      }

      if (n) {
        let cleanN = n.replace(/\.(html|json)$/, "");
        cleanN = cleanN.replace(/^(incident|case|inc)[-_]/, "");
        list = list.filter(
          (i) =>
            i.n.toLowerCase() === n ||
            i.n.toLowerCase() === cleanN ||
            i.n.toLowerCase() === cleanN.padStart(2, "0") ||
            (cleanN.replace(/^0+/, "") && i.n.replace(/^0+/, "") === cleanN.replace(/^0+/, ""))
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
