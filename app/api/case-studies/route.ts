import { json, parseLimit, parseOffset, parseSearchQuery, parseSortOrder, PUBLIC_CACHE } from "../../../lib/http";
import { findingById, findings, remediation, severityCounts } from "../../../lib/caseStudies";

/** Remediation findings and case studies index as JSON. Supports optional ?id=, ?n=, ?num=, ?finding=, ?finding_id=, ?findingId=, ?case_study=, ?caseStudy=, ?cs=, ?f=, ?slug=, ?title=, ?severity=, ?sev=, ?status=, ?fix=, ?rationale=, ?what=, ?before=, ?after=, ?q=, ?order=, ?sort=, ?offset=, ?limit=, ?take=, and ?page= filters. */
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
        parseSearchQuery(url.searchParams, "num") ||
        parseSearchQuery(url.searchParams, "number") ||
        parseSearchQuery(url.searchParams, "finding") ||
        parseSearchQuery(url.searchParams, "finding_id") ||
        parseSearchQuery(url.searchParams, "findingId") ||
        parseSearchQuery(url.searchParams, "finding_no") ||
        parseSearchQuery(url.searchParams, "findingNo") ||
        parseSearchQuery(url.searchParams, "finding_slug") ||
        parseSearchQuery(url.searchParams, "findingSlug") ||
        parseSearchQuery(url.searchParams, "case_study") ||
        parseSearchQuery(url.searchParams, "caseStudy") ||
        parseSearchQuery(url.searchParams, "case_study_id") ||
        parseSearchQuery(url.searchParams, "caseStudyId") ||
        parseSearchQuery(url.searchParams, "cs") ||
        parseSearchQuery(url.searchParams, "cs_id") ||
        parseSearchQuery(url.searchParams, "csId") ||
        parseSearchQuery(url.searchParams, "f") ||
        parseSearchQuery(url.searchParams, "f_id") ||
        parseSearchQuery(url.searchParams, "fId") ||
        parseSearchQuery(url.searchParams, "slug");
      const title =
        parseSearchQuery(url.searchParams, "title") ||
        parseSearchQuery(url.searchParams, "name") ||
        parseSearchQuery(url.searchParams, "headline");
      const severity =
        parseSearchQuery(url.searchParams, "severity") ||
        parseSearchQuery(url.searchParams, "sev") ||
        parseSearchQuery(url.searchParams, "level") ||
        parseSearchQuery(url.searchParams, "priority");
      const status =
        parseSearchQuery(url.searchParams, "status") ||
        parseSearchQuery(url.searchParams, "state") ||
        parseSearchQuery(url.searchParams, "resolution");
      const fix =
        parseSearchQuery(url.searchParams, "fix") ||
        parseSearchQuery(url.searchParams, "remediation") ||
        parseSearchQuery(url.searchParams, "solution") ||
        parseSearchQuery(url.searchParams, "resolution_note");
      const rationale =
        parseSearchQuery(url.searchParams, "rationale") ||
        parseSearchQuery(url.searchParams, "reason") ||
        parseSearchQuery(url.searchParams, "justification");
      const what =
        parseSearchQuery(url.searchParams, "what") ||
        parseSearchQuery(url.searchParams, "summary") ||
        parseSearchQuery(url.searchParams, "description") ||
        parseSearchQuery(url.searchParams, "details");
      const before =
        parseSearchQuery(url.searchParams, "before") ||
        parseSearchQuery(url.searchParams, "prior") ||
        parseSearchQuery(url.searchParams, "original");
      const after =
        parseSearchQuery(url.searchParams, "after") ||
        parseSearchQuery(url.searchParams, "current") ||
        parseSearchQuery(url.searchParams, "remediated");
      const q = parseSearchQuery(url.searchParams);
      const limit = parseLimit(url.searchParams);
      const offset = parseOffset(url.searchParams, 10000, limit);
      const order = parseSortOrder(url.searchParams);

      if (id) {
        const matched = findingById(id);
        let cleanId = id.replace(/^\/+|\/+$/g, "").replace(/\.(html|json)$/, "");
        if (cleanId.startsWith("+") || cleanId.startsWith("#")) cleanId = cleanId.slice(1);
        if (cleanId.startsWith("fix-") || cleanId.startsWith("fix_")) cleanId = cleanId.slice(4);
        else if (cleanId.startsWith("fix") && /^\d+$/.test(cleanId.slice(3))) cleanId = cleanId.slice(3);
        else if (cleanId.startsWith("finding-") || cleanId.startsWith("finding_")) cleanId = cleanId.slice(8);
        else if (cleanId.startsWith("finding") && /^\d+$/.test(cleanId.slice(7))) cleanId = cleanId.slice(7);
        else if (cleanId.startsWith("case-study-") || cleanId.startsWith("case_study_")) cleanId = cleanId.slice(11);
        else if (cleanId.startsWith("casestudy") && /^\d+$/.test(cleanId.slice(9))) cleanId = cleanId.slice(9);
        else if (cleanId.startsWith("cs-") || cleanId.startsWith("cs_")) cleanId = cleanId.slice(3);
        else if (cleanId.startsWith("cs") && /^\d+$/.test(cleanId.slice(2))) cleanId = cleanId.slice(2);
        if (cleanId.startsWith("+") || cleanId.startsWith("#")) cleanId = cleanId.slice(1);
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
