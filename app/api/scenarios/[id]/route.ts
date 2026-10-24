import { json, notFound, PUBLIC_CACHE } from "../../../../lib/http";
import { scenarios, scenarioById } from "../../../../lib/incidents";
import { sourceById } from "../../../../lib/sources";

export const dynamicParams = true;

export function generateStaticParams() {
  return scenarios.map((s) => ({ id: s.id }));
}

/** One hypothetical scenario with attack approach, defender-side controls, and resolved references. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id = "" } = (await ctx?.params) ?? {};
  const scenario = scenarioById(id);
  if (!scenario) return notFound("scenario");
  const refs = scenario.refs.map((refId) => sourceById(refId)).filter(Boolean);
  return json({ ...scenario, refs }, { cacheControl: PUBLIC_CACHE });
}
