import { json, notFound, PUBLIC_CACHE } from "../../../../lib/http";
import { postBySlug, posts } from "../../../../lib/posts";
import { S } from "../../../../lib/sources";

export const dynamicParams = true;

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

/** One post with its body and resolved source records. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = postBySlug(slug);
  if (!p) return notFound("post");
  return json({ ...p, sources: p.sources.map((id) => S[id]) }, { cacheControl: PUBLIC_CACHE });
}
