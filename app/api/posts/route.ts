import { json, PUBLIC_CACHE } from "../../../lib/http";
import { posts, postWords } from "../../../lib/posts";

/** Blog index as JSON: post metadata only (no body). Newest first. */
export function GET() {
  const items = [...posts]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      description: p.description,
      date: p.date,
      readMins: p.readMins,
      tier: p.tier,
      words: postWords(p),
      url: `/blog/${p.slug}`,
    }));
  return json({ count: items.length, posts: items }, { cacheControl: PUBLIC_CACHE });
}
