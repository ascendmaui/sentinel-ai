import { getFirstParam, json, parseLimit, parseOffset, parseSearchQuery, parseSortOrder, PUBLIC_CACHE } from "../../../lib/http";
import { postBySlug, posts, postWords } from "../../../lib/posts";
import { sourceById } from "../../../lib/sources";
import { tierById } from "../../../lib/tiers";

/** Blog index as JSON: post metadata only (no body). Newest first by default. Supports ?slug=, ?id=, ?n=, ?num=, ?post=, ?post_id=, ?postId=, ?post_slug=, ?postSlug=, ?article=, ?article_id=, ?articleId=, ?title=, ?tier=, ?service_tier=, ?source=, ?source_id=, ?sourceId=, ?src=, ?ref=, ?reference=, ?year=, ?date=, ?description=, ?summary=, ?lead=, ?readMins=, ?mins=, ?min=, ?read_mins=, ?read_time=, ?reading_time=, ?q=, ?order=, ?sort=, ?offset=, ?limit=, ?take=, and ?page=. */
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
        parseSearchQuery(url.searchParams, "num") ||
        parseSearchQuery(url.searchParams, "number") ||
        parseSearchQuery(url.searchParams, "post") ||
        parseSearchQuery(url.searchParams, "post_id") ||
        parseSearchQuery(url.searchParams, "postId") ||
        parseSearchQuery(url.searchParams, "post_slug") ||
        parseSearchQuery(url.searchParams, "postSlug") ||
        parseSearchQuery(url.searchParams, "article") ||
        parseSearchQuery(url.searchParams, "article_id") ||
        parseSearchQuery(url.searchParams, "articleId") ||
        parseSearchQuery(url.searchParams, "article_slug") ||
        parseSearchQuery(url.searchParams, "articleSlug") ||
        parseSearchQuery(url.searchParams, "blog") ||
        parseSearchQuery(url.searchParams, "blog_id") ||
        parseSearchQuery(url.searchParams, "blogId") ||
        parseSearchQuery(url.searchParams, "blog_slug") ||
        parseSearchQuery(url.searchParams, "blogSlug");
      const title =
        parseSearchQuery(url.searchParams, "title") ||
        parseSearchQuery(url.searchParams, "name") ||
        parseSearchQuery(url.searchParams, "headline") ||
        parseSearchQuery(url.searchParams, "post_title") ||
        parseSearchQuery(url.searchParams, "postTitle");
      const tier =
        parseSearchQuery(url.searchParams, "tier") ||
        parseSearchQuery(url.searchParams, "service_tier") ||
        parseSearchQuery(url.searchParams, "serviceTier");
      const source =
        parseSearchQuery(url.searchParams, "source") ||
        parseSearchQuery(url.searchParams, "source_id") ||
        parseSearchQuery(url.searchParams, "sourceId") ||
        parseSearchQuery(url.searchParams, "source_slug") ||
        parseSearchQuery(url.searchParams, "src") ||
        parseSearchQuery(url.searchParams, "src_id") ||
        parseSearchQuery(url.searchParams, "srcId") ||
        parseSearchQuery(url.searchParams, "ref") ||
        parseSearchQuery(url.searchParams, "reference");
      const year = parseSearchQuery(url.searchParams, "year") || parseSearchQuery(url.searchParams, "date");
      const desc =
        parseSearchQuery(url.searchParams, "description") ||
        parseSearchQuery(url.searchParams, "summary") ||
        parseSearchQuery(url.searchParams, "lead") ||
        parseSearchQuery(url.searchParams, "subtitle");
      const q = parseSearchQuery(url.searchParams);
      const readMinsParam = getFirstParam(
        url.searchParams,
        "readMins",
        "mins",
        "min",
        "minute",
        "minutes",
        "read_mins",
        "read_time",
        "readTime",
        "reading_time",
        "readingTime",
        "reading_mins",
        "readingMins"
      );
      const readMins = readMinsParam && /^\+?\d+$/.test(readMinsParam) ? Number(readMinsParam) : undefined;
      const limit = parseLimit(url.searchParams);
      const offset = parseOffset(url.searchParams, 10000, limit);
      const order = parseSortOrder(url.searchParams);

      if (slug) {
        const matched = postBySlug(slug);
        let cleanSlug = slug.replace(/^\/+|\/+$/g, "");
        cleanSlug = cleanSlug.replace(/^[#+]+/, "").replace(/[#+]+$/, "");
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
        const matchedTier = tierById(tier);
        let cleanTier = tier.replace(/^\/+|\/+$/g, "").replace(/\.(html|json)$/, "");
        cleanTier = cleanTier.replace(/^[#+]+/, "").replace(/[#+]+$/, "");
        cleanTier = cleanTier.replace(/^(tier|rank|r|t)[-_]?/, "");
        cleanTier = cleanTier.replace(/^[#+]+/, "").replace(/[#+]+$/, "");
        list = list.filter(
          (p) =>
            p.tier.toLowerCase() === tier ||
            (cleanTier && p.tier.toLowerCase() === cleanTier) ||
            (matchedTier && p.tier.toLowerCase() === matchedTier.id.toLowerCase())
        );
      }
      if (source) {
        const matchedSource = sourceById(source);
        let cleanSource = source.replace(/^\/+|\/+$/g, "").replace(/\.(html|json)$/, "");
        cleanSource = cleanSource.replace(/^[#+]+/, "").replace(/[#+]+$/, "");
        cleanSource = cleanSource.replace(/^(source|src|ref|reference)[-_]/, "");
        cleanSource = cleanSource.replace(/^[#+]+/, "").replace(/[#+]+$/, "");
        list = list.filter(
          (p) =>
            p.sources.some(
              (s) =>
                s.toLowerCase() === source ||
                s.toLowerCase() === cleanSource ||
                (cleanSource && s.toLowerCase().includes(cleanSource)) ||
                (matchedSource && s.toLowerCase() === matchedSource.id.toLowerCase())
            )
        );
      }
      if (title) {
        list = list.filter((p) => p.title.toLowerCase().includes(title));
      }
      if (desc) {
        list = list.filter((p) => p.description.toLowerCase().includes(desc) || p.ctaLead.toLowerCase().includes(desc));
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
