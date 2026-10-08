import { json, notFound, PUBLIC_CACHE } from "../../../../lib/http";
import { findings, findingById } from "../../../../lib/caseStudies";

export const dynamicParams = true;

export function generateStaticParams() {
  return findings.map((f) => ({ id: f.id.toLowerCase() }));
}

/** One case study finding with before/after analysis and remediation details. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const finding = findingById(id);
  if (!finding) return notFound("case study finding");
  return json(finding, { cacheControl: PUBLIC_CACHE });
}
