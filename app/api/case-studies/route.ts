import { json, parseLimit, parseOffset, parseSearchQuery, parseSortOrder, PUBLIC_CACHE } from "../../../lib/http";
import { findingById, findings, remediation, remediationById, severityCounts } from "../../../lib/caseStudies";

/** Remediation findings and case studies index as JSON. Supports optional ?id=, ?n=, ?num=, ?finding=, ?finding_id=, ?findingId=, ?case_study=, ?caseStudy=, ?cs=, ?f=, ?slug=, ?title=, ?severity=, ?sev=, ?status=, ?fix=, ?rationale=, ?what=, ?before=, ?after=, ?changed=, ?checked=, ?found=, ?q=, ?order=, ?sort=, ?offset=, ?limit=, ?take=, and ?page= filters. */
export function GET(): Response;
export function GET(req: Request): Response;
export function GET(req?: Request): Response {
  let list = findings;
  if (req?.url) {
    try {
      const url = new URL(req.url, "http://localhost");
      const id = parseSearchQuery(
        url.searchParams,
        "id",
        "n",
        "num",
        "number",
        "finding",
        "finding_id",
        "findingId",
        "finding_no",
        "findingNo",
        "finding_slug",
        "findingSlug",
        "case_study",
        "caseStudy",
        "case_study_id",
        "caseStudyId",
        "cs",
        "cs_id",
        "csId",
        "f",
        "f_id",
        "fId",
        "rem",
        "rem_id",
        "remediation",
        "remediation_id",
        "slug"
      );
      const title = parseSearchQuery(url.searchParams, "title", "name", "headline");
      const severity = parseSearchQuery(
        url.searchParams,
        "severity",
        "sev",
        "level",
        "priority"
      );
      const status = parseSearchQuery(
        url.searchParams,
        "status",
        "state",
        "resolution"
      );
      const fix = parseSearchQuery(
        url.searchParams,
        "fix",
        "remediation",
        "solution",
        "resolution_note"
      );
      const rationale = parseSearchQuery(
        url.searchParams,
        "rationale",
        "reason",
        "justification"
      );
      const what = parseSearchQuery(
        url.searchParams,
        "what",
        "summary",
        "description",
        "details"
      );
      const before = parseSearchQuery(
        url.searchParams,
        "before",
        "prior",
        "original"
      );
      const after = parseSearchQuery(
        url.searchParams,
        "after",
        "current",
        "remediated"
      );
      const changed = parseSearchQuery(
        url.searchParams,
        "changed",
        "change",
        "diff",
        "modification",
        "patch"
      );
      const checked = parseSearchQuery(
        url.searchParams,
        "checked",
        "check",
        "verified",
        "verification",
        "tested",
        "test"
      );
      const found = parseSearchQuery(
        url.searchParams,
        "found",
        "issue",
        "defect",
        "discovery"
      );
      const q = parseSearchQuery(url.searchParams);
      const limit = parseLimit(url.searchParams);
      const offset = parseOffset(url.searchParams, 10000, limit);
      const order = parseSortOrder(url.searchParams);

      if (id) {
        const matched = findingById(id);
        let cleanId = id.replace(/^\/+|\/+$/g, "").replace(/\.(html|json)$/, "");
        cleanId = cleanId.replace(/^[#+]+/, "").replace(/[#+]+$/, "");
        if (cleanId.startsWith("fix-") || cleanId.startsWith("fix_")) cleanId = cleanId.slice(4);
        else if (cleanId.startsWith("fix") && /^\d+$/.test(cleanId.slice(3))) cleanId = cleanId.slice(3);
        else if (cleanId.startsWith("finding-") || cleanId.startsWith("finding_")) cleanId = cleanId.slice(8);
        else if (cleanId.startsWith("finding") && /^\d+$/.test(cleanId.slice(7))) cleanId = cleanId.slice(7);
        else if (cleanId.startsWith("case-study-") || cleanId.startsWith("case_study_")) cleanId = cleanId.slice(11);
        else if (cleanId.startsWith("casestudy") && /^\d+$/.test(cleanId.slice(9))) cleanId = cleanId.slice(9);
        else if (cleanId.startsWith("case-") || cleanId.startsWith("case_")) cleanId = cleanId.slice(5);
        else if (cleanId.startsWith("case") && /^\d+$/.test(cleanId.slice(4))) cleanId = cleanId.slice(4);
        else if (cleanId.startsWith("cs-") || cleanId.startsWith("cs_")) cleanId = cleanId.slice(3);
        else if (cleanId.startsWith("cs") && /^\d+$/.test(cleanId.slice(2))) cleanId = cleanId.slice(2);
        cleanId = cleanId.replace(/^[#+]+/, "").replace(/[#+]+$/, "");
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
        let cleanSev = severity.replace(/^\/+|\/+$/g, "");
        cleanSev = cleanSev.replace(/^[#+]+/, "").replace(/[#+]+$/, "");
        list = list.filter(
          (f) =>
            f.severity.toLowerCase() === severity ||
            f.severity.toLowerCase() === cleanSev ||
            f.severity.toLowerCase().startsWith(cleanSev)
        );
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
      if (changed) {
        list = list.filter((f) => {
          const rem = remediationById(f.id);
          return rem?.changed.toLowerCase().includes(changed);
        });
      }
      if (checked) {
        list = list.filter((f) => {
          const rem = remediationById(f.id);
          return rem?.checked.toLowerCase().includes(checked);
        });
      }
      if (found) {
        list = list.filter((f) => {
          const rem = remediationById(f.id);
          return f.what.toLowerCase().includes(found) || (rem?.found && rem.found.toLowerCase().includes(found));
        });
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
