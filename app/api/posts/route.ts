import { json, PUBLIC_CACHE } from "../../../lib/http";
import { posts, postWords } from "../../../lib/posts";

/** Blog index as JSON: post metadata only (no body). Newest first. Supports ?tier=, ?q=, and ?limit=. */
export function GET(): Response;
export function GET(req: Request): Response;
export function GET(req?: Request): Response {
  let list = [...posts];

  if (req?.url) {
    try {
      const url = new URL(req.url);
      const tier = url.searchParams.get("tier");
      const q = url.searchParams.get("q");
      const limitStr = url.searchParams.get("limit");

      if (tier) {
        const targetTier = tier.trim().toLowerCase();
        list = list.filter((p) => p.tier.toLowerCase() === targetTier);
      }
      if (q) {
        const targetQ = q.trim().toLowerCase();
        if (targetQ.length > 0) {
          list = list.filter(
            (p) =>
              p.slug.toLowerCase().includes(targetQ) ||
              p.title.toLowerCase().includes(targetQ) ||
              p.description.toLowerCase().includes(targetQ)
          );
        }
      }

      list.sort((a, b) => b.date.localeCompare(a.date));

      if (limitStr) {
        const limit = parseInt(limitStr, 10);
        if (!isNaN(limit) && limit > 0) {
          list = list.slice(0, limit);
        }
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
