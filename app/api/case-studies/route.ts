import { json, parseLimit, parseOffset, parseSearchQuery, parseSortOrder, PUBLIC_CACHE } from "../../../lib/http";
import { findings, remediation, severityCounts } from "../../../lib/caseStudies";

/** Remediation findings and case studies index as JSON. Supports optional ?id=, ?n=, ?severity=, ?status=, ?q=, ?order=, ?offset=, ?limit=, and ?page= filters. */
export function GET(): Response;
export function GET(req: Request): Response;
export function GET(req?: Request): Response {
  let list = findings;
  if (req?.url) {
    try {
      const url = new URL(req.url, "http://localhost");
      const id = parseSearchQuery(url.searchParams, "id") || parseSearchQuery(url.searchParams, "n");
      const severity = parseSearchQuery(url.searchParams, "severity");
      const status = parseSearchQuery(url.searchParams, "status");
      const q = parseSearchQuery(url.searchParams);
      const limit = parseLimit(url.searchParams);
      const offset = parseOffset(url.searchParams, 10000, limit);
      const order = parseSortOrder(url.searchParams);

      if (id) {
        let cleanId = id.replace(/\.(html|json)$/, "");
        if (cleanId.startsWith("fix-")) cleanId = cleanId.slice(4);
        const normalized = cleanId.replace(/-/g, "");
        const numMatch = normalized.match(/^(?:f)?0*(\d+)$/);
        const withF = numMatch ? `f${numMatch[1].padStart(2, "0")}` : normalized;
        list = list.filter(
          (f) =>
            f.id.toLowerCase() === cleanId ||
            f.id.toLowerCase().replace(/-/g, "") === normalized ||
            f.id.toLowerCase().replace(/-/g, "") === withF
        );
      }
      if (severity) {
        list = list.filter((f) => f.severity.toLowerCase() === severity);
      }
      if (status) {
        list = list.filter((f) => f.status.toLowerCase().includes(status));
      }
      if (q) {
        list = list.filter(
          (f) =>
            f.id.toLowerCase().includes(q) ||
            f.title.toLowerCase().includes(q) ||
            f.severity.toLowerCase().includes(q) ||
            f.rationale.toLowerCase().includes(q) ||
            f.fix.toLowerCase().includes(q) ||
            f.what.toLowerCase().includes(q) ||
            f.before.toLowerCase().includes(q) ||
            f.after.toLowerCase().includes(q) ||
            f.status.toLowerCase().includes(q)
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
      // In case of malformed URL, default to unfiltered list
    }
  }

  return json(
    {
      count: list.length,
      totalCount: findings.length,
      severityCounts,
      findings: list.map((f) => ({
        id: f.id,
        title: f.title,
        severity: f.severity,
        rationale: f.rationale,
        status: f.status,
        url: `/case-studies#${f.id.toLowerCase()}`,
      })),
      remediationCount: remediation.length,
    },
    { cacheControl: PUBLIC_CACHE }
  );
}
