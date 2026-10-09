import { json, PUBLIC_CACHE } from "../../../lib/http";
import { findings, remediation, severityCounts } from "../../../lib/caseStudies";

/** Remediation findings and case studies index as JSON. Supports optional ?severity=, ?status=, and ?q= filters. */
export function GET(): Response;
export function GET(req: Request): Response;
export function GET(req?: Request): Response {
  let list = findings;
  if (req?.url) {
    try {
      const url = new URL(req.url);
      const severity = url.searchParams.get("severity");
      const status = url.searchParams.get("status");
      const q = url.searchParams.get("q");
      const limitStr = url.searchParams.get("limit");

      if (severity) {
        const targetSev = severity.trim().toLowerCase();
        if (targetSev.length > 0) {
          list = list.filter((f) => f.severity.toLowerCase() === targetSev);
        }
      }
      if (status) {
        const targetStatus = status.trim().toLowerCase();
        if (targetStatus.length > 0) {
          list = list.filter((f) => f.status.toLowerCase().includes(targetStatus));
        }
      }
      if (q) {
        const targetQ = q.trim().toLowerCase();
        if (targetQ.length > 0) {
          list = list.filter(
            (f) =>
              f.id.toLowerCase().includes(targetQ) ||
              f.title.toLowerCase().includes(targetQ) ||
              f.rationale.toLowerCase().includes(targetQ) ||
              f.fix.toLowerCase().includes(targetQ)
          );
        }
      }
      if (limitStr) {
        const limit = parseInt(limitStr, 10);
        if (!isNaN(limit) && limit > 0) {
          list = list.slice(0, limit);
        }
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
