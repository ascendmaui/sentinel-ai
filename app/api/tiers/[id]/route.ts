import { json, notFound, PUBLIC_CACHE } from "../../../../lib/http";
import { tiers, tierById } from "../../../../lib/tiers";

export const dynamicParams = true;

export function generateStaticParams() {
  return tiers.map((t) => ({ id: t.id }));
}

/** One service tier with detailed deliverables and fit criteria. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tier = tierById(id);
  if (!tier) return notFound("service tier");
  return json(tier, { cacheControl: PUBLIC_CACHE });
}
