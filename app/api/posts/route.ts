import { json, parseLimit, parseSearchQuery, PUBLIC_CACHE } from "../../../lib/http";
import { posts, postWords } from "../../../lib/posts";

/** Blog index as JSON: post metadata only (no body). Newest first. Supports ?tier=, ?q=, and ?limit=. */
export function GET(): Response;
export function GET(req: Request): Response;
export function GET(req?: Request): Response {
  let list = [...posts];

  if (req?.url) {
    try {
      const url = new URL(req.url);
      const tier = parseSearchQuery(url.searchParams, "tier");
      const q = parseSearchQuery(url.searchParams);
      const limit = parseLimit(url.searchParams);

      if (tier) {
        list = list.filter((p) => p.tier.toLowerCase() === tier);
      }
      if (q) {
        list = list.filter(
          (p) =>
            p.slug.toLowerCase().includes(q) ||
            p.title.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q)
        );
      }

      list.sort((a, b) => b.date.localeCompare(a.date));

      if (limit) {
        list = list.slice(0, limit);
      }
    } catch {
      list.sort((a, b) => b.date.localeCompare(a.date));
    }
  } else {
    list.sort((a, b) => b.date.localeCompare(a.date));
  }

  const items = list.map((p) => ({
    slug: p.slug,
    title: p.title,
    description: p.description,
    date: p.date,
    readMins: p.readMins,
    tier: p.tier,
    words: postWords(p),
    url: `/blog/${p.slug}`,
  }));

  return json({ count: items.length, totalCount: posts.length, posts: items }, { cacheControl: PUBLIC_CACHE });
}
