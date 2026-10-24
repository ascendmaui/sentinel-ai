import { json, notFound, PUBLIC_CACHE } from "../../../../lib/http";
import { sources, sourceById } from "../../../../lib/sources";

export const dynamicParams = true;

export function generateStaticParams() {
  return sources.map((s) => ({ id: s.id }));
}

/** One research source with URL, publication date, and credibility note. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id = "" } = (await ctx?.params) ?? {};
  const source = sourceById(id);
  if (!source) return notFound("source");
  return json(source, { cacheControl: PUBLIC_CACHE });
}
