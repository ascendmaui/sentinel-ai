import { json, PUBLIC_CACHE } from "../../../lib/http";
import { findings, remediation, severityCounts } from "../../../lib/caseStudies";

/** Remediation findings and case studies index as JSON. */
export function GET() {
  return json(
    {
      count: findings.length,
      severityCounts,
      findings: findings.map((f) => ({
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
