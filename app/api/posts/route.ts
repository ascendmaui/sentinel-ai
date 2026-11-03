import { getFirstParam, json, parseLimit, parseNumberParam, parseOffset, parseSearchQuery, parseSortOrder, PUBLIC_CACHE } from "../../../lib/http";
import { postBySlug, posts, postWords } from "../../../lib/posts";
import { sourceById } from "../../../lib/sources";
import { tierById } from "../../../lib/tiers";

/** Blog index as JSON: post metadata only (no body). Newest first by default. Supports ?slug=, ?id=, ?n=, ?num=, ?post=, ?post_id=, ?postId=, ?post_slug=, ?postSlug=, ?article=, ?article_id=, ?articleId=, ?title=, ?tier=, ?service_tier=, ?source=, ?source_id=, ?sourceId=, ?src=, ?ref=, ?reference=, ?year=, ?date=, ?description=, ?summary=, ?lead=, ?content=, ?body=, ?section=, ?readMins=, ?mins=, ?min=, ?minMins=, ?maxMins=, ?q=, ?order=, ?sort=, ?offset=, ?limit=, ?take=, and ?page=. */
export function GET(): Response;
export function GET(req: Request): Response;
export function GET(req?: Request): Response {
  let list = [...posts];

  if (req?.url) {
    try {
      const url = new URL(req.url, "http://localhost");
      const slug = parseSearchQuery(
        url.searchParams,
        "slug",
        "id",
        "n",
        "num",
        "number",
        "post",
        "post_id",
        "postId",
        "post_slug",
        "postSlug",
        "article",
        "article_id",
        "articleId",
        "article_slug",
        "articleSlug",
        "blog",
        "blog_id",
        "blogId",
        "blog_slug",
        "blogSlug"
      );
      const title = parseSearchQuery(url.searchParams, "title", "name", "headline", "post_title", "postTitle");
      const tier = parseSearchQuery(url.searchParams, "tier", "service_tier", "serviceTier", "plan", "service");
      const source = parseSearchQuery(
        url.searchParams,
        "source",
        "source_id",
        "sourceId",
        "source_slug",
        "src",
        "src_id",
        "srcId",
        "ref",
        "ref_id",
        "refId",
        "reference"
      );
      const year = parseSearchQuery(url.searchParams, "year", "date", "timeframe", "published");
      const desc = parseSearchQuery(
        url.searchParams,
        "description",
        "summary",
        "lead",
        "subtitle",
        "desc",
        "intro"
      );
      const content = parseSearchQuery(
        url.searchParams,
        "content",
        "body",
        "section",
        "heading",
        "paragraph",
        "text_content",
        "textContent"
      );
      const q = parseSearchQuery(url.searchParams);
      const readMins = parseNumberParam(
        url.searchParams,
        [
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
          "readingMins",
        ],
        { min: 1, stripSuffix: /\s*(?:mins?|minutes?|m)$/i }
      );

      const minMins = parseNumberParam(
        url.searchParams,
        [
          "minMins",
          "min_mins",
          "min_read_mins",
          "minReadMins",
          "min_read_time",
          "minReadTime",
          "min_time",
          "minTime",
        ],
        { min: 0, stripSuffix: /\s*(?:mins?|minutes?|m)$/i }
      );

      const maxMins = parseNumberParam(
        url.searchParams,
        [
          "maxMins",
          "max_mins",
          "max_read_mins",
          "maxReadMins",
          "max_read_time",
          "maxReadTime",
          "max_time",
          "maxTime",
        ],
        { min: 0, stripSuffix: /\s*(?:mins?|minutes?|m)$/i }
      );

      const limit = parseLimit(url.searchParams);
      const offset = parseOffset(url.searchParams, 10000, limit);
      const order = parseSortOrder(url.searchParams);

      if (slug) {
        const matched = postBySlug(slug);
        let cleanSlug = slug.replace(/^\/+|\/+$/g, "");
        cleanSlug = cleanSlug.replace(/^[#+]+/, "").replace(/[#+]+$/, "");
        cleanSlug = cleanSlug.replace(/^(?:(?:api\/)?(?:posts|post|blog[-_]posts|blog[-_]post|blog|article|articles)\/)+/, "");
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
        cleanTier = cleanTier.replace(/^(?:(?:api\/)?(?:tiers|tier|service[-_]tiers|service[-_]tier|services|service|pricing[-_]tiers|pricing[-_]tier|pricing|plans|plan)\/)+/, "");
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
        cleanSource = cleanSource.replace(/^(?:(?:api\/)?(?:sources|source|refs|ref|references|reference)\/)+/, "");
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
      if (minMins !== undefined) {
        list = list.filter((p) => p.readMins >= minMins);
      }
      if (maxMins !== undefined) {
        list = list.filter((p) => p.readMins <= maxMins);
      }
      if (content) {
        list = list.filter((p) =>
          p.body.some((b) => {
            const text = Array.isArray(b.x) ? b.x.join(" ") : (b.x ?? "");
            return text.toLowerCase().includes(content);
          })
        );
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
