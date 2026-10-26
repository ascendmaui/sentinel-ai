import { json, parseLimit, parseOffset, parseSearchQuery, parseSortOrder, PUBLIC_CACHE } from "../../../lib/http";
import { postBySlug, posts, postWords } from "../../../lib/posts";

/** Blog index as JSON: post metadata only (no body). Newest first by default. Supports ?slug=, ?id=, ?n=, ?post=, ?post_id=, ?postId=, ?article=, ?article_id=, ?articleId=, ?title=, ?tier=, ?source=, ?source_id=, ?sourceId=, ?src=, ?ref=, ?year=, ?date=, ?readMins=, ?read_mins=, ?read_time=, ?q=, ?order=, ?offset=, ?limit=, and ?page=. */
export function GET(): Response;
export function GET(req: Request): Response;
export function GET(req?: Request): Response {
  let list = [...posts];

  if (req?.url) {
    try {
      const url = new URL(req.url, "http://localhost");
      const slug =
        parseSearchQuery(url.searchParams, "slug") ||
        parseSearchQuery(url.searchParams, "id") ||
        parseSearchQuery(url.searchParams, "n") ||
        parseSearchQuery(url.searchParams, "post") ||
        parseSearchQuery(url.searchParams, "post_id") ||
        parseSearchQuery(url.searchParams, "postId") ||
        parseSearchQuery(url.searchParams, "article") ||
        parseSearchQuery(url.searchParams, "article_id") ||
        parseSearchQuery(url.searchParams, "articleId");
      const title = parseSearchQuery(url.searchParams, "title");
      const tier = parseSearchQuery(url.searchParams, "tier");
      const source =
        parseSearchQuery(url.searchParams, "source") ||
        parseSearchQuery(url.searchParams, "source_id") ||
        parseSearchQuery(url.searchParams, "sourceId") ||
        parseSearchQuery(url.searchParams, "src") ||
        parseSearchQuery(url.searchParams, "src_id") ||
        parseSearchQuery(url.searchParams, "ref");
      const year = parseSearchQuery(url.searchParams, "year") || parseSearchQuery(url.searchParams, "date");
      const q = parseSearchQuery(url.searchParams);
      const readMinsParam = (
        url.searchParams.get("readMins") ??
        url.searchParams.get("mins") ??
        url.searchParams.get("read_mins") ??
        url.searchParams.get("read_time") ??
        url.searchParams.get("readTime") ??
        url.searchParams.get("reading_time") ??
        url.searchParams.get("readingTime") ??
        url.searchParams.get("reading_mins") ??
        url.searchParams.get("readingMins")
      )?.trim();
      const readMins = readMinsParam && /^\+?\d+$/.test(readMinsParam) ? Number(readMinsParam) : undefined;
      const limit = parseLimit(url.searchParams);
      const offset = parseOffset(url.searchParams, 10000, limit);
      const order = parseSortOrder(url.searchParams);

      if (slug) {
        const matched = postBySlug(slug);
        const cleanSlug = slug.replace(/^\/+|\/+$/g, "");
        const withoutExt = cleanSlug.replace(/\.(html|json)$/, "");
        list = list.filter(
          (p) =>
            p.slug.toLowerCase() === slug ||
            p.slug.toLowerCase() === cleanSlug ||
            p.slug.toLowerCase() === withoutExt ||
            (matched && p.slug.toLowerCase() === matched.slug.toLowerCase())
        );
      }

      if (tier) {
        const cleanTier = tier.replace(/^(tier[-_]|\+)/, "");
        list = list.filter(
          (p) => p.tier.toLowerCase() === tier || (cleanTier && p.tier.toLowerCase() === cleanTier)
        );
      }
      if (source) {
        const cleanSource = source.replace(/^(source|src)[-_]/, "").replace(/\.(html|json)$/, "");
        list = list.filter(
          (p) =>
            p.sources.some(
              (s) => s.toLowerCase() === source || (cleanSource && s.toLowerCase() === cleanSource)
            )
        );
      }
      if (title) {
        list = list.filter((p) => p.title.toLowerCase().includes(title));
      }
      if (year) {
        list = list.filter((p) => p.date.toLowerCase().includes(year));
      }
      if (readMins !== undefined) {
        list = list.filter((p) => p.readMins === readMins);
      }
      if (q) {
        list = list.filter(
          (p) =>
            p.slug.toLowerCase().includes(q) ||
            p.title.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.ctaLead.toLowerCase().includes(q) ||
            p.date.toLowerCase().includes(q) ||
            p.tier.toLowerCase().includes(q) ||
            p.sources.some((s) => s.toLowerCase().includes(q))
        );
      }

      if (order === "asc") {
        list.sort((a, b) => a.date.localeCompare(b.date));
      } else {
        list.sort((a, b) => b.date.localeCompare(a.date));
      }

      if (offset && offset > 0) {
        list = list.slice(offset);
      }
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
