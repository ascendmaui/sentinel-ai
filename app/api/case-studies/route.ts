import { json, parseLimit, parseOffset, parseSearchQuery, parseSortOrder, PUBLIC_CACHE } from "../../../lib/http";
import { findingById, findings, remediation, severityCounts } from "../../../lib/caseStudies";

/** Remediation findings and case studies index as JSON. Supports optional ?id=, ?n=, ?finding=, ?finding_id=, ?findingId=, ?case_study=, ?caseStudy=, ?slug=, ?title=, ?severity=, ?sev=, ?status=, ?fix=, ?rationale=, ?what=, ?before=, ?after=, ?q=, ?order=, ?offset=, ?limit=, and ?page= filters. */
export function GET(): Response;
export function GET(req: Request): Response;
export function GET(req?: Request): Response {
  let list = findings;
  if (req?.url) {
    try {
      const url = new URL(req.url, "http://localhost");
      const id =
        parseSearchQuery(url.searchParams, "id") ||
        parseSearchQuery(url.searchParams, "n") ||
        parseSearchQuery(url.searchParams, "finding") ||
        parseSearchQuery(url.searchParams, "finding_id") ||
        parseSearchQuery(url.searchParams, "findingId") ||
        parseSearchQuery(url.searchParams, "case_study") ||
        parseSearchQuery(url.searchParams, "caseStudy") ||
        parseSearchQuery(url.searchParams, "slug");
      const title = parseSearchQuery(url.searchParams, "title");
      const severity = parseSearchQuery(url.searchParams, "severity") || parseSearchQuery(url.searchParams, "sev");
      const status = parseSearchQuery(url.searchParams, "status");
      const fix = parseSearchQuery(url.searchParams, "fix") || parseSearchQuery(url.searchParams, "remediation");
      const rationale = parseSearchQuery(url.searchParams, "rationale");
      const what = parseSearchQuery(url.searchParams, "what") || parseSearchQuery(url.searchParams, "summary");
      const before = parseSearchQuery(url.searchParams, "before");
      const after = parseSearchQuery(url.searchParams, "after");
      const q = parseSearchQuery(url.searchParams);
      const limit = parseLimit(url.searchParams);
      const offset = parseOffset(url.searchParams, 10000, limit);
      const order = parseSortOrder(url.searchParams);

      if (id) {
        const matched = findingById(id);
        let cleanId = id.replace(/^\/+|\/+$/g, "").replace(/\.(html|json)$/, "");
        if (cleanId.startsWith("fix-") || cleanId.startsWith("fix_")) cleanId = cleanId.slice(4);
        else if (cleanId.startsWith("finding-") || cleanId.startsWith("finding_")) cleanId = cleanId.slice(8);
        else if (cleanId.startsWith("finding") && /^\d+$/.test(cleanId.slice(7))) cleanId = cleanId.slice(7);
        else if (cleanId.startsWith("case-study-") || cleanId.startsWith("case_study_")) cleanId = cleanId.slice(11);
        else if (cleanId.startsWith("cs-") || cleanId.startsWith("cs_")) cleanId = cleanId.slice(3);
        else if (cleanId.startsWith("cs") && /^\d+$/.test(cleanId.slice(2))) cleanId = cleanId.slice(2);
        const normalized = cleanId.replace(/[-_]/g, "");
        const numMatch = normalized.match(/^(?:f)?0*(\d+)$/);
        const withF = numMatch ? `f${numMatch[1].padStart(2, "0")}` : normalized;
        list = list.filter(
          (f) =>
            f.id.toLowerCase() === cleanId ||
            f.id.toLowerCase().replace(/[-_]/g, "") === normalized ||
            f.id.toLowerCase().replace(/[-_]/g, "") === withF ||
            (matched && f.id.toLowerCase() === matched.id.toLowerCase())
        );
      }
      if (title) {
        list = list.filter((f) => f.title.toLowerCase().includes(title));
      }
      if (severity) {
        list = list.filter((f) => f.severity.toLowerCase() === severity);
      }
      if (status) {
        list = list.filter((f) => f.status.toLowerCase().includes(status));
      }
      if (fix) {
        list = list.filter((f) => f.fix.toLowerCase().includes(fix));
      }
      if (rationale) {
        list = list.filter((f) => f.rationale.toLowerCase().includes(rationale));
      }
      if (what) {
        list = list.filter((f) => f.what.toLowerCase().includes(what));
      }
      if (before) {
        list = list.filter((f) => f.before.toLowerCase().includes(before));
      }
      if (after) {
        list = list.filter((f) => f.after.toLowerCase().includes(after));
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
