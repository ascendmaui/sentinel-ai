import { json, notFound, PUBLIC_CACHE } from "../../../../lib/http";
import { incidents, incidentById } from "../../../../lib/incidents";
import { S } from "../../../../lib/sources";

export const dynamicParams = true;

export function generateStaticParams() {
  return incidents.map((i) => ({ id: i.id }));
}

/** One incident with its full timeline, breakdown, and resolved source records. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inc = incidentById(id);
  if (!inc) return notFound("incident");
  const sources = inc.sources.map((srcId) => S[srcId]).filter(Boolean);
  return json({ ...inc, sources }, { cacheControl: PUBLIC_CACHE });
}
