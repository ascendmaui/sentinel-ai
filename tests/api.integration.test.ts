import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as health } from "../app/api/health/route";
import { GET as postsIndex } from "../app/api/posts/route";
import { GET as postOne, generateStaticParams as postParams } from "../app/api/posts/[slug]/route";
import { GET as incidentsIndex } from "../app/api/incidents/route";
import { GET as incidentOne, generateStaticParams as incidentParams } from "../app/api/incidents/[id]/route";
import { GET as caseStudiesIndex } from "../app/api/case-studies/route";
import { GET as caseStudyOne, generateStaticParams as caseStudyParams } from "../app/api/case-studies/[id]/route";
import { GET as tiersIndex } from "../app/api/tiers/route";
import { GET as tierOne, generateStaticParams as tierParams } from "../app/api/tiers/[id]/route";
import { GET as scenariosIndex } from "../app/api/scenarios/route";
import { GET as scenarioOne, generateStaticParams as scenarioParams } from "../app/api/scenarios/[id]/route";
import { GET as sourcesIndex } from "../app/api/sources/route";
import { GET as sourceOne, generateStaticParams as sourceParams } from "../app/api/sources/[id]/route";
import { GET as brandEndpoint } from "../app/api/brand/route";
import { badgeByKey, BRAND_EMAIL, BRAND_MAIL, BRAND_NAME, BRAND_PARENT, BRAND_SUFFIX, BRAND_TAGLINE, BRAND_WORD, SHOW_CODE_RAIN, SITE_URL, TRUE_BADGES } from "../lib/brand";
import { THEME_META, THEME_NAMES } from "../lib/theme";
import * as postsModule from "../lib/posts";
import { postBySlug, posts } from "../lib/posts";
import * as incidentsModule from "../lib/incidents";
import { incidentById, incidents, scenarioById, scenarios } from "../lib/incidents";
import * as caseStudiesModule from "../lib/caseStudies";
import { findingById, findings, remediationById } from "../lib/caseStudies";
import { tierById, tiers } from "../lib/tiers";
import { S, sourceById, sources } from "../lib/sources";
import { badRequest, json, methodNotAllowed, notFound, parseLimit, parseOffset, parsePage, parseSearchQuery, parseSortOrder, SECURITY_HEADERS } from "../lib/http";

const slugCtx = (slug: string) => ({ params: Promise.resolve({ slug }) });
const idCtx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (path: string) => new Request(`http://localhost${path}`);

afterEach(() => vi.unstubAllEnvs());

describe("GET /api/health", () => {
  it("returns ok JSON, uncached, with hardening headers", async () => {
    const res = health();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
    expect(res.headers.get("permissions-policy")).toContain("camera=()");
    expect(res.headers.get("x-dns-prefetch-control")).toBe("off");
    const body = await res.json();
    expect(body).toMatchObject({ status: "ok", service: BRAND_NAME });
    expect(new Date(body.timestamp).getTime()).not.toBeNaN();
  });

  it("exposes only a short public commit SHA and never other env", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "0123456789abcdef0123456789abcdef01234567");
    vi.stubEnv("SUPER_SECRET_TOKEN", "do-not-leak");
    const text = await health().text();
    const body = JSON.parse(text);
    expect(body.environment).toBe("preview");
    expect(body.commit).toBe("0123456");
    expect(text).not.toContain("do-not-leak");
  });

  it("reports null commit when not on Vercel", async () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "");
    expect((await health().json()).commit).toBeNull();
  });

  it("defaults to local environment and handles short or whitespace-padded commit hashes", async () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "abcde");
    const body = await health().json();
    expect(body.environment).toBe("local");
    expect(body.commit).toBe("abcde");

    vi.stubEnv("VERCEL_ENV", "   ");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "   ");
    const wsBody = await health().json();
    expect(wsBody.environment).toBe("local");
    expect(wsBody.commit).toBeNull();

    vi.stubEnv("VERCEL_ENV", "  production  ");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "  9876543210abcdef  ");
    const paddedBody = await health().json();
    expect(paddedBody.environment).toBe("production");
    expect(paddedBody.commit).toBe("9876543");
  });
});

describe("GET /api/posts", () => {
  it("lists metadata only, newest first, with cache headers", async () => {
    const res = postsIndex();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("s-maxage");
    const body = await res.json();
    expect(body.count).toBe(posts.length);
    expect(body.posts).toHaveLength(posts.length);
    const dates: string[] = body.posts.map((p: { date: string }) => p.date);
    expect(dates).toEqual([...dates].sort().reverse());
    for (const p of body.posts) {
      expect(p).not.toHaveProperty("body");
      expect(p.url).toBe(`/blog/${p.slug}`);
      expect(p.words).toBeGreaterThan(0);
    }
  });

  it("does not mutate the shared posts array when sorting", () => {
    const before = posts.map((p) => p.slug);
    postsIndex();
    expect(posts.map((p) => p.slug)).toEqual(before);
  });

  it("filters by tier query parameter", async () => {
    const res = postsIndex(req("/api/posts?tier=seraphim"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.posts.every((p: { tier: string }) => p.tier === "seraphim")).toBe(true);
    expect(body.count).toBe(body.posts.length);
    expect(body.totalCount).toBe(posts.length);
  });

  it("filters by search query parameter q across title, description, ctaLead, and date", async () => {
    const res = postsIndex(req("/api/posts?q=hugging"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBeGreaterThan(0);
    for (const p of body.posts) {
      const match =
        p.title.toLowerCase().includes("hugging") || p.description.toLowerCase().includes("hugging");
      expect(match).toBe(true);
    }

    // Search in post ctaLead
    const ctaRes = postsIndex(req("/api/posts?q=email%20change%20reports"));
    expect(ctaRes.status).toBe(200);
    const ctaJson = await ctaRes.json();
    expect(ctaJson.count).toBe(1);
    expect(ctaJson.posts[0].slug).toBe("defending-against-agent-speed-attacks");

    // Search in post date
    const dateRes = postsIndex(req("/api/posts?q=2026-09-29"));
    expect(dateRes.status).toBe(200);
    const dateJson = await dateRes.json();
    expect(dateJson.count).toBe(posts.length);
  });

  it("limits result count using limit query parameter", async () => {
    const res = postsIndex(req("/api/posts?limit=2"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.posts).toHaveLength(2);
    expect(body.count).toBe(2);
    expect(body.totalCount).toBe(posts.length);
  });

  it("handles whitespace search query and invalid limits gracefully", async () => {
    const spaceRes = postsIndex(req("/api/posts?q=%20%20%20"));
    expect(spaceRes.status).toBe(200);
    expect((await spaceRes.json()).count).toBe(posts.length);

    const invalidLimitRes = postsIndex(req("/api/posts?limit=-5"));
    expect(invalidLimitRes.status).toBe(200);
    expect((await invalidLimitRes.json()).count).toBe(posts.length);

    const nonNumLimitRes = postsIndex(req("/api/posts?limit=abc"));
    expect(nonNumLimitRes.status).toBe(200);
    expect((await nonNumLimitRes.json()).count).toBe(posts.length);
  });

  it("ignores partial-numeric limits instead of truncating them (1e3, 1.9, 1abc)", async () => {
    for (const bad of ["1e3", "1.9", "1abc", "0x2", "%201%202"]) {
      const res = postsIndex(req(`/api/posts?limit=${bad}`));
      expect(res.status).toBe(200);
      expect((await res.json()).count, `limit=${bad}`).toBe(posts.length);
    }
  });

  it("supports combined filters and handles whitespace or nonexistent tier query", async () => {
    const spaceTierRes = postsIndex(req("/api/posts?tier=%20SERAPHIM%20"));
    expect(spaceTierRes.status).toBe(200);
    const spaceTierBody = await spaceTierRes.json();
    expect(spaceTierBody.count).toBeGreaterThan(0);
    expect(spaceTierBody.posts.every((p: { tier: string }) => p.tier === "seraphim")).toBe(true);

    const noneTierRes = postsIndex(req("/api/posts?tier=nonexistent"));
    expect(noneTierRes.status).toBe(200);
    const noneTierBody = await noneTierRes.json();
    expect(noneTierBody.count).toBe(0);
    expect(noneTierBody.posts).toHaveLength(0);
    expect(noneTierBody.totalCount).toBe(posts.length);

    const combinedRes = postsIndex(req("/api/posts?tier=seraphim&q=openai&limit=1"));
    expect(combinedRes.status).toBe(200);
    const combinedBody = await combinedRes.json();
    expect(combinedBody.count).toBe(1);
    expect(combinedBody.posts[0].tier).toBe("seraphim");
    expect(combinedBody.totalCount).toBe(posts.length);

    const malformedReq = { url: "http://" } as unknown as Request;
    const fallbackRes = postsIndex(malformedReq);
    expect(fallbackRes.status).toBe(200);
    expect((await fallbackRes.json()).count).toBe(posts.length);
  });

  it("filters posts by publication year", async () => {
    const yearRes = postsIndex(req("/api/posts?year=2026"));
    expect(yearRes.status).toBe(200);
    const yearBody = await yearRes.json();
    expect(yearBody.count).toBe(posts.length);
    expect(yearBody.posts.every((p: { date: string }) => p.date.startsWith("2026"))).toBe(true);

    const noneRes = postsIndex(req("/api/posts?year=2024"));
    expect(noneRes.status).toBe(200);
    expect((await noneRes.json()).count).toBe(0);
  });

  it("filters posts by source reference ID", async () => {
    const srcRes = postsIndex(req("/api/posts?source=oaiAug"));
    expect(srcRes.status).toBe(200);
    const srcBody = await srcRes.json();
    expect(srcBody.count).toBeGreaterThan(0);

    const noneRes = postsIndex(req("/api/posts?source=nonexistent-src"));
    expect(noneRes.status).toBe(200);
    expect((await noneRes.json()).count).toBe(0);
  });

  it("supports offset and skip parameters and matches tier and sources in q search", async () => {
    const offRes = postsIndex(req("/api/posts?offset=1&limit=2"));
    expect(offRes.status).toBe(200);
    const offBody = await offRes.json();
    expect(offBody.count).toBe(2);
    expect(offBody.totalCount).toBe(posts.length);

    const skipRes = postsIndex(req("/api/posts?skip=2"));
    expect(skipRes.status).toBe(200);
    const skipBody = await skipRes.json();
    expect(skipBody.count).toBe(posts.length - 2);

    const tierQRes = postsIndex(req("/api/posts?q=cherubim"));
    expect(tierQRes.status).toBe(200);
    const tierQBody = await tierQRes.json();
    expect(tierQBody.count).toBeGreaterThan(0);
    expect(tierQBody.posts.some((p: { tier: string }) => p.tier === "cherubim")).toBe(true);

    const srcQRes = postsIndex(req("/api/posts?q=oaiAug"));
    expect(srcQRes.status).toBe(200);
    expect((await srcQRes.json()).count).toBeGreaterThan(0);
  });

  it("filters posts by slug or id parameter", async () => {
    const slugRes = postsIndex(req("/api/posts?slug=when-the-test-subject-leaves-the-test"));
    expect(slugRes.status).toBe(200);
    const slugBody = await slugRes.json();
    expect(slugBody.count).toBe(1);
    expect(slugBody.posts[0].slug).toBe("when-the-test-subject-leaves-the-test");

    const upperSlugRes = postsIndex(req("/api/posts?slug=WHEN-THE-TEST-SUBJECT-LEAVES-THE-TEST"));
    expect(upperSlugRes.status).toBe(200);
    expect((await upperSlugRes.json()).count).toBe(1);

    const slashSlugRes = postsIndex(req("/api/posts?slug=/when-the-test-subject-leaves-the-test/"));
    expect(slashSlugRes.status).toBe(200);
    expect((await slashSlugRes.json()).count).toBe(1);

    const idRes = postsIndex(req("/api/posts?id=when-the-test-subject-leaves-the-test"));
    expect(idRes.status).toBe(200);
    expect((await idRes.json()).count).toBe(1);

    const noneRes = postsIndex(req("/api/posts?slug=nonexistent-slug"));
    expect(noneRes.status).toBe(200);
    expect((await noneRes.json()).count).toBe(0);
  });

  it("supports order/sort ascending and descending, ref alias, and page-based pagination", async () => {
    const ascRes = postsIndex(req("/api/posts?order=asc"));
    expect(ascRes.status).toBe(200);
    const ascBody = await ascRes.json();
    const ascDates: string[] = ascBody.posts.map((p: { date: string }) => p.date);
    expect(ascDates).toEqual([...ascDates].sort());

    const descRes = postsIndex(req("/api/posts?order=desc"));
    expect(descRes.status).toBe(200);
    const descBody = await descRes.json();
    const descDates: string[] = descBody.posts.map((p: { date: string }) => p.date);
    expect(descDates).toEqual([...descDates].sort().reverse());

    const sortAliasRes = postsIndex(req("/api/posts?sort=oldest"));
    expect(sortAliasRes.status).toBe(200);
    expect((await sortAliasRes.json()).posts[0].date).toBe(ascBody.posts[0].date);

    const refRes = postsIndex(req("/api/posts?ref=oaiAug"));
    expect(refRes.status).toBe(200);
    expect((await refRes.json()).count).toBeGreaterThan(0);

    const page1Res = postsIndex(req("/api/posts?page=1&limit=2"));
    expect(page1Res.status).toBe(200);
    const page1Body = await page1Res.json();
    expect(page1Body.count).toBe(2);

    const page2Res = postsIndex(req("/api/posts?page=2&limit=2"));
    expect(page2Res.status).toBe(200);
    const page2Body = await page2Res.json();
    expect(page2Body.count).toBe(2);
    expect(page2Body.posts[0].slug).not.toBe(page1Body.posts[0].slug);

    const extRes = await postOne(req("/api/posts/when-the-test-subject-leaves-the-test.json"), slugCtx("when-the-test-subject-leaves-the-test.json"));
    expect(extRes.status).toBe(200);
    expect((await extRes.json()).slug).toBe("when-the-test-subject-leaves-the-test");

    const htmlRes = await postOne(req("/api/posts/when-the-test-subject-leaves-the-test.html"), slugCtx("when-the-test-subject-leaves-the-test.html"));
    expect(htmlRes.status).toBe(200);
    expect((await htmlRes.json()).slug).toBe("when-the-test-subject-leaves-the-test");
  });

  it("supports readMins, date alias, prefix-cleaned tier/source, query alias, direction sort, count limit, and start offset", async () => {
    const minsRes = postsIndex(req("/api/posts?readMins=8"));
    expect(minsRes.status).toBe(200);
    const minsBody = await minsRes.json();
    expect(minsBody.count).toBeGreaterThan(0);
    expect(minsBody.posts.every((p: { readMins: number }) => p.readMins === 8)).toBe(true);

    const minsAliasRes = postsIndex(req("/api/posts?mins=7"));
    expect(minsAliasRes.status).toBe(200);
    expect((await minsAliasRes.json()).count).toBeGreaterThan(0);

    const dateRes = postsIndex(req("/api/posts?date=2026-09-29"));
    expect(dateRes.status).toBe(200);
    expect((await dateRes.json()).count).toBeGreaterThan(0);

    const tierPrefixRes = postsIndex(req("/api/posts?tier=tier-seraphim"));
    expect(tierPrefixRes.status).toBe(200);
    expect((await tierPrefixRes.json()).count).toBeGreaterThan(0);

    const plusTierRes = postsIndex(req("/api/posts?tier=+seraphim"));
    expect(plusTierRes.status).toBe(200);
    expect((await plusTierRes.json()).count).toBeGreaterThan(0);

    const srcPrefixRes = postsIndex(req("/api/posts?source=src-oaiAug"));
    expect(srcPrefixRes.status).toBe(200);
    expect((await srcPrefixRes.json()).count).toBeGreaterThan(0);

    const qAliasRes = postsIndex(req("/api/posts?query=openai"));
    expect(qAliasRes.status).toBe(200);
    expect((await qAliasRes.json()).count).toBeGreaterThan(0);

    const dirRes = postsIndex(req("/api/posts?direction=asc"));
    expect(dirRes.status).toBe(200);

    const countRes = postsIndex(req("/api/posts?count=2"));
    expect(countRes.status).toBe(200);
    expect((await countRes.json()).count).toBe(2);

    const startRes = postsIndex(req("/api/posts?start=1&count=2"));
    expect(startRes.status).toBe(200);
    expect((await startRes.json()).count).toBe(2);

    const pageNumRes = postsIndex(req("/api/posts?pageNum=2&max=2"));
    expect(pageNumRes.status).toBe(200);
    expect((await pageNumRes.json()).count).toBe(2);

  });

  it("supports ?title=, ?read_mins= alias, sort order aliases (latest, earliest, sortOrder), page number aliases, and start_at", async () => {
    const titleRes = postsIndex(req("/api/posts?title=leaves"));
    expect(titleRes.status).toBe(200);
    const titleBody = await titleRes.json();
    expect(titleBody.count).toBe(1);
    expect(titleBody.posts[0].slug).toBe("when-the-test-subject-leaves-the-test");

    const snakeReadMinsRes = postsIndex(req("/api/posts?read_mins=8"));
    expect(snakeReadMinsRes.status).toBe(200);
    expect((await snakeReadMinsRes.json()).count).toBeGreaterThan(0);

    const latestRes = postsIndex(req("/api/posts?order=latest"));
    expect(latestRes.status).toBe(200);

    const earliestRes = postsIndex(req("/api/posts?order=earliest"));
    expect(earliestRes.status).toBe(200);

    const sortOrderRes = postsIndex(req("/api/posts?sortOrder=asc"));
    expect(sortOrderRes.status).toBe(200);

    const pageNumberRes = postsIndex(req("/api/posts?pageNumber=2&limit=2"));
    expect(pageNumberRes.status).toBe(200);
    expect((await pageNumberRes.json()).count).toBe(2);

    const pageNumberSnakeRes = postsIndex(req("/api/posts?page_number=2&limit=2"));
    expect(pageNumberSnakeRes.status).toBe(200);
    expect((await pageNumberSnakeRes.json()).count).toBe(2);

    const pageNoRes = postsIndex(req("/api/posts?pageNo=2&limit=2"));
    expect(pageNoRes.status).toBe(200);
    expect((await pageNoRes.json()).count).toBe(2);

    const pageNoSnakeRes = postsIndex(req("/api/posts?page_no=2&limit=2"));
    expect(pageNoSnakeRes.status).toBe(200);
    expect((await pageNoSnakeRes.json()).count).toBe(2);

    const startAtRes = postsIndex(req("/api/posts?start_at=1&limit=2"));
    expect(startAtRes.status).toBe(200);
    expect((await startAtRes.json()).count).toBe(2);

    const startAtCamelRes = postsIndex(req("/api/posts?startAt=1&limit=2"));
    expect(startAtCamelRes.status).toBe(200);
    expect((await startAtCamelRes.json()).count).toBe(2);

    const termRes = postsIndex(req("/api/posts?term=openai"));
    expect(termRes.status).toBe(200);
    expect((await termRes.json()).count).toBeGreaterThan(0);

    const filterRes = postsIndex(req("/api/posts?filter=openai"));
    expect(filterRes.status).toBe(200);
    expect((await filterRes.json()).count).toBeGreaterThan(0);

    const findRes = postsIndex(req("/api/posts?find=openai"));
    expect(findRes.status).toBe(200);
    expect((await findRes.json()).count).toBeGreaterThan(0);
  });
});

describe("GET /api/posts/[slug]", () => {
  it("resolves URL-encoded post slugs safely", async () => {
    const targetSlug = "when-the-test-subject-leaves-the-test";
    const encoded = encodeURIComponent(targetSlug);
    const res = await postOne(req(`/api/posts/${encoded}`), slugCtx(encoded));
    expect(res.status).toBe(200);
    expect((await res.json()).slug).toBe(targetSlug);
  });
  it("returns every known post with resolved source records", async () => {
    for (const p of posts) {
      const res = await postOne(req(`/api/posts/${p.slug}`), slugCtx(p.slug));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.slug).toBe(p.slug);
      expect(body.body.length).toBeGreaterThan(0);
      expect(body.sources.map((s: { id: string }) => s.id)).toEqual(p.sources);
      for (const s of body.sources) expect(s.url).toBe(S[s.id].url);
    }
  });

  it("supports case-insensitive post slug lookup, trims whitespace, and handles slashes", async () => {
    const first = posts[0];
    const res = await postOne(req(`/api/posts/${first.slug.toUpperCase()}`), slugCtx(first.slug.toUpperCase()));
    expect(res.status).toBe(200);
    expect((await res.json()).slug).toBe(first.slug);

    const trimRes = await postOne(req(`/api/posts/${first.slug}`), slugCtx(`  ${first.slug}  `));
    expect(trimRes.status).toBe(200);
    expect((await trimRes.json()).slug).toBe(first.slug);

    const slashRes = await postOne(req(`/api/posts/${first.slug}`), slugCtx(`/${first.slug}/`));
    expect(slashRes.status).toBe(200);
    expect((await slashRes.json()).slug).toBe(first.slug);
  });

  it.each(["nope", "", "   ", "../etc/passwd", "%2e%2e", "__proto__", "constructor", "toString"])(
    "returns a JSON 404 for %j",
    async (slug) => {
      const res = await postOne(req(`/api/posts/${slug}`), slugCtx(slug));
      expect(res.status).toBe(404);
      expect(res.headers.get("content-type")).toContain("application/json");
      expect(await res.json()).toMatchObject({ error: "not_found" });
    },
  );

  it("generateStaticParams covers every post and filters out unresolvable source IDs", async () => {
    expect(postParams()).toEqual(posts.map((p) => ({ slug: p.slug })));

    const spy = vi.spyOn(postsModule, "postBySlug").mockReturnValueOnce({
      ...posts[0],
      sources: ["oaiAug", "nonexistent", "toString"],
    });
    const res = await postOne(req(`/api/posts/${posts[0].slug}`), slugCtx(posts[0].slug));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sources).toHaveLength(1);
    expect(body.sources[0].id).toBe("oaiAug");
    spy.mockRestore();
  });
});

describe("GET /api/incidents", () => {
  it("returns incident list, counts, disclaimer, and cache headers", async () => {
    const res = incidentsIndex();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("s-maxage");
    const body = await res.json();
    expect(body.count).toBe(incidents.length);
    expect(body.incidents).toHaveLength(incidents.length);
    expect(body.disclaimer).toBeDefined();
    for (const inc of body.incidents) {
      expect(inc.id).toBeDefined();
      expect(inc.title.length).toBeGreaterThan(0);
      expect(inc.url).toBe(`/incident-case-studies#${inc.id}`);
      expect(inc.sourcesCount).toBeGreaterThan(0);
    }
  });

  it("filters incidents by search query q and includes unverified array", async () => {
    const res = incidentsIndex(req("/api/incidents?q=modal"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBeGreaterThan(0);
    expect(body.totalCount).toBe(incidents.length);
    expect(Array.isArray(body.unverified)).toBe(true);
    expect(body.unverified.length).toBe(body.unverifiedCount);
  });

  it("limits incident result count and handles whitespace query", async () => {
    const limitRes = incidentsIndex(req("/api/incidents?limit=3"));
    expect(limitRes.status).toBe(200);
    const limitBody = await limitRes.json();
    expect(limitBody.incidents).toHaveLength(3);
    expect(limitBody.count).toBe(3);
    expect(limitBody.totalCount).toBe(incidents.length);

    const spaceRes = incidentsIndex(req("/api/incidents?q=%20%20"));
    expect(spaceRes.status).toBe(200);
    expect((await spaceRes.json()).count).toBe(incidents.length);
  });

  it("searches across kicker, standing, timeline, did, and howIn fields", async () => {
    // Search in kicker
    const kickerRes = incidentsIndex(req("/api/incidents?q=landmark"));
    expect(kickerRes.status).toBe(200);
    expect((await kickerRes.json()).count).toBeGreaterThan(0);

    // Search in standing
    const standingRes = incidentsIndex(req("/api/incidents?q=threat-intelligence"));
    expect(standingRes.status).toBe(200);
    expect((await standingRes.json()).count).toBeGreaterThan(0);

    // Search in timeline
    const timelineRes = incidentsIndex(req("/api/incidents?q=exploitgym"));
    expect(timelineRes.status).toBe(200);
    expect((await timelineRes.json()).count).toBeGreaterThan(0);

    // Search in did
    const didRes = incidentsIndex(req("/api/incidents?q=artifactory"));
    expect(didRes.status).toBe(200);
    expect((await didRes.json()).count).toBeGreaterThan(0);

    // Search in vuln
    const vulnRes = incidentsIndex(req("/api/incidents?q=token-refresh"));
    expect(vulnRes.status).toBe(200);
    expect((await vulnRes.json()).count).toBeGreaterThan(0);

    // Search in impact
    const impactRes = incidentsIndex(req("/api/incidents?q=kubernetes"));
    expect(impactRes.status).toBe(200);
    expect((await impactRes.json()).count).toBeGreaterThan(0);

    // Search in inferred
    const inferredRes = incidentsIndex(req("/api/incidents?q=research%20cluster"));
    expect(inferredRes.status).toBe(200);
    expect((await inferredRes.json()).count).toBeGreaterThan(0);

    // Search in seraphim controls/limits and source IDs
    const seraphimRes = incidentsIndex(req("/api/incidents?q=tabletop"));
    expect(seraphimRes.status).toBe(200);
    expect((await seraphimRes.json()).count).toBeGreaterThan(0);

    const srcIdRes = incidentsIndex(req("/api/incidents?q=oaiaug"));
    expect(srcIdRes.status).toBe(200);
    expect((await srcIdRes.json()).count).toBeGreaterThan(0);

    // Search by incident number n, date, and timeline date (t.d)
    const numRes = incidentsIndex(req("/api/incidents?q=08"));
    expect(numRes.status).toBe(200);
    expect((await numRes.json()).incidents.some((i: { id: string }) => i.id === "hf-spaces-2024")).toBe(true);

    const dateRes = incidentsIndex(req("/api/incidents?q=31%20may%202024"));
    expect(dateRes.status).toBe(200);
    expect((await dateRes.json()).count).toBe(1);

    const tlDateRes = incidentsIndex(req("/api/incidents?q=27%20jul%202026"));
    expect(tlDateRes.status).toBe(200);
    expect((await tlDateRes.json()).count).toBe(1);

    // Search with no match
    const noneRes = incidentsIndex(req("/api/incidents?q=absolutely-no-match-xyz"));
    expect(noneRes.status).toBe(200);
    expect((await noneRes.json()).count).toBe(0);

    // Malformed request URL falls back gracefully
    const fallbackRes = incidentsIndex({ url: "http://" } as unknown as Request);
    expect(fallbackRes.status).toBe(200);
    expect((await fallbackRes.json()).count).toBe(incidents.length);
  });

  it("filters incidents by publication year", async () => {
    const y2026Res = incidentsIndex(req("/api/incidents?year=2026"));
    expect(y2026Res.status).toBe(200);
    const y2026Body = await y2026Res.json();
    expect(y2026Body.count).toBeGreaterThan(0);
    expect(y2026Body.incidents.every((i: { date: string }) => i.date.includes("2026"))).toBe(true);

    const y2024Res = incidentsIndex(req("/api/incidents?year=2024"));
    expect(y2024Res.status).toBe(200);
    const y2024Body = await y2024Res.json();
    expect(y2024Body.count).toBeGreaterThan(0);
    expect(y2024Body.incidents.every((i: { date: string }) => i.date.includes("2024"))).toBe(true);

    const noneRes = incidentsIndex(req("/api/incidents?year=1999"));
    expect(noneRes.status).toBe(200);
    expect((await noneRes.json()).count).toBe(0);
  });

  it("filters incidents by cited source ID", async () => {
    const srcRes = incidentsIndex(req("/api/incidents?source=oaiAug"));
    expect(srcRes.status).toBe(200);
    const srcBody = await srcRes.json();
    expect(srcBody.count).toBeGreaterThan(0);
    expect(srcBody.incidents.length).toBe(srcBody.count);

    const noneRes = incidentsIndex(req("/api/incidents?source=nonexistent-src"));
    expect(noneRes.status).toBe(200);
    expect((await noneRes.json()).count).toBe(0);
  });

  it("filters incidents by standing, kicker, and supports offset / skip", async () => {
    const standRes = incidentsIndex(req("/api/incidents?standing=Documented"));
    expect(standRes.status).toBe(200);
    const standBody = await standRes.json();
    expect(standBody.count).toBeGreaterThan(0);
    expect(standBody.incidents.every((i: { standing: string }) => i.standing.toLowerCase().includes("documented"))).toBe(true);

    const kickRes = incidentsIndex(req("/api/incidents?kicker=landmark"));
    expect(kickRes.status).toBe(200);
    const kickBody = await kickRes.json();
    expect(kickBody.count).toBe(1);
    expect(kickBody.incidents[0].id).toBe("openai-huggingface-2026");

    const offRes = incidentsIndex(req("/api/incidents?offset=2&limit=3"));
    expect(offRes.status).toBe(200);
    const offBody = await offRes.json();
    expect(offBody.count).toBe(3);
    expect(offBody.totalCount).toBe(incidents.length);

    const skipRes = incidentsIndex(req("/api/incidents?skip=1"));
    expect(skipRes.status).toBe(200);
    expect((await skipRes.json()).count).toBe(incidents.length - 1);
  });

  it("filters incidents by id or n parameter with prefix and number flexibility", async () => {
    const idRes = incidentsIndex(req("/api/incidents?id=openai-huggingface-2026"));
    expect(idRes.status).toBe(200);
    const idBody = await idRes.json();
    expect(idBody.count).toBe(1);
    expect(idBody.incidents[0].id).toBe("openai-huggingface-2026");

    const idNumRes = incidentsIndex(req("/api/incidents?id=01"));
    expect(idNumRes.status).toBe(200);
    expect((await idNumRes.json()).count).toBe(1);

    const idDigitRes = incidentsIndex(req("/api/incidents?id=1"));
    expect(idDigitRes.status).toBe(200);
    expect((await idDigitRes.json()).count).toBe(1);

    const idCaseRes = incidentsIndex(req("/api/incidents?id=case-01"));
    expect(idCaseRes.status).toBe(200);
    expect((await idCaseRes.json()).count).toBe(1);

    const idIncRes = incidentsIndex(req("/api/incidents?id=incident-01"));
    expect(idIncRes.status).toBe(200);
    expect((await idIncRes.json()).count).toBe(1);

    const idShortIncRes = incidentsIndex(req("/api/incidents?id=inc-1"));
    expect(idShortIncRes.status).toBe(200);
    expect((await idShortIncRes.json()).count).toBe(1);

    const nRes = incidentsIndex(req("/api/incidents?n=01"));
    expect(nRes.status).toBe(200);
    expect((await nRes.json()).count).toBe(1);

    const nDigitRes = incidentsIndex(req("/api/incidents?n=1"));
    expect(nDigitRes.status).toBe(200);
    expect((await nDigitRes.json()).count).toBe(1);

    const nCaseRes = incidentsIndex(req("/api/incidents?n=case-01"));
    expect(nCaseRes.status).toBe(200);
    expect((await nCaseRes.json()).count).toBe(1);

    const noneRes = incidentsIndex(req("/api/incidents?id=nonexistent-incident"));
    expect(noneRes.status).toBe(200);
    expect((await noneRes.json()).count).toBe(0);

    const id001Res = incidentsIndex(req("/api/incidents?id=001"));
    expect(id001Res.status).toBe(200);
    expect((await id001Res.json()).count).toBe(1);

    const n001Res = incidentsIndex(req("/api/incidents?n=001"));
    expect(n001Res.status).toBe(200);
    expect((await n001Res.json()).count).toBe(1);

    const nIncShortRes = incidentsIndex(req("/api/incidents?n=inc-1"));
    expect(nIncShortRes.status).toBe(200);
    expect((await nIncShortRes.json()).count).toBe(1);

    const nCaseShortRes = incidentsIndex(req("/api/incidents?n=case-1"));
    expect(nCaseShortRes.status).toBe(200);
    expect((await nCaseShortRes.json()).count).toBe(1);
  });

  it("filters incidents by ?id= and ?n= with i- and inc prefixes and single-digit codes", async () => {
    const idIPrefixRes = incidentsIndex(req("/api/incidents?id=i-01"));
    expect(idIPrefixRes.status).toBe(200);
    expect((await idIPrefixRes.json()).count).toBe(1);

    const idISingleRes = incidentsIndex(req("/api/incidents?id=i-1"));
    expect(idISingleRes.status).toBe(200);
    expect((await idISingleRes.json()).count).toBe(1);

    const idI1Res = incidentsIndex(req("/api/incidents?id=i1"));
    expect(idI1Res.status).toBe(200);
    expect((await idI1Res.json()).count).toBe(1);

    const idInc01Res = incidentsIndex(req("/api/incidents?id=inc01"));
    expect(idInc01Res.status).toBe(200);
    expect((await idInc01Res.json()).count).toBe(1);

    const nIPrefixRes = incidentsIndex(req("/api/incidents?n=i-01"));
    expect(nIPrefixRes.status).toBe(200);
    expect((await nIPrefixRes.json()).count).toBe(1);

    const nISingleRes = incidentsIndex(req("/api/incidents?n=i-1"));
    expect(nISingleRes.status).toBe(200);
    expect((await nISingleRes.json()).count).toBe(1);

    const nI1Res = incidentsIndex(req("/api/incidents?n=i1"));
    expect(nI1Res.status).toBe(200);
    expect((await nI1Res.json()).count).toBe(1);

    const nInc01Res = incidentsIndex(req("/api/incidents?n=inc01"));
    expect(nInc01Res.status).toBe(200);
    expect((await nInc01Res.json()).count).toBe(1);
  });

  it("supports order/sort, ref alias, vuln, impact, and page-based pagination", async () => {
    const descRes = incidentsIndex(req("/api/incidents?order=desc"));
    expect(descRes.status).toBe(200);
    const descBody = await descRes.json();
    expect(descBody.incidents[0].id).toBe(incidents[incidents.length - 1].id);

    const refRes = incidentsIndex(req("/api/incidents?ref=oaiAug"));
    expect(refRes.status).toBe(200);
    expect((await refRes.json()).count).toBeGreaterThan(0);

    const vulnRes = incidentsIndex(req("/api/incidents?vuln=token-refresh"));
    expect(vulnRes.status).toBe(200);
    expect((await vulnRes.json()).count).toBeGreaterThan(0);

    const impactRes = incidentsIndex(req("/api/incidents?impact=credentials"));
    expect(impactRes.status).toBe(200);
    expect((await impactRes.json()).count).toBeGreaterThan(0);

    const page2Res = incidentsIndex(req("/api/incidents?page=2&limit=2"));
    expect(page2Res.status).toBe(200);
    const page2Body = await page2Res.json();
    expect(page2Body.count).toBe(2);
    expect(page2Body.incidents[0].id).toBe(incidents[2].id);
  });

  it("supports date alias, title filter, cve alias, prefix-cleaned source, count limit, and start offset", async () => {
    const dateRes = incidentsIndex(req("/api/incidents?date=2026"));
    expect(dateRes.status).toBe(200);
    expect((await dateRes.json()).count).toBeGreaterThan(0);

    const titleRes = incidentsIndex(req("/api/incidents?title=OpenAI"));
    expect(titleRes.status).toBe(200);
    expect((await titleRes.json()).count).toBeGreaterThan(0);

    const cveRes = incidentsIndex(req("/api/incidents?cve=token"));
    expect(cveRes.status).toBe(200);
    expect((await cveRes.json()).count).toBeGreaterThan(0);

    const srcPrefixRes = incidentsIndex(req("/api/incidents?source=src-oaiAug"));
    expect(srcPrefixRes.status).toBe(200);
    expect((await srcPrefixRes.json()).count).toBeGreaterThan(0);

    const dirRes = incidentsIndex(req("/api/incidents?direction=desc"));
    expect(dirRes.status).toBe(200);

    const countRes = incidentsIndex(req("/api/incidents?count=2"));
    expect(countRes.status).toBe(200);
    expect((await countRes.json()).count).toBe(2);

    const startRes = incidentsIndex(req("/api/incidents?start=2&count=2"));
    expect(startRes.status).toBe(200);
    expect((await startRes.json()).count).toBe(2);

    const pageNumRes = incidentsIndex(req("/api/incidents?pageNum=2&max=2"));
    expect(pageNumRes.status).toBe(200);
    expect((await pageNumRes.json()).count).toBe(2);
  });
});

describe("GET /api/incidents/[id]", () => {
  it("resolves URL-encoded incident ids safely", async () => {
    const targetId = "openai-huggingface-2026";
    const encoded = encodeURIComponent(targetId);
    const res = await incidentOne(req(`/api/incidents/${encoded}`), idCtx(encoded));
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe(targetId);
  });
  it("returns every known incident with resolved sources and timeline", async () => {
    for (const inc of incidents) {
      const res = await incidentOne(req(`/api/incidents/${inc.id}`), idCtx(inc.id));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(inc.id);
      expect(body.timeline.length).toBeGreaterThan(0);
      expect(body.sources).toHaveLength(inc.sources.length);
      for (const s of body.sources) expect(s.url).toBe(S[s.id].url);
    }
  });

  it("supports case-insensitive incident lookup, incident numbers (01, 1), and trims whitespace", async () => {
    const first = incidents[0];
    const res = await incidentOne(req(`/api/incidents/${first.id.toUpperCase()}`), idCtx(first.id.toUpperCase()));
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe(first.id);

    const numRes = await incidentOne(req("/api/incidents/01"), idCtx("01"));
    expect(numRes.status).toBe(200);
    expect((await numRes.json()).id).toBe(first.id);

    const singleNumRes = await incidentOne(req("/api/incidents/1"), idCtx("1"));
    expect(singleNumRes.status).toBe(200);
    expect((await singleNumRes.json()).id).toBe(first.id);

    const prefixRes = await incidentOne(req("/api/incidents/case-01"), idCtx("case-01"));
    expect(prefixRes.status).toBe(200);
    expect((await prefixRes.json()).id).toBe(first.id);

    const incPrefixRes = await incidentOne(req("/api/incidents/incident-01"), idCtx("incident-01"));
    expect(incPrefixRes.status).toBe(200);
    expect((await incPrefixRes.json()).id).toBe(first.id);

    const shortPrefixRes = await incidentOne(req("/api/incidents/inc-1"), idCtx("inc-1"));
    expect(shortPrefixRes.status).toBe(200);
    expect((await shortPrefixRes.json()).id).toBe(first.id);

    const iPrefixRes = await incidentOne(req("/api/incidents/i-01"), idCtx("i-01"));
    expect(iPrefixRes.status).toBe(200);
    expect((await iPrefixRes.json()).id).toBe(first.id);

    const iSingleRes = await incidentOne(req("/api/incidents/i-1"), idCtx("i-1"));
    expect(iSingleRes.status).toBe(200);
    expect((await iSingleRes.json()).id).toBe(first.id);

    const i1Res = await incidentOne(req("/api/incidents/i1"), idCtx("i1"));
    expect(i1Res.status).toBe(200);
    expect((await i1Res.json()).id).toBe(first.id);

    const inc01Res = await incidentOne(req("/api/incidents/inc01"), idCtx("inc01"));
    expect(inc01Res.status).toBe(200);
    expect((await inc01Res.json()).id).toBe(first.id);

    const trimRes = await incidentOne(req(`/api/incidents/${first.id}`), idCtx(`  ${first.id}  `));
    expect(trimRes.status).toBe(200);
    expect((await trimRes.json()).id).toBe(first.id);

    const jsonRes = await incidentOne(req(`/api/incidents/${first.id}.json`), idCtx(`${first.id}.json`));
    expect(jsonRes.status).toBe(200);
    expect((await jsonRes.json()).id).toBe(first.id);

    const htmlRes = await incidentOne(req(`/api/incidents/${first.id}.html`), idCtx(`${first.id}.html`));
    expect(htmlRes.status).toBe(200);
    expect((await htmlRes.json()).id).toBe(first.id);
  });

  it.each(["nonexistent-incident", "", "   ", "../etc/passwd", "__proto__", "constructor", "toString"])(
    "returns a JSON 404 for %j",
    async (id) => {
      const res = await incidentOne(req(`/api/incidents/${id}`), idCtx(id));
      expect(res.status).toBe(404);
      expect(res.headers.get("content-type")).toContain("application/json");
      expect(await res.json()).toMatchObject({ error: "not_found" });
    },
  );

  it("generateStaticParams covers every incident and filters out unresolvable source IDs", async () => {
    expect(incidentParams()).toEqual(incidents.map((i) => ({ id: i.id })));

    const spy = vi.spyOn(incidentsModule, "incidentById").mockReturnValueOnce({
      ...incidents[0],
      sources: ["oaiAug", "nonexistent", "constructor"],
    });
    const res = await incidentOne(req(`/api/incidents/${incidents[0].id}`), idCtx(incidents[0].id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sources).toHaveLength(1);
    expect(body.sources[0].id).toBe("oaiAug");
    spy.mockRestore();
  });
});

describe("GET /api/case-studies", () => {
  it("returns findings list, severityCounts, and cache headers", async () => {
    const res = caseStudiesIndex();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("s-maxage");
    const body = await res.json();
    expect(body.count).toBe(findings.length);
    expect(body.findings).toHaveLength(findings.length);
    expect(body.severityCounts).toBeDefined();
    for (const f of body.findings) {
      expect(f.id).toBeDefined();
      expect(f.title.length).toBeGreaterThan(0);
      expect(f.severity).toBeDefined();
      expect(f.url).toBe(`/case-studies#${f.id.toLowerCase()}`);
    }
  });

  it("filters findings by severity and status", async () => {
    const res = caseStudiesIndex(req("/api/case-studies?severity=high"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBeGreaterThan(0);
    expect(body.findings.every((f: { severity: string }) => f.severity === "High")).toBe(true);
    expect(body.totalCount).toBe(findings.length);

    const statusRes = caseStudiesIndex(req("/api/case-studies?status=fixed"));
    const statusBody = await statusRes.json();
    expect(statusBody.count).toBeGreaterThan(0);
  });

  it("filters findings by search query q", async () => {
    const res = caseStudiesIndex(req("/api/case-studies?q=timezone"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(1);
    expect(body.findings[0].id).toBe("F-02");

    // Search in what
    const whatRes = caseStudiesIndex(req("/api/case-studies?q=airport-rush"));
    expect(whatRes.status).toBe(200);
    expect((await whatRes.json()).count).toBe(1);

    // Search in before
    const beforeRes = caseStudiesIndex(req("/api/case-studies?q=four%20hours%20early"));
    expect(beforeRes.status).toBe(200);
    expect((await beforeRes.json()).count).toBe(1);

    // Search in after
    const afterRes = caseStudiesIndex(req("/api/case-studies?q=database%20vault"));
    expect(afterRes.status).toBe(200);
    expect((await afterRes.json()).count).toBe(1);

    // Search in status and severity via q
    const statusQRes = caseStudiesIndex(req("/api/case-studies?q=rolled-back%20transaction"));
    expect(statusQRes.status).toBe(200);
    const statusQBody = await statusQRes.json();
    expect(statusQBody.count).toBe(1);
    expect(statusQBody.findings[0].id).toBe("F-08");

    const sevQRes = caseStudiesIndex(req("/api/case-studies?q=high"));
    expect(sevQRes.status).toBe(200);
    expect((await sevQRes.json()).count).toBeGreaterThan(0);
  });

  it("limits findings result count and handles whitespace query", async () => {
    const limitRes = caseStudiesIndex(req("/api/case-studies?limit=4"));
    expect(limitRes.status).toBe(200);
    const limitBody = await limitRes.json();
    expect(limitBody.findings).toHaveLength(4);
    expect(limitBody.count).toBe(4);
    expect(limitBody.totalCount).toBe(findings.length);

    const spaceRes = caseStudiesIndex(req("/api/case-studies?q=%20%20"));
    expect(spaceRes.status).toBe(200);
    expect((await spaceRes.json()).count).toBe(findings.length);
  });

  it("supports case-insensitive severity/status filtering, combined filters, and empty matches", async () => {
    const highRes = caseStudiesIndex(req("/api/case-studies?severity=%20HIGH%20"));
    expect(highRes.status).toBe(200);
    const highBody = await highRes.json();
    expect(highBody.count).toBeGreaterThan(0);
    expect(highBody.findings.every((f: { severity: string }) => f.severity === "High")).toBe(true);

    const combinedRes = caseStudiesIndex(req("/api/case-studies?severity=medium&status=fixed&limit=2"));
    expect(combinedRes.status).toBe(200);
    const combinedBody = await combinedRes.json();
    expect(combinedBody.count).toBeLessThanOrEqual(2);
    expect(combinedBody.findings.every((f: { severity: string }) => f.severity === "Medium")).toBe(true);

    const noneRes = caseStudiesIndex(req("/api/case-studies?severity=nonexistent"));
    expect(noneRes.status).toBe(200);
    expect((await noneRes.json()).count).toBe(0);

    const fallbackRes = caseStudiesIndex({ url: "http://" } as unknown as Request);
    expect(fallbackRes.status).toBe(200);
    expect((await fallbackRes.json()).count).toBe(findings.length);
  });

  it("filters findings by id (supports F-01, f01, fix-f-01) and supports offset", async () => {
    const idRes = caseStudiesIndex(req("/api/case-studies?id=F-01"));
    expect(idRes.status).toBe(200);
    const idBody = await idRes.json();
    expect(idBody.count).toBe(1);
    expect(idBody.findings[0].id).toBe("F-01");

    const noHyphenRes = caseStudiesIndex(req("/api/case-studies?id=f01"));
    expect(noHyphenRes.status).toBe(200);
    expect((await noHyphenRes.json()).findings[0].id).toBe("F-01");

    const fixPrefixRes = caseStudiesIndex(req("/api/case-studies?id=fix-f-01"));
    expect(fixPrefixRes.status).toBe(200);
    expect((await fixPrefixRes.json()).findings[0].id).toBe("F-01");

    const nRes = caseStudiesIndex(req("/api/case-studies?n=F-01"));
    expect(nRes.status).toBe(200);
    expect((await nRes.json()).findings[0].id).toBe("F-01");

    const nDigitRes = caseStudiesIndex(req("/api/case-studies?n=1"));
    expect(nDigitRes.status).toBe(200);
    expect((await nDigitRes.json()).findings[0].id).toBe("F-01");

    const nPadRes = caseStudiesIndex(req("/api/case-studies?n=01"));
    expect(nPadRes.status).toBe(200);
    expect((await nPadRes.json()).findings[0].id).toBe("F-01");

    const offRes = caseStudiesIndex(req("/api/case-studies?offset=2&limit=3"));
    expect(offRes.status).toBe(200);
    const offBody = await offRes.json();
    expect(offBody.count).toBe(3);
    expect(offBody.totalCount).toBe(findings.length);

    const f1IdRes = caseStudiesIndex(req("/api/case-studies?id=f-1"));
    expect(f1IdRes.status).toBe(200);
    expect((await f1IdRes.json()).findings[0].id).toBe("F-01");

    const f1NoHyphenIdRes = caseStudiesIndex(req("/api/case-studies?id=f1"));
    expect(f1NoHyphenIdRes.status).toBe(200);
    expect((await f1NoHyphenIdRes.json()).findings[0].id).toBe("F-01");

    const fixF1IdRes = caseStudiesIndex(req("/api/case-studies?id=fix-f-1"));
    expect(fixF1IdRes.status).toBe(200);
    expect((await fixF1IdRes.json()).findings[0].id).toBe("F-01");

    const fix1IdRes = caseStudiesIndex(req("/api/case-studies?id=fix-1"));
    expect(fix1IdRes.status).toBe(200);
    expect((await fix1IdRes.json()).findings[0].id).toBe("F-01");

    const oneIdRes = caseStudiesIndex(req("/api/case-studies?id=1"));
    expect(oneIdRes.status).toBe(200);
    expect((await oneIdRes.json()).findings[0].id).toBe("F-01");

    const pad001IdRes = caseStudiesIndex(req("/api/case-studies?id=001"));
    expect(pad001IdRes.status).toBe(200);
    expect((await pad001IdRes.json()).findings[0].id).toBe("F-01");

    const f1NRes = caseStudiesIndex(req("/api/case-studies?n=f-1"));
    expect(f1NRes.status).toBe(200);
    expect((await f1NRes.json()).findings[0].id).toBe("F-01");

    const f1NoHyphenNRes = caseStudiesIndex(req("/api/case-studies?n=f1"));
    expect(f1NoHyphenNRes.status).toBe(200);
    expect((await f1NoHyphenNRes.json()).findings[0].id).toBe("F-01");
  });

  it("supports order/sort descending and page-based pagination", async () => {
    const descRes = caseStudiesIndex(req("/api/case-studies?order=desc"));
    expect(descRes.status).toBe(200);
    const descBody = await descRes.json();
    expect(descBody.findings[0].id).toBe(findings[findings.length - 1].id);

    const page2Res = caseStudiesIndex(req("/api/case-studies?page=2&limit=2"));
    expect(page2Res.status).toBe(200);
    const page2Body = await page2Res.json();
    expect(page2Body.count).toBe(2);
    expect(page2Body.findings[0].id).toBe(findings[2].id);
  });

  it("supports sev alias, finding/fix prefixes, count limit, and start offset", async () => {
    const sevRes = caseStudiesIndex(req("/api/case-studies?sev=high"));
    expect(sevRes.status).toBe(200);
    expect((await sevRes.json()).count).toBeGreaterThan(0);

    const findingRes = caseStudiesIndex(req("/api/case-studies?id=finding-01"));
    expect(findingRes.status).toBe(200);
    expect((await findingRes.json()).findings[0].id).toBe("F-01");

    const findingUnderscoreRes = caseStudiesIndex(req("/api/case-studies?id=finding_01"));
    expect(findingUnderscoreRes.status).toBe(200);
    expect((await findingUnderscoreRes.json()).findings[0].id).toBe("F-01");

    const fixUnderscoreRes = caseStudiesIndex(req("/api/case-studies?id=fix_01"));
    expect(fixUnderscoreRes.status).toBe(200);
    expect((await fixUnderscoreRes.json()).findings[0].id).toBe("F-01");

    const countRes = caseStudiesIndex(req("/api/case-studies?count=3"));
    expect(countRes.status).toBe(200);
    expect((await countRes.json()).count).toBe(3);

    const startRes = caseStudiesIndex(req("/api/case-studies?start=2&count=2"));
    expect(startRes.status).toBe(200);
    expect((await startRes.json()).count).toBe(2);

    const pageNumRes = caseStudiesIndex(req("/api/case-studies?pageNum=2&max=2"));
    expect(pageNumRes.status).toBe(200);
    expect((await pageNumRes.json()).count).toBe(2);
  });

  it("supports ?title= and cs- / case-study- id prefixes on /api/case-studies", async () => {
    const titleRes = caseStudiesIndex(req("/api/case-studies?title=maintenance"));
    expect(titleRes.status).toBe(200);
    const titleBody = await titleRes.json();
    expect(titleBody.count).toBe(1);
    expect(titleBody.findings[0].id).toBe("F-01");

    const csIdRes = caseStudiesIndex(req("/api/case-studies?id=cs-01"));
    expect(csIdRes.status).toBe(200);
    expect((await csIdRes.json()).findings[0].id).toBe("F-01");

    const cs1IdRes = caseStudiesIndex(req("/api/case-studies?id=cs-1"));
    expect(cs1IdRes.status).toBe(200);
    expect((await cs1IdRes.json()).findings[0].id).toBe("F-01");

    const caseStudyIdRes = caseStudiesIndex(req("/api/case-studies?id=case-study-01"));
    expect(caseStudyIdRes.status).toBe(200);
    expect((await caseStudyIdRes.json()).findings[0].id).toBe("F-01");
  });
});

describe("GET /api/case-studies/[id]", () => {
  it("resolves finding with finding- prefix, underscores, and URL-encoding", async () => {
    const findingPrefixRes = await caseStudyOne(req("/api/case-studies/finding-01"), idCtx("finding-01"));
    expect(findingPrefixRes.status).toBe(200);
    expect((await findingPrefixRes.json()).id).toBe("F-01");

    const fixUnderRes = await caseStudyOne(req("/api/case-studies/fix_01"), idCtx("fix_01"));
    expect(fixUnderRes.status).toBe(200);
    expect((await fixUnderRes.json()).id).toBe("F-01");

    const encodedRes = await caseStudyOne(req("/api/case-studies/f%2D01"), idCtx("f%2D01"));
    expect(encodedRes.status).toBe(200);
    expect((await encodedRes.json()).id).toBe("F-01");
  });
  it("returns every finding by ID with before/after details", async () => {
    for (const f of findings) {
      const res = await caseStudyOne(req(`/api/case-studies/${f.id}`), idCtx(f.id));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(f.id);
      expect(body.before.length).toBeGreaterThan(0);
      expect(body.after.length).toBeGreaterThan(0);
      expect(body.fix.length).toBeGreaterThan(0);
      expect(body.remediation).toBeDefined();
      expect(body.remediation.id).toBe(f.id);
      expect(body.remediation.checked.length).toBeGreaterThan(0);
    }
  });

  it("supports case-insensitive finding lookup, hyphenless IDs (f01), fix- prefixes, and trims whitespace", async () => {
    const res = await caseStudyOne(req("/api/case-studies/f-01"), idCtx("f-01"));
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe("F-01");

    const noHyphenRes = await caseStudyOne(req("/api/case-studies/f01"), idCtx("f01"));
    expect(noHyphenRes.status).toBe(200);
    expect((await noHyphenRes.json()).id).toBe("F-01");

    const fixRes = await caseStudyOne(req("/api/case-studies/fix-f-01"), idCtx("fix-f-01"));
    expect(fixRes.status).toBe(200);
    expect((await fixRes.json()).id).toBe("F-01");

    const fixNoHyphenRes = await caseStudyOne(req("/api/case-studies/fix-01"), idCtx("fix-01"));
    expect(fixNoHyphenRes.status).toBe(200);
    expect((await fixNoHyphenRes.json()).id).toBe("F-01");

    const trimRes = await caseStudyOne(req("/api/case-studies/f-01"), idCtx("  f-01  "));
    expect(trimRes.status).toBe(200);
    expect((await trimRes.json()).id).toBe("F-01");

    const f1Res = await caseStudyOne(req("/api/case-studies/f-1"), idCtx("f-1"));
    expect(f1Res.status).toBe(200);
    expect((await f1Res.json()).id).toBe("F-01");

    const f1NoHyphenRes = await caseStudyOne(req("/api/case-studies/f1"), idCtx("f1"));
    expect(f1NoHyphenRes.status).toBe(200);
    expect((await f1NoHyphenRes.json()).id).toBe("F-01");

    const fixF1Res = await caseStudyOne(req("/api/case-studies/fix-f-1"), idCtx("fix-f-1"));
    expect(fixF1Res.status).toBe(200);
    expect((await fixF1Res.json()).id).toBe("F-01");

    const fix1Res = await caseStudyOne(req("/api/case-studies/fix-1"), idCtx("fix-1"));
    expect(fix1Res.status).toBe(200);
    expect((await fix1Res.json()).id).toBe("F-01");

    const jsonRes = await caseStudyOne(req("/api/case-studies/f-01.json"), idCtx("f-01.json"));
    expect(jsonRes.status).toBe(200);
    expect((await jsonRes.json()).id).toBe("F-01");

    const htmlRes = await caseStudyOne(req("/api/case-studies/f-01.html"), idCtx("f-01.html"));
    expect(htmlRes.status).toBe(200);
    expect((await htmlRes.json()).id).toBe("F-01");

    const csOneRes = await caseStudyOne(req("/api/case-studies/cs-01"), idCtx("cs-01"));
    expect(csOneRes.status).toBe(200);
    expect((await csOneRes.json()).id).toBe("F-01");

    const cs1Res = await caseStudyOne(req("/api/case-studies/cs-1"), idCtx("cs-1"));
    expect(cs1Res.status).toBe(200);
    expect((await cs1Res.json()).id).toBe("F-01");

    const caseStudyOneRes = await caseStudyOne(req("/api/case-studies/case-study-01"), idCtx("case-study-01"));
    expect(caseStudyOneRes.status).toBe(200);
    expect((await caseStudyOneRes.json()).id).toBe("F-01");
  });

  it.each(["F-999", "unknown", "", "   ", "__proto__", "constructor", "toString"])(
    "returns a JSON 404 for %j",
    async (id) => {
      const res = await caseStudyOne(req(`/api/case-studies/${id}`), idCtx(id));
      expect(res.status).toBe(404);
      expect(res.headers.get("content-type")).toContain("application/json");
      expect(await res.json()).toMatchObject({ error: "not_found" });
    },
  );

  it("generateStaticParams covers every finding and handles missing remediation gracefully", async () => {
    expect(caseStudyParams()).toEqual(findings.map((f) => ({ id: f.id.toLowerCase() })));

    const spy = vi.spyOn(caseStudiesModule, "remediationById").mockReturnValueOnce(undefined);
    const res = await caseStudyOne(req("/api/case-studies/f-01"), idCtx("f-01"));
    expect(res.status).toBe(200);
    expect((await res.json()).remediation).toBeNull();
    spy.mockRestore();
  });
});

describe("GET /api/tiers", () => {
  it("returns all four tiers, matrix, terms, and cache headers", async () => {
    const res = tiersIndex();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("s-maxage");
    const body = await res.json();
    expect(body.count).toBe(4);
    expect(body.tiers).toHaveLength(4);
    expect(body.matrix.length).toBeGreaterThan(0);
    expect(body.terms.length).toBeGreaterThan(0);
    for (const t of body.tiers) {
      expect(t.name).toBeDefined();
      expect(t.rank).toBeGreaterThanOrEqual(1);
      expect(t.url).toBe(`/pricing#${t.id}`);
    }
  });

  it("filters tiers by search query q", async () => {
    const res = tiersIndex(req("/api/tiers?q=advisory"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBeGreaterThan(0);
    expect(body.totalCount).toBe(tiers.length);
  });

  it("limits tiers result count and handles whitespace query", async () => {
    const limitRes = tiersIndex(req("/api/tiers?limit=2"));
    expect(limitRes.status).toBe(200);
    const limitBody = await limitRes.json();
    expect(limitBody.tiers).toHaveLength(2);
    expect(limitBody.count).toBe(2);
    expect(limitBody.totalCount).toBe(tiers.length);

    const spaceRes = tiersIndex(req("/api/tiers?q=%20%20"));
    expect(spaceRes.status).toBe(200);
    expect((await spaceRes.json()).count).toBe(tiers.length);
  });

  it("searches across tier id, name, tagline, positioning, and summary", async () => {
    const posRes = tiersIndex(req("/api/tiers?q=founders"));
    expect(posRes.status).toBe(200);
    expect((await posRes.json()).count).toBeGreaterThan(0);

    const sumRes = tiersIndex(req("/api/tiers?q=comprehensive"));
    expect(sumRes.status).toBe(200);
    expect((await sumRes.json()).count).toBeGreaterThan(0);

    // Search in cadence and notIncluded
    const cadenceRes = tiersIndex(req("/api/tiers?q=agreed%20schedule"));
    expect(cadenceRes.status).toBe(200);
    const cadenceBody = await cadenceRes.json();
    expect(cadenceBody.count).toBe(1);
    expect(cadenceBody.tiers[0].id).toBe("cherubim");

    const notIncRes = tiersIndex(req("/api/tiers?q=self-serve%20scanner"));
    expect(notIncRes.status).toBe(200);
    const notIncBody = await notIncRes.json();
    expect(notIncBody.count).toBe(1);
    expect(notIncBody.tiers[0].id).toBe("angels");

    const noneRes = tiersIndex(req("/api/tiers?q=no-such-tier-xyz"));
    expect(noneRes.status).toBe(200);
    expect((await noneRes.json()).count).toBe(0);

    const fallbackRes = tiersIndex({ url: "http://" } as unknown as Request);
    expect(fallbackRes.status).toBe(200);
    expect((await fallbackRes.json()).count).toBe(tiers.length);
  });

  it("filters tiers by cadence, positioning, rank, and supports offset", async () => {
    const cadRes = tiersIndex(req("/api/tiers?cadence=recurring"));
    expect(cadRes.status).toBe(200);
    const cadBody = await cadRes.json();
    expect(cadBody.count).toBe(1);
    expect(cadBody.tiers[0].id).toBe("cherubim");

    const posRes = tiersIndex(req("/api/tiers?positioning=entry-level"));
    expect(posRes.status).toBe(200);
    const posBody = await posRes.json();
    expect(posBody.count).toBe(1);
    expect(posBody.tiers[0].id).toBe("angels");

    const rankRes = tiersIndex(req("/api/tiers?rank=1"));
    expect(rankRes.status).toBe(200);
    const rankBody = await rankRes.json();
    expect(rankBody.count).toBe(1);
    expect(rankBody.tiers[0].id).toBe("seraphim");

    const offRes = tiersIndex(req("/api/tiers?offset=1&limit=2"));
    expect(offRes.status).toBe(200);
    const offBody = await offRes.json();
    expect(offBody.count).toBe(2);
    expect(offBody.totalCount).toBe(tiers.length);

    const idRes = tiersIndex(req("/api/tiers?id=seraphim"));
    expect(idRes.status).toBe(200);
    const idBody = await idRes.json();
    expect(idBody.count).toBe(1);
    expect(idBody.tiers[0].id).toBe("seraphim");

    const prefixRes = tiersIndex(req("/api/tiers?id=tier-seraphim"));
    expect(prefixRes.status).toBe(200);
    expect((await prefixRes.json()).count).toBe(1);

    const idRankRes = tiersIndex(req("/api/tiers?id=1"));
    expect(idRankRes.status).toBe(200);
    expect((await idRankRes.json()).count).toBe(1);

    const idRankPrefixRes = tiersIndex(req("/api/tiers?id=tier-1"));
    expect(idRankPrefixRes.status).toBe(200);
    expect((await idRankPrefixRes.json()).count).toBe(1);

    const idPlusRankRes = tiersIndex(req("/api/tiers?id=%2B1"));
    expect(idPlusRankRes.status).toBe(200);
    expect((await idPlusRankRes.json()).count).toBe(1);

    const noneIdRes = tiersIndex(req("/api/tiers?id=nonexistent"));
    expect(noneIdRes.status).toBe(200);
    expect((await noneIdRes.json()).count).toBe(0);
  });

  it("supports order/sort descending and page-based pagination", async () => {
    const descRes = tiersIndex(req("/api/tiers?order=desc"));
    expect(descRes.status).toBe(200);
    const descBody = await descRes.json();
    expect(descBody.tiers[0].id).toBe(tiers[tiers.length - 1].id);

    const page2Res = tiersIndex(req("/api/tiers?page=2&limit=2"));
    expect(page2Res.status).toBe(200);
    const page2Body = await page2Res.json();
    expect(page2Body.count).toBe(2);
    expect(page2Body.tiers[0].id).toBe(tiers[2].id);
  });

  it("supports tier alias, name filter, tier1 and t1 rank aliases, count limit, and start offset", async () => {
    const tierAliasRes = tiersIndex(req("/api/tiers?tier=seraphim"));
    expect(tierAliasRes.status).toBe(200);
    expect((await tierAliasRes.json()).count).toBe(1);

    const nameRes = tiersIndex(req("/api/tiers?name=Seraphim"));
    expect(nameRes.status).toBe(200);
    expect((await nameRes.json()).count).toBe(1);

    const t1Res = tiersIndex(req("/api/tiers?id=t1"));
    expect(t1Res.status).toBe(200);
    expect((await t1Res.json()).tiers[0].id).toBe("seraphim");

    const tier1Res = tiersIndex(req("/api/tiers?id=tier1"));
    expect(tier1Res.status).toBe(200);
    expect((await tier1Res.json()).tiers[0].id).toBe("seraphim");

    const countRes = tiersIndex(req("/api/tiers?count=2"));
    expect(countRes.status).toBe(200);
    expect((await countRes.json()).count).toBe(2);

    const startRes = tiersIndex(req("/api/tiers?start=2&count=2"));
    expect(startRes.status).toBe(200);
    expect((await startRes.json()).count).toBe(2);
  });

  it("supports leading-zero ranks (01), t-1 prefix, and ?tier_rank= alias on /api/tiers", async () => {
    const tierRankAliasRes = tiersIndex(req("/api/tiers?tier_rank=1"));
    expect(tierRankAliasRes.status).toBe(200);
    expect((await tierRankAliasRes.json()).count).toBe(1);

    const idTHyphenRes = tiersIndex(req("/api/tiers?id=t-1"));
    expect(idTHyphenRes.status).toBe(200);
    expect((await idTHyphenRes.json()).tiers[0].id).toBe("seraphim");

    const idTUnderscoreRes = tiersIndex(req("/api/tiers?id=t_1"));
    expect(idTUnderscoreRes.status).toBe(200);
    expect((await idTUnderscoreRes.json()).tiers[0].id).toBe("seraphim");

    const idZeroRes = tiersIndex(req("/api/tiers?id=01"));
    expect(idZeroRes.status).toBe(200);
    expect((await idZeroRes.json()).tiers[0].id).toBe("seraphim");

    const idTierUnderscoreRes = tiersIndex(req("/api/tiers?id=tier_01"));
    expect(idTierUnderscoreRes.status).toBe(200);
    expect((await idTierUnderscoreRes.json()).tiers[0].id).toBe("seraphim");

    const tierZeroRes = tiersIndex(req("/api/tiers?tier=01"));
    expect(tierZeroRes.status).toBe(200);
    expect((await tierZeroRes.json()).tiers[0].id).toBe("seraphim");

    const tierTHyphenRes = tiersIndex(req("/api/tiers?tier=t-1"));
    expect(tierTHyphenRes.status).toBe(200);
    expect((await tierTHyphenRes.json()).tiers[0].id).toBe("seraphim");
  });
});

describe("GET /api/tiers/[id]", () => {
  it("resolves tier by t<N>, tier<N>, and URL-encoding", async () => {
    const t1Res = await tierOne(req("/api/tiers/t1"), idCtx("t1"));
    expect(t1Res.status).toBe(200);
    expect((await t1Res.json()).id).toBe("seraphim");

    const tier1Res = await tierOne(req("/api/tiers/tier1"), idCtx("tier1"));
    expect(tier1Res.status).toBe(200);
    expect((await tier1Res.json()).id).toBe("seraphim");

    const encodedRes = await tierOne(req("/api/tiers/tier%2Dseraphim"), idCtx("tier%2Dseraphim"));
    expect(encodedRes.status).toBe(200);
    expect((await encodedRes.json()).id).toBe("seraphim");
  });
  it("returns each tier with included items and fit criteria", async () => {
    for (const t of tiers) {
      const res = await tierOne(req(`/api/tiers/${t.id}`), idCtx(t.id));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(t.id);
      expect(body.name).toBe(t.name);
      expect(body.included.length).toBeGreaterThan(0);
      expect(body.forWho.length).toBeGreaterThan(0);
    }
  });

  it("supports case-insensitive tier lookup, rank number lookup, and trims whitespace", async () => {
    const res = await tierOne(req("/api/tiers/SERAPHIM"), idCtx("SERAPHIM"));
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe("seraphim");

    const rankRes = await tierOne(req("/api/tiers/1"), idCtx("1"));
    expect(rankRes.status).toBe(200);
    expect((await rankRes.json()).id).toBe("seraphim");

    const trimRes = await tierOne(req("/api/tiers/seraphim"), idCtx("  seraphim  "));
    expect(trimRes.status).toBe(200);
    expect((await trimRes.json()).id).toBe("seraphim");

    const prefixRes = await tierOne(req("/api/tiers/tier-seraphim"), idCtx("tier-seraphim"));
    expect(prefixRes.status).toBe(200);
    expect((await prefixRes.json()).id).toBe("seraphim");

    const tierRankRes = await tierOne(req("/api/tiers/tier-1"), idCtx("tier-1"));
    expect(tierRankRes.status).toBe(200);
    expect((await tierRankRes.json()).id).toBe("seraphim");

    const plusRankRes = await tierOne(req("/api/tiers/+1"), idCtx("+1"));
    expect(plusRankRes.status).toBe(200);
    expect((await plusRankRes.json()).id).toBe("seraphim");

    const jsonRes = await tierOne(req("/api/tiers/seraphim.json"), idCtx("seraphim.json"));
    expect(jsonRes.status).toBe(200);
    expect((await jsonRes.json()).id).toBe("seraphim");

    const htmlRes = await tierOne(req("/api/tiers/seraphim.html"), idCtx("seraphim.html"));
    expect(htmlRes.status).toBe(200);
    expect((await htmlRes.json()).id).toBe("seraphim");

    const tHyphenRes = await tierOne(req("/api/tiers/t-1"), idCtx("t-1"));
    expect(tHyphenRes.status).toBe(200);
    expect((await tHyphenRes.json()).id).toBe("seraphim");

    const tUnderscoreRes = await tierOne(req("/api/tiers/t_1"), idCtx("t_1"));
    expect(tUnderscoreRes.status).toBe(200);
    expect((await tUnderscoreRes.json()).id).toBe("seraphim");

    const zeroRankRes = await tierOne(req("/api/tiers/01"), idCtx("01"));
    expect(zeroRankRes.status).toBe(200);
    expect((await zeroRankRes.json()).id).toBe("seraphim");

    const tierUnderscoreRes = await tierOne(req("/api/tiers/tier_01"), idCtx("tier_01"));
    expect(tierUnderscoreRes.status).toBe(200);
    expect((await tierUnderscoreRes.json()).id).toBe("seraphim");
  });

  it.each(["free", "enterprise-plus", "", "   ", "__proto__", "constructor", "toString"])(
    "returns a JSON 404 for %j",
    async (id) => {
      const res = await tierOne(req(`/api/tiers/${id}`), idCtx(id));
      expect(res.status).toBe(404);
      expect(res.headers.get("content-type")).toContain("application/json");
      expect(await res.json()).toMatchObject({ error: "not_found" });
    },
  );

  it("generateStaticParams covers all four tiers", () => {
    expect(tierParams()).toEqual(tiers.map((t) => ({ id: t.id })));
  });
});

describe("HTTP helper utilities", () => {
  it("methodNotAllowed returns 405 with JSON body, Allow header, and hardening headers", async () => {
    const res = methodNotAllowed(["GET", "HEAD"]);
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("GET, HEAD");
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(await res.json()).toMatchObject({ error: "method_not_allowed" });

    // Default arguments
    const defRes = methodNotAllowed();
    expect(defRes.status).toBe(405);
    expect(defRes.headers.get("allow")).toBe("GET, HEAD");
  });

  it("badRequest returns 400 with error and custom message", async () => {
    const res = badRequest("Invalid parameter format");
    expect(res.status).toBe(400);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    const body = await res.json();
    expect(body).toEqual({ error: "bad_request", message: "Invalid parameter format" });

    // Handles default or empty message
    expect(await badRequest().json()).toEqual({ error: "bad_request", message: "Bad request" });
    expect(await badRequest("   ").json()).toEqual({ error: "bad_request", message: "Bad request" });
  });

  it("notFound returns 404 with error and message", async () => {
    const res = notFound("target document");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "not_found", message: "target document not found" });

    // Handles default or empty what
    expect(await notFound().json()).toEqual({ error: "not_found", message: "resource not found" });
    expect(await notFound("   ").json()).toEqual({ error: "not_found", message: "resource not found" });
  });

  it("json helper merges custom headers, custom cacheControl, and security headers", async () => {
    const res = json({ hello: "world" }, {
      status: 201,
      cacheControl: "private, max-age=60",
      headers: { "X-Custom-Header": "custom-val" },
    });
    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toBe("private, max-age=60");
    expect(res.headers.get("x-custom-header")).toBe("custom-val");
    for (const [key, val] of Object.entries(SECURITY_HEADERS)) {
      expect(res.headers.get(key.toLowerCase())).toBe(val);
    }

    // Default options
    const defRes = json({ status: "ok" });
    expect(defRes.status).toBe(200);
    expect(defRes.headers.get("cache-control")).toBe("no-store");
    expect(defRes.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(await defRes.json()).toEqual({ status: "ok" });

    // Handles undefined safely by serializing null rather than emitting empty body
    const undefRes = json(undefined);
    expect(undefRes.status).toBe(200);
    expect(await undefRes.json()).toBeNull();

    // Safely handles functions and symbols by serializing to null instead of omitting body
    const fnRes = json(() => {});
    expect(fnRes.status).toBe(200);
    expect(await fnRes.json()).toBeNull();

    const symRes = json(Symbol("test"));
    expect(symRes.status).toBe(200);
    expect(await symRes.json()).toBeNull();

    // Safely handles non-serializable objects (BigInt or circular) by returning 500 response
    const circularObj: Record<string, unknown> = {};
    circularObj.self = circularObj;
    const circRes = json(circularObj);
    expect(circRes.status).toBe(500);
    expect(circRes.headers.get("cache-control")).toBe("no-store");
    expect(circRes.headers.get("x-frame-options")).toBe("DENY");
    expect(await circRes.json()).toEqual({ error: "internal_error", message: "Serialization failed" });

    const bigIntRes = json({ n: BigInt(123) });
    expect(bigIntRes.status).toBe(500);
    expect(await bigIntRes.json()).toEqual({ error: "internal_error", message: "Serialization failed" });
  });

  it("parseLimit handles valid, aliases (take, pageSize, page_size, per_page, size, count, max), invalid, negative, and capped limits", () => {
    expect(parseLimit(new URLSearchParams("limit=5"))).toBe(5);
    expect(parseLimit(new URLSearchParams("take=5"))).toBe(5);
    expect(parseLimit(new URLSearchParams("pageSize=5"))).toBe(5);
    expect(parseLimit(new URLSearchParams("page_size=5"))).toBe(5);
    expect(parseLimit(new URLSearchParams("per_page=5"))).toBe(5);
    expect(parseLimit(new URLSearchParams("size=5"))).toBe(5);
    expect(parseLimit(new URLSearchParams("count=5"))).toBe(5);
    expect(parseLimit(new URLSearchParams("perPage=5"))).toBe(5);
    expect(parseLimit(new URLSearchParams("page_limit=5"))).toBe(5);
    expect(parseLimit(new URLSearchParams("pageLimit=5"))).toBe(5);
    expect(parseLimit(new URLSearchParams("items=5"))).toBe(5);
    expect(parseLimit(new URLSearchParams("items_per_page=5"))).toBe(5);
    expect(parseLimit(new URLSearchParams("itemsPerPage=5"))).toBe(5);
    expect(parseLimit(new URLSearchParams("max=5"))).toBe(5);
    expect(parseLimit(new URLSearchParams("take=0"))).toBeUndefined();
    expect(parseLimit(new URLSearchParams("take=-10"))).toBeUndefined();
    expect(parseLimit(new URLSearchParams("take=250"), 100)).toBe(100);
    expect(parseLimit(new URLSearchParams("limit=3&take=10"))).toBe(3);
    expect(parseLimit(new URLSearchParams("limit=0"))).toBeUndefined();
    expect(parseLimit(new URLSearchParams("limit=%2B0"))).toBeUndefined();
    expect(parseLimit(new URLSearchParams("limit=%2B"))).toBeUndefined();
    expect(parseLimit(new URLSearchParams("limit=-10"))).toBeUndefined();
    expect(parseLimit(new URLSearchParams("limit=abc"))).toBeUndefined();
    expect(parseLimit(new URLSearchParams(""))).toBeUndefined();
    expect(parseLimit(new URLSearchParams("limit=250"), 100)).toBe(100);
    expect(parseLimit(new URLSearchParams("limit=50"), 100)).toBe(50);
    expect(parseLimit(new URLSearchParams("limit=50"), 25)).toBe(25);
    expect(parseLimit(new URLSearchParams("limit=10"), 25)).toBe(10);
    // Strict: partial numerics are rejected rather than truncated by parseInt.
    expect(parseLimit(new URLSearchParams("limit=1e3"))).toBeUndefined();
    expect(parseLimit(new URLSearchParams("limit=2.5"))).toBeUndefined();
    expect(parseLimit(new URLSearchParams("limit=10abc"))).toBeUndefined();
    expect(parseLimit(new URLSearchParams("limit=0x10"))).toBeUndefined();
    expect(parseLimit(new URLSearchParams("limit=1 2"))).toBeUndefined();
    // Whitespace padding and leading zeros are tolerated; huge values clamp to max.
    expect(parseLimit(new URLSearchParams("limit=%207%20"))).toBe(7);
    expect(parseLimit(new URLSearchParams("limit=007"))).toBe(7);
    expect(parseLimit(new URLSearchParams("limit=%2B15"))).toBe(15);
    expect(parseLimit(new URLSearchParams("limit=%2B%2B15"))).toBeUndefined();
    expect(parseLimit(new URLSearchParams("limit=%2B-15"))).toBeUndefined();
    expect(parseLimit(new URLSearchParams("limit=NaN"))).toBeUndefined();
    expect(parseLimit(new URLSearchParams("limit=Infinity"))).toBeUndefined();
    expect(parseLimit(new URLSearchParams("limit=-Infinity"))).toBeUndefined();
    expect(parseLimit(new URLSearchParams("limit=\t42\n"))).toBe(42);
    expect(parseLimit(new URLSearchParams(`limit=${"9".repeat(400)}`), 100)).toBe(100);
    // Defensive against invalid params or non-positive max
    expect(parseLimit(undefined as unknown as URLSearchParams)).toBeUndefined();
    expect(parseLimit(null as unknown as URLSearchParams)).toBeUndefined();
    expect(parseLimit(new URLSearchParams("limit=5"), 0)).toBeUndefined();
    expect(parseLimit(new URLSearchParams("limit=5"), -10)).toBeUndefined();
    expect(parseLimit(new URLSearchParams("limit=5"), Number.NaN)).toBeUndefined();
    expect(parseLimit(new URLSearchParams("limit=5"), Number.POSITIVE_INFINITY)).toBeUndefined();
    expect(parseLimit(new URLSearchParams("limit=5"), 3.9)).toBe(3);
  });

  it("parsePage handles valid, p alias, pageNum, page_num, non-numeric, zero, and capped pages", () => {
    expect(parsePage(new URLSearchParams("page=1"))).toBe(1);
    expect(parsePage(new URLSearchParams("page=5"))).toBe(5);
    expect(parsePage(new URLSearchParams("p=3"))).toBe(3);
    expect(parsePage(new URLSearchParams("pageNum=4"))).toBe(4);
    expect(parsePage(new URLSearchParams("page_num=7"))).toBe(7);
    expect(parsePage(new URLSearchParams("pageNumber=8"))).toBe(8);
    expect(parsePage(new URLSearchParams("page_number=9"))).toBe(9);
    expect(parsePage(new URLSearchParams("pageNo=10"))).toBe(10);
    expect(parsePage(new URLSearchParams("page_no=11"))).toBe(11);
    expect(parsePage(new URLSearchParams("page=0"))).toBeUndefined();
    expect(parsePage(new URLSearchParams("page=-1"))).toBeUndefined();
    expect(parsePage(new URLSearchParams("page=abc"))).toBeUndefined();
    expect(parsePage(new URLSearchParams("page=1.5"))).toBeUndefined();
    expect(parsePage(new URLSearchParams("page=%2B2"))).toBe(2);
    expect(parsePage(new URLSearchParams("page=500"), 100)).toBe(100);
    expect(parsePage(undefined as unknown as URLSearchParams)).toBeUndefined();
    expect(parsePage(null as unknown as URLSearchParams)).toBeUndefined();
    expect(parsePage(new URLSearchParams("page=2"), 0)).toBeUndefined();
    expect(parsePage(new URLSearchParams("page=2"), -5)).toBeUndefined();
  });

  it("parseSortOrder handles asc, desc, direction aliases, case-insensitivity, and fallback", () => {
    expect(parseSortOrder(new URLSearchParams("order=asc"))).toBe("asc");
    expect(parseSortOrder(new URLSearchParams("order=ascending"))).toBe("asc");
    expect(parseSortOrder(new URLSearchParams("order=oldest"))).toBe("asc");
    expect(parseSortOrder(new URLSearchParams("order=earliest"))).toBe("asc");
    expect(parseSortOrder(new URLSearchParams("order=first"))).toBe("asc");
    expect(parseSortOrder(new URLSearchParams("order=desc"))).toBe("desc");
    expect(parseSortOrder(new URLSearchParams("order=descending"))).toBe("desc");
    expect(parseSortOrder(new URLSearchParams("order=newest"))).toBe("desc");
    expect(parseSortOrder(new URLSearchParams("order=latest"))).toBe("desc");
    expect(parseSortOrder(new URLSearchParams("order=last"))).toBe("desc");
    expect(parseSortOrder(new URLSearchParams("order=reverse"))).toBe("desc");
    expect(parseSortOrder(new URLSearchParams("sort=ASC"))).toBe("asc");
    expect(parseSortOrder(new URLSearchParams("sort_order=desc"))).toBe("desc");
    expect(parseSortOrder(new URLSearchParams("sortOrder=asc"))).toBe("asc");
    expect(parseSortOrder(new URLSearchParams("sort_dir=desc"))).toBe("desc");
    expect(parseSortOrder(new URLSearchParams("sortDir=asc"))).toBe("asc");
    expect(parseSortOrder(new URLSearchParams("dir=desc"))).toBe("desc");
    expect(parseSortOrder(new URLSearchParams("direction=asc"))).toBe("asc");
    expect(parseSortOrder(new URLSearchParams("direction=desc"))).toBe("desc");
    expect(parseSortOrder(new URLSearchParams("orderBy=asc"))).toBe("asc");
    expect(parseSortOrder(new URLSearchParams("order_by=desc"))).toBe("desc");
    expect(parseSortOrder(new URLSearchParams("ordering=newer"))).toBe("desc");
    expect(parseSortOrder(new URLSearchParams("ordering=older"))).toBe("asc");
    expect(parseSortOrder(new URLSearchParams("order=chronological"))).toBe("asc");
    expect(parseSortOrder(new URLSearchParams("order=reverse-chronological"))).toBe("desc");
    expect(parseSortOrder(new URLSearchParams("order=custom"), "order")).toBeUndefined();
    expect(parseSortOrder(new URLSearchParams(""))).toBeUndefined();
    expect(parseSortOrder(undefined as unknown as URLSearchParams)).toBeUndefined();
    expect(parseSortOrder(null as unknown as URLSearchParams)).toBeUndefined();
  });

  it("parseSearchQuery handles valid, whitespace, and custom param keys", () => {
    expect(parseSearchQuery(new URLSearchParams("q=Seraphim"))).toBe("seraphim");
    expect(parseSearchQuery(new URLSearchParams("query=Seraphim"))).toBe("seraphim");
    expect(parseSearchQuery(new URLSearchParams("search=Seraphim"))).toBe("seraphim");
    expect(parseSearchQuery(new URLSearchParams("keyword=Seraphim"))).toBe("seraphim");
    expect(parseSearchQuery(new URLSearchParams("term=Seraphim"))).toBe("seraphim");
    expect(parseSearchQuery(new URLSearchParams("filter=Seraphim"))).toBe("seraphim");
    expect(parseSearchQuery(new URLSearchParams("find=Seraphim"))).toBe("seraphim");
    expect(parseSearchQuery(new URLSearchParams("search_query=Seraphim"))).toBe("seraphim");
    expect(parseSearchQuery(new URLSearchParams("searchQuery=Seraphim"))).toBe("seraphim");
    expect(parseSearchQuery(new URLSearchParams("lookup=Seraphim"))).toBe("seraphim");
    expect(parseSearchQuery(new URLSearchParams("q_term=Seraphim"))).toBe("seraphim");
    expect(parseSearchQuery(new URLSearchParams("qTerm=Seraphim"))).toBe("seraphim");
    expect(parseSearchQuery(new URLSearchParams("q=  Modal  "))).toBe("modal");
    expect(parseSearchQuery(new URLSearchParams("q=openai%20huggingface"))).toBe("openai huggingface");
    expect(parseSearchQuery(new URLSearchParams("q=   "))).toBeUndefined();
    expect(parseSearchQuery(new URLSearchParams("q="))).toBeUndefined();
    expect(parseSearchQuery(new URLSearchParams(""))).toBeUndefined();
    expect(parseSearchQuery(new URLSearchParams("tier=CHERUBIM"), "tier")).toBe("cherubim");
    expect(parseSearchQuery(new URLSearchParams("year=2026"), "year")).toBe("2026");
    expect(parseSearchQuery(undefined as unknown as URLSearchParams)).toBeUndefined();
    expect(parseSearchQuery(null as unknown as URLSearchParams)).toBeUndefined();
    expect(parseSearchQuery(new URLSearchParams("q=test"), "")).toBeUndefined();
    expect(parseSearchQuery(new URLSearchParams("q=test"), null as unknown as string)).toBeUndefined();
  });

  it("parseOffset handles valid, skip alias, page-based calculation, negative, invalid, and capped offsets", () => {
    expect(parseOffset(new URLSearchParams("offset=5"))).toBe(5);
    expect(parseOffset(new URLSearchParams("skip=3"))).toBe(3);
    expect(parseOffset(new URLSearchParams("start=4"))).toBe(4);
    expect(parseOffset(new URLSearchParams("from=6"))).toBe(6);
    expect(parseOffset(new URLSearchParams("start_at=7"))).toBe(7);
    expect(parseOffset(new URLSearchParams("startAt=8"))).toBe(8);
    expect(parseOffset(new URLSearchParams("start_index=9"))).toBe(9);
    expect(parseOffset(new URLSearchParams("startIndex=10"))).toBe(10);
    expect(parseOffset(new URLSearchParams("from_index=11"))).toBe(11);
    expect(parseOffset(new URLSearchParams("fromIndex=12"))).toBe(12);
    expect(parseOffset(new URLSearchParams("offset=0"))).toBe(0);
    expect(parseOffset(new URLSearchParams("skip=0"))).toBe(0);
    expect(parseOffset(new URLSearchParams("offset=%2B4"))).toBe(4);
    expect(parseOffset(new URLSearchParams("offset=-1"))).toBeUndefined();
    expect(parseOffset(new URLSearchParams("offset=abc"))).toBeUndefined();
    expect(parseOffset(new URLSearchParams("offset=1e3"))).toBeUndefined();
    expect(parseOffset(new URLSearchParams("offset=2.5"))).toBeUndefined();
    expect(parseOffset(new URLSearchParams("offset="))).toBeUndefined();
    expect(parseOffset(new URLSearchParams("offset=   "))).toBeUndefined();
    expect(parseOffset(new URLSearchParams(""))).toBeUndefined();
    expect(parseOffset(new URLSearchParams("offset=500"), 100)).toBe(100);
    expect(parseOffset(new URLSearchParams("offset=50"), 100)).toBe(50);
    // Page-based offset calculation
    expect(parseOffset(new URLSearchParams("page=1&limit=5"))).toBe(0);
    expect(parseOffset(new URLSearchParams("page=2&limit=5"))).toBe(5);
    expect(parseOffset(new URLSearchParams("page=3&limit=5"))).toBe(10);
    expect(parseOffset(new URLSearchParams("p=2&take=10"))).toBe(10);
    expect(parseOffset(new URLSearchParams("page=2"), 10000, 4)).toBe(4);
    // Offset takes precedence over page
    expect(parseOffset(new URLSearchParams("offset=8&page=2&limit=5"))).toBe(8);
    // Page without size returns undefined
    expect(parseOffset(new URLSearchParams("page=2"))).toBeUndefined();
    expect(parseOffset(undefined as unknown as URLSearchParams)).toBeUndefined();
    expect(parseOffset(null as unknown as URLSearchParams)).toBeUndefined();
    expect(parseOffset(new URLSearchParams("offset=5"), -1)).toBeUndefined();
    expect(parseOffset(new URLSearchParams("offset=5"), Number.NaN)).toBeUndefined();
  });
});

describe("GET /api/scenarios", () => {
  it("returns all scenarios, count, and cache headers", async () => {
    const res = scenariosIndex();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("s-maxage");
    const body = await res.json();
    expect(body.count).toBe(scenarios.length);
    expect(body.scenarios).toHaveLength(scenarios.length);
    for (const sc of body.scenarios) {
      expect(sc.id).toBeDefined();
      expect(sc.title.length).toBeGreaterThan(0);
      expect(sc.target.length).toBeGreaterThan(0);
      expect(sc.url).toBe(`/incident-case-studies#${sc.id}`);
      expect(sc.refsCount).toBeGreaterThanOrEqual(0);
    }
  });

  it("filters scenarios by search query q", async () => {
    const res = scenariosIndex(req("/api/scenarios?q=domain"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(1);
    expect(body.scenarios[0].id).toBe("onprem-domain");
    expect(body.totalCount).toBe(scenarios.length);
  });

  it("limits scenarios result count and handles whitespace query", async () => {
    const limitRes = scenariosIndex(req("/api/scenarios?limit=2"));
    expect(limitRes.status).toBe(200);
    const limitBody = await limitRes.json();
    expect(limitBody.scenarios).toHaveLength(2);
    expect(limitBody.count).toBe(2);
    expect(limitBody.totalCount).toBe(scenarios.length);

    const spaceRes = scenariosIndex(req("/api/scenarios?q=%20%20"));
    expect(spaceRes.status).toBe(200);
    expect((await spaceRes.json()).count).toBe(scenarios.length);
  });

  it("searches across target, weaknessClass, approach, controls, and seraphim fields, and handles empty results", async () => {
    const weakRes = scenariosIndex(req("/api/scenarios?q=credential"));
    expect(weakRes.status).toBe(200);
    expect((await weakRes.json()).count).toBeGreaterThan(0);

    const targetRes = scenariosIndex(req("/api/scenarios?q=internal"));
    expect(targetRes.status).toBe(200);
    expect((await targetRes.json()).count).toBeGreaterThan(0);

    // Search in approach
    const approachRes = scenariosIndex(req("/api/scenarios?q=repetitive"));
    expect(approachRes.status).toBe(200);
    expect((await approachRes.json()).count).toBeGreaterThan(0);

    // Search in controls
    const controlsRes = scenariosIndex(req("/api/scenarios?q=segment%20by%20role"));
    expect(controlsRes.status).toBe(200);
    expect((await controlsRes.json()).count).toBeGreaterThan(0);

    // Search in seraphim
    const seraphimRes = scenariosIndex(req("/api/scenarios?q=authorization"));
    expect(seraphimRes.status).toBe(200);
    expect((await seraphimRes.json()).count).toBeGreaterThan(0);

    // Search by scenario code n and speed field
    const codeRes = scenariosIndex(req("/api/scenarios?q=h6"));
    expect(codeRes.status).toBe(200);
    const codeBody = await codeRes.json();
    expect(codeBody.count).toBe(1);
    expect(codeBody.scenarios[0].id).toBe("agent-sandbox-egress");

    const speedRes = scenariosIndex(req("/api/scenarios?q=29%20minutes"));
    expect(speedRes.status).toBe(200);
    const speedBody = await speedRes.json();
    expect(speedBody.count).toBe(1);
    expect(speedBody.scenarios[0].id).toBe("legacy-edge-appliance");

    const refRes = scenariosIndex(req("/api/scenarios?q=oaiaug"));
    expect(refRes.status).toBe(200);
    expect((await refRes.json()).count).toBeGreaterThan(0);

    const noneRes = scenariosIndex(req("/api/scenarios?q=no-match-scenario-xyz"));
    expect(noneRes.status).toBe(200);
    expect((await noneRes.json()).count).toBe(0);

    const fallbackRes = scenariosIndex({ url: "http://" } as unknown as Request);
    expect(fallbackRes.status).toBe(200);
    expect((await fallbackRes.json()).count).toBe(scenarios.length);
  });

  it("filters scenarios by cited reference ID, weaknessClass, target, and supports offset", async () => {
    const refRes = scenariosIndex(req("/api/scenarios?ref=cs26"));
    expect(refRes.status).toBe(200);
    const refBody = await refRes.json();
    expect(refBody.count).toBeGreaterThan(0);

    const noneRes = scenariosIndex(req("/api/scenarios?ref=nonexistent-ref"));
    expect(noneRes.status).toBe(200);
    expect((await noneRes.json()).count).toBe(0);

    const weakRes = scenariosIndex(req("/api/scenarios?weakness=credentials"));
    expect(weakRes.status).toBe(200);
    const weakBody = await weakRes.json();
    expect(weakBody.count).toBeGreaterThan(0);
    expect(weakBody.scenarios.every((s: { weaknessClass: string[] }) => s.weaknessClass.some((w) => w.toLowerCase().includes("credentials")))).toBe(true);

    const targetRes = scenariosIndex(req("/api/scenarios?target=directory"));
    expect(targetRes.status).toBe(200);
    const targetBody = await targetRes.json();
    expect(targetBody.count).toBe(1);
    expect(targetBody.scenarios[0].id).toBe("onprem-domain");

    const offRes = scenariosIndex(req("/api/scenarios?offset=2&limit=2"));
    expect(offRes.status).toBe(200);
    const offBody = await offRes.json();
    expect(offBody.count).toBe(2);
    expect(offBody.totalCount).toBe(scenarios.length);
  });

  it("filters scenarios by id or n parameter with prefix and code flexibility", async () => {
    const idRes = scenariosIndex(req("/api/scenarios?id=onprem-domain"));
    expect(idRes.status).toBe(200);
    const idBody = await idRes.json();
    expect(idBody.count).toBe(1);
    expect(idBody.scenarios[0].id).toBe("onprem-domain");

    const idCodeRes = scenariosIndex(req("/api/scenarios?id=h3"));
    expect(idCodeRes.status).toBe(200);
    expect((await idCodeRes.json()).count).toBe(1);

    const idNumRes = scenariosIndex(req("/api/scenarios?id=3"));
    expect(idNumRes.status).toBe(200);
    expect((await idNumRes.json()).count).toBe(1);

    const idScRes = scenariosIndex(req("/api/scenarios?id=sc-3"));
    expect(idScRes.status).toBe(200);
    expect((await idScRes.json()).count).toBe(1);

    const idPrefixRes = scenariosIndex(req("/api/scenarios?id=scenario-h3"));
    expect(idPrefixRes.status).toBe(200);
    expect((await idPrefixRes.json()).count).toBe(1);

    const nRes = scenariosIndex(req("/api/scenarios?n=h1"));
    expect(nRes.status).toBe(200);
    const nBody = await nRes.json();
    expect(nBody.count).toBe(1);
    expect(nBody.scenarios[0].id).toBe("legacy-internal-app");

    const nDigitRes = scenariosIndex(req("/api/scenarios?n=1"));
    expect(nDigitRes.status).toBe(200);
    expect((await nDigitRes.json()).count).toBe(1);

    const nPrefixRes = scenariosIndex(req("/api/scenarios?n=sc-1"));
    expect(nPrefixRes.status).toBe(200);
    expect((await nPrefixRes.json()).count).toBe(1);

    const noneRes = scenariosIndex(req("/api/scenarios?id=nonexistent-scenario"));
    expect(noneRes.status).toBe(200);
    expect((await noneRes.json()).count).toBe(0);

    const idH01Res = scenariosIndex(req("/api/scenarios?id=h01"));
    expect(idH01Res.status).toBe(200);
    expect((await idH01Res.json()).count).toBe(1);

    const nH01Res = scenariosIndex(req("/api/scenarios?n=h01"));
    expect(nH01Res.status).toBe(200);
    expect((await nH01Res.json()).count).toBe(1);
  });

  it("supports order/sort, source alias for ref, control filter, and page-based pagination", async () => {
    const descRes = scenariosIndex(req("/api/scenarios?order=desc"));
    expect(descRes.status).toBe(200);
    const descBody = await descRes.json();
    expect(descBody.scenarios[0].id).toBe(scenarios[scenarios.length - 1].id);

    const srcAliasRes = scenariosIndex(req("/api/scenarios?source=cs26"));
    expect(srcAliasRes.status).toBe(200);
    expect((await srcAliasRes.json()).count).toBeGreaterThan(0);

    const controlRes = scenariosIndex(req("/api/scenarios?control=proxy"));
    expect(controlRes.status).toBe(200);
    expect((await controlRes.json()).count).toBeGreaterThan(0);

    const page2Res = scenariosIndex(req("/api/scenarios?page=2&limit=2"));
    expect(page2Res.status).toBe(200);
    const page2Body = await page2Res.json();
    expect(page2Body.count).toBe(2);
    expect(page2Body.scenarios[0].id).toBe(scenarios[2].id);
  });

  it("supports speed, approach, prefix-cleaned ref, count limit, and start offset", async () => {
    const speedRes = scenariosIndex(req("/api/scenarios?speed=minutes"));
    expect(speedRes.status).toBe(200);
    expect((await speedRes.json()).count).toBeGreaterThan(0);

    const approachRes = scenariosIndex(req("/api/scenarios?approach=adversary"));
    expect(approachRes.status).toBe(200);
    expect((await approachRes.json()).count).toBeGreaterThan(0);

    const refPrefixRes = scenariosIndex(req("/api/scenarios?ref=src-cs26"));
    expect(refPrefixRes.status).toBe(200);
    expect((await refPrefixRes.json()).count).toBeGreaterThan(0);

    const countRes = scenariosIndex(req("/api/scenarios?count=2"));
    expect(countRes.status).toBe(200);
    expect((await countRes.json()).count).toBe(2);

    const startRes = scenariosIndex(req("/api/scenarios?start=1&count=2"));
    expect(startRes.status).toBe(200);
    expect((await startRes.json()).count).toBe(2);
  });

  it("supports ?title= and ?weakness_class= alias on /api/scenarios", async () => {
    const titleRes = scenariosIndex(req("/api/scenarios?title=legacy"));
    expect(titleRes.status).toBe(200);
    expect((await titleRes.json()).count).toBeGreaterThan(0);

    const weaknessClassRes = scenariosIndex(req("/api/scenarios?weakness_class=credentials"));
    expect(weaknessClassRes.status).toBe(200);
    expect((await weaknessClassRes.json()).count).toBeGreaterThan(0);
  });
});

describe("GET /api/scenarios/[id]", () => {
  it("resolves scenarios with underscore prefixes and URL-encoding", async () => {
    const underRes = await scenarioOne(req("/api/scenarios/scenario_h1"), idCtx("scenario_h1"));
    expect(underRes.status).toBe(200);
    expect((await underRes.json()).id).toBe("legacy-internal-app");

    const encodedRes = await scenarioOne(req("/api/scenarios/legacy%2Dinternal%2Dapp"), idCtx("legacy%2Dinternal%2Dapp"));
    expect(encodedRes.status).toBe(200);
    expect((await encodedRes.json()).id).toBe("legacy-internal-app");
  });
  it("returns each scenario with resolved source references", async () => {
    for (const sc of scenarios) {
      const res = await scenarioOne(req(`/api/scenarios/${sc.id}`), idCtx(sc.id));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(sc.id);
      expect(body.title).toBe(sc.title);
      expect(body.approach.length).toBeGreaterThan(0);
      expect(body.controls.length).toBeGreaterThan(0);
      expect(body.refs).toHaveLength(sc.refs.length);
      for (const r of body.refs) expect(r.url).toBe(S[r.id].url);
    }
  });

  it("supports case-insensitive scenario lookup, scenario numbers (h1, H1, 1), and trims whitespace", async () => {
    const first = scenarios[0];
    const res = await scenarioOne(req(`/api/scenarios/${first.id.toUpperCase()}`), idCtx(first.id.toUpperCase()));
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe(first.id);

    const hNumRes = await scenarioOne(req("/api/scenarios/h1"), idCtx("h1"));
    expect(hNumRes.status).toBe(200);
    expect((await hNumRes.json()).id).toBe(first.id);

    const hUpperRes = await scenarioOne(req("/api/scenarios/H1"), idCtx("H1"));
    expect(hUpperRes.status).toBe(200);
    expect((await hUpperRes.json()).id).toBe(first.id);

    const digitRes = await scenarioOne(req("/api/scenarios/1"), idCtx("1"));
    expect(digitRes.status).toBe(200);
    expect((await digitRes.json()).id).toBe(first.id);

    const trimRes = await scenarioOne(req(`/api/scenarios/${first.id}`), idCtx(`  ${first.id}  `));
    expect(trimRes.status).toBe(200);
    expect((await trimRes.json()).id).toBe(first.id);

    const scPrefixRes = await scenarioOne(req("/api/scenarios/scenario-h1"), idCtx("scenario-h1"));
    expect(scPrefixRes.status).toBe(200);
    expect((await scPrefixRes.json()).id).toBe(first.id);

    const scShortRes = await scenarioOne(req("/api/scenarios/sc-1"), idCtx("sc-1"));
    expect(scShortRes.status).toBe(200);
    expect((await scShortRes.json()).id).toBe(first.id);

    const scHyphenRes = await scenarioOne(req("/api/scenarios/h-1"), idCtx("h-1"));
    expect(scHyphenRes.status).toBe(200);
    expect((await scHyphenRes.json()).id).toBe(first.id);

    const jsonRes = await scenarioOne(req(`/api/scenarios/${first.id}.json`), idCtx(`${first.id}.json`));
    expect(jsonRes.status).toBe(200);
    expect((await jsonRes.json()).id).toBe(first.id);

    const htmlRes = await scenarioOne(req(`/api/scenarios/${first.id}.html`), idCtx(`${first.id}.html`));
    expect(htmlRes.status).toBe(200);
    expect((await htmlRes.json()).id).toBe(first.id);
  });

  it.each(["nonexistent-scenario", "", "   ", "../etc/passwd", "__proto__", "constructor", "toString"])(
    "returns a JSON 404 for %j",
    async (id) => {
      const res = await scenarioOne(req(`/api/scenarios/${id}`), idCtx(id));
      expect(res.status).toBe(404);
      expect(res.headers.get("content-type")).toContain("application/json");
      expect(await res.json()).toMatchObject({ error: "not_found" });
    },
  );

  it("generateStaticParams covers all scenarios and filters out unresolvable ref IDs", async () => {
    expect(scenarioParams()).toEqual(scenarios.map((s) => ({ id: s.id })));

    const spy = vi.spyOn(incidentsModule, "scenarioById").mockReturnValueOnce({
      ...scenarios[0],
      refs: ["cs26", "nonexistent", "__proto__"],
    });
    const res = await scenarioOne(req(`/api/scenarios/${scenarios[0].id}`), idCtx(scenarios[0].id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.refs).toHaveLength(1);
    expect(body.refs[0].id).toBe("cs26");
    spy.mockRestore();
  });
});

describe("GET /api/sources", () => {
  it("returns all registered sources with count and cache headers", async () => {
    const res = sourcesIndex();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("s-maxage");
    const body = await res.json();
    expect(body.count).toBe(sources.length);
    expect(body.sources).toHaveLength(sources.length);
    for (const src of body.sources) {
      expect(src.id).toBeDefined();
      expect(src.label.length).toBeGreaterThan(0);
      expect(src.url).toMatch(/^https:\/\//);
      expect(src.date.length).toBeGreaterThan(0);
    }
  });

  it("filters sources by year and query q", async () => {
    const res = sourcesIndex(req("/api/sources?year=2026"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBeGreaterThan(0);
    expect(body.totalCount).toBe(sources.length);

    const qRes = sourcesIndex(req("/api/sources?q=anthropic"));
    const qBody = await qRes.json();
    expect(qBody.count).toBeGreaterThan(0);
  });

  it("limits sources result count, trims year, and handles whitespace query", async () => {
    const limitRes = sourcesIndex(req("/api/sources?limit=3"));
    expect(limitRes.status).toBe(200);
    const limitBody = await limitRes.json();
    expect(limitBody.sources).toHaveLength(3);
    expect(limitBody.count).toBe(3);
    expect(limitBody.totalCount).toBe(sources.length);

    const yearTrimRes = sourcesIndex(req("/api/sources?year=%202026%20"));
    expect(yearTrimRes.status).toBe(200);
    const yearTrimBody = await yearTrimRes.json();
    expect(yearTrimBody.count).toBeGreaterThan(0);
    expect(yearTrimBody.sources.every((s: { date: string }) => s.date.includes("2026"))).toBe(true);

    const spaceRes = sourcesIndex(req("/api/sources?q=%20%20"));
    expect(spaceRes.status).toBe(200);
    expect((await spaceRes.json()).count).toBe(sources.length);
  });

  it("searches across note, url, and date fields, supports combined filters, and handles empty results", async () => {
    const noteRes = sourcesIndex(req("/api/sources?q=threat-intel"));
    expect(noteRes.status).toBe(200);
    expect((await noteRes.json()).count).toBeGreaterThan(0);

    const urlRes = sourcesIndex(req("/api/sources?q=bleepingcomputer"));
    expect(urlRes.status).toBe(200);
    expect((await urlRes.json()).count).toBeGreaterThan(0);

    // Search in date
    const dateRes = sourcesIndex(req("/api/sources?q=feb%202026"));
    expect(dateRes.status).toBe(200);
    expect((await dateRes.json()).count).toBeGreaterThan(0);

    const combinedRes = sourcesIndex(req("/api/sources?year=2025&q=anthropic"));
    expect(combinedRes.status).toBe(200);
    const combinedBody = await combinedRes.json();
    expect(combinedBody.count).toBeGreaterThan(0);
    expect(combinedBody.sources.every((s: { date: string }) => s.date.includes("2025"))).toBe(true);

    // Case-insensitive month/date substring via ?year=
    const monthRes = sourcesIndex(req("/api/sources?year=Aug"));
    expect(monthRes.status).toBe(200);
    expect((await monthRes.json()).count).toBeGreaterThan(0);

    expect(parseLimit(new URLSearchParams("limit=5"), 0.5)).toBeUndefined();

    const noneRes = sourcesIndex(req("/api/sources?year=1990"));
    expect(noneRes.status).toBe(200);
    expect((await noneRes.json()).count).toBe(0);

    const fallbackRes = sourcesIndex({ url: "http://" } as unknown as Request);
    expect(fallbackRes.status).toBe(200);
    expect((await fallbackRes.json()).count).toBe(sources.length);
  });

  it("filters sources by note/type and supports offset / skip", async () => {
    const typeRes = sourcesIndex(req("/api/sources?type=primary"));
    expect(typeRes.status).toBe(200);
    const typeBody = await typeRes.json();
    expect(typeBody.count).toBeGreaterThan(0);
    expect(typeBody.sources.every((s: { note?: string }) => s.note?.toLowerCase().includes("primary"))).toBe(true);

    const noteRes = sourcesIndex(req("/api/sources?note=secondary"));
    expect(noteRes.status).toBe(200);
    const noteBody = await noteRes.json();
    expect(noteBody.count).toBeGreaterThan(0);
    expect(noteBody.sources.every((s: { note?: string }) => s.note?.toLowerCase().includes("secondary"))).toBe(true);

    const offRes = sourcesIndex(req("/api/sources?offset=5&limit=3"));
    expect(offRes.status).toBe(200);
    const offBody = await offRes.json();
    expect(offBody.count).toBe(3);
    expect(offBody.totalCount).toBe(sources.length);

    const idRes = sourcesIndex(req("/api/sources?id=oaiAug"));
    expect(idRes.status).toBe(200);
    const idBody = await idRes.json();
    expect(idBody.count).toBe(1);
    expect(idBody.sources[0].id).toBe("oaiAug");

    const upperIdRes = sourcesIndex(req("/api/sources?id=OAIAUG"));
    expect(upperIdRes.status).toBe(200);
    expect((await upperIdRes.json()).count).toBe(1);

    const sourceAliasRes = sourcesIndex(req("/api/sources?source=oaiAug"));
    expect(sourceAliasRes.status).toBe(200);
    expect((await sourceAliasRes.json()).count).toBe(1);

    const refAliasRes = sourcesIndex(req("/api/sources?ref=oaiAug"));
    expect(refAliasRes.status).toBe(200);
    expect((await refAliasRes.json()).count).toBe(1);

    const slugAliasRes = sourcesIndex(req("/api/sources?slug=oaiAug"));
    expect(slugAliasRes.status).toBe(200);
    expect((await slugAliasRes.json()).count).toBe(1);

    const numIndexRes = sourcesIndex(req("/api/sources?id=1"));
    expect(numIndexRes.status).toBe(200);
    expect((await numIndexRes.json()).sources[0].id).toBe("oaiAug");

    const zeroIndexRes = sourcesIndex(req("/api/sources?id=01"));
    expect(zeroIndexRes.status).toBe(200);
    expect((await zeroIndexRes.json()).sources[0].id).toBe("oaiAug");

    const sIndexRes = sourcesIndex(req("/api/sources?id=s1"));
    expect(sIndexRes.status).toBe(200);
    expect((await sIndexRes.json()).sources[0].id).toBe("oaiAug");

    const sHyphenRes = sourcesIndex(req("/api/sources?id=s-1"));
    expect(sHyphenRes.status).toBe(200);
    expect((await sHyphenRes.json()).sources[0].id).toBe("oaiAug");

    const nAliasRes = sourcesIndex(req("/api/sources?n=1"));
    expect(nAliasRes.status).toBe(200);
    expect((await nAliasRes.json()).sources[0].id).toBe("oaiAug");

    const titleRes = sourcesIndex(req("/api/sources?title=Hugging"));
    expect(titleRes.status).toBe(200);
    expect((await titleRes.json()).count).toBeGreaterThan(0);

    const srcPrefixRes = sourcesIndex(req("/api/sources?id=src-oaiAug"));
    expect(srcPrefixRes.status).toBe(200);
    expect((await srcPrefixRes.json()).count).toBe(1);

    const sourcePrefixRes = sourcesIndex(req("/api/sources?id=source-oaiAug"));
    expect(sourcePrefixRes.status).toBe(200);
    expect((await sourcePrefixRes.json()).count).toBe(1);

    const noneRes = sourcesIndex(req("/api/sources?id=nonexistent-source"));
    expect(noneRes.status).toBe(200);
    expect((await noneRes.json()).count).toBe(0);
  });

  it("supports order/sort descending and page-based pagination", async () => {
    const descRes = sourcesIndex(req("/api/sources?order=desc"));
    expect(descRes.status).toBe(200);
    const descBody = await descRes.json();
    expect(descBody.sources[0].id).toBe(sources[sources.length - 1].id);

    const page2Res = sourcesIndex(req("/api/sources?page=2&limit=3"));
    expect(page2Res.status).toBe(200);
    const page2Body = await page2Res.json();
    expect(page2Body.count).toBe(3);
    expect(page2Body.sources[0].id).toBe(sources[3].id);
  });

  it("supports date alias, label filter, count limit, and start offset", async () => {
    const dateRes = sourcesIndex(req("/api/sources?date=2026"));
    expect(dateRes.status).toBe(200);
    expect((await dateRes.json()).count).toBeGreaterThan(0);

    const labelRes = sourcesIndex(req("/api/sources?label=CrowdStrike"));
    expect(labelRes.status).toBe(200);
    expect((await labelRes.json()).count).toBeGreaterThan(0);

    const countRes = sourcesIndex(req("/api/sources?count=2"));
    expect(countRes.status).toBe(200);
    expect((await countRes.json()).count).toBe(2);

    const startRes = sourcesIndex(req("/api/sources?start=2&count=2"));
    expect(startRes.status).toBe(200);
    expect((await startRes.json()).count).toBe(2);
  });
});

describe("GET /api/sources/[id]", () => {
  it("resolves sources with underscore prefix and URL-encoding", async () => {
    const underRes = await sourceOne(req("/api/sources/src_oaiAug"), idCtx("src_oaiAug"));
    expect(underRes.status).toBe(200);
    expect((await underRes.json()).id).toBe("oaiAug");

    const encodedRes = await sourceOne(req("/api/sources/oai%41ug"), idCtx("oai%41ug"));
    expect(encodedRes.status).toBe(200);
    expect((await encodedRes.json()).id).toBe("oaiAug");

    const numRes = await sourceOne(req("/api/sources/1"), idCtx("1"));
    expect(numRes.status).toBe(200);
    expect((await numRes.json()).id).toBe("oaiAug");

    const s1Res = await sourceOne(req("/api/sources/s1"), idCtx("s1"));
    expect(s1Res.status).toBe(200);
    expect((await s1Res.json()).id).toBe("oaiAug");
  });
  it("returns each source by ID", async () => {
    for (const src of sources) {
      const res = await sourceOne(req(`/api/sources/${src.id}`), idCtx(src.id));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(src.id);
      expect(body.label).toBe(src.label);
      expect(body.url).toBe(src.url);
    }
  });

  it("supports case-insensitive source lookup and trims whitespace", async () => {
    const first = sources[0];
    const res = await sourceOne(req(`/api/sources/${first.id.toUpperCase()}`), idCtx(first.id.toUpperCase()));
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe(first.id);

    const trimRes = await sourceOne(req(`/api/sources/${first.id}`), idCtx(`  ${first.id}  `));
    expect(trimRes.status).toBe(200);
    expect((await trimRes.json()).id).toBe(first.id);

    const srcPrefixRes = await sourceOne(req("/api/sources/src-oaiAug"), idCtx("src-oaiAug"));
    expect(srcPrefixRes.status).toBe(200);
    expect((await srcPrefixRes.json()).id).toBe(first.id);

    const sourcePrefixRes = await sourceOne(req("/api/sources/source-oaiAug"), idCtx("source-oaiAug"));
    expect(sourcePrefixRes.status).toBe(200);
    expect((await sourcePrefixRes.json()).id).toBe(first.id);

    const jsonRes = await sourceOne(req("/api/sources/oaiAug.json"), idCtx("oaiAug.json"));
    expect(jsonRes.status).toBe(200);
    expect((await jsonRes.json()).id).toBe(first.id);

    const htmlRes = await sourceOne(req("/api/sources/oaiAug.html"), idCtx("oaiAug.html"));
    expect(htmlRes.status).toBe(200);
    expect((await htmlRes.json()).id).toBe(first.id);
  });

  it.each(["nonexistent-source", "", "   ", "../etc/passwd", "__proto__", "constructor", "toString"])(
    "returns a JSON 404 for %j",
    async (id) => {
      const res = await sourceOne(req(`/api/sources/${id}`), idCtx(id));
      expect(res.status).toBe(404);
      expect(res.headers.get("content-type")).toContain("application/json");
      expect(await res.json()).toMatchObject({ error: "not_found" });
    },
  );

  it("generateStaticParams covers all sources", () => {
    expect(sourceParams()).toEqual(sources.map((s) => ({ id: s.id })));
  });
});

describe("GET /api/brand", () => {
  it("returns brand metadata, trust badges, theme config, and cache headers", async () => {
    const res = brandEndpoint();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("cache-control")).toContain("s-maxage");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
    expect(res.headers.get("x-dns-prefetch-control")).toBe("off");
    const body = await res.json();
    expect(body.name).toBe(BRAND_NAME);
    expect(body.word).toBe(BRAND_WORD);
    expect(body.suffix).toBe(BRAND_SUFFIX);
    expect(body.parent).toBe(BRAND_PARENT);
    expect(body.email).toBe(BRAND_EMAIL);
    expect(body.mailSubject).toBe(`${BRAND_MAIL}%20inquiry`);
    expect(body.tagline).toBe(BRAND_TAGLINE);
    expect(body.siteUrl).toBe(SITE_URL);
    expect(body.showCodeRain).toBe(SHOW_CODE_RAIN);
    expect(body.badges).toEqual(TRUE_BADGES);
    expect(body.theme).toEqual({
      default: "dark",
      names: THEME_NAMES,
      meta: THEME_META,
    });

    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://seraphim.ai/");
    const envBody = await brandEndpoint().json();
    expect(envBody.siteUrl).toBe("https://seraphim.ai");

    const badgeRes = brandEndpoint(req("/api/brand?badge=passive"));
    expect(badgeRes.status).toBe(200);
    const badgeBody = await badgeRes.json();
    expect(badgeBody.badge).toEqual({ key: "passive", label: "Passive recon only", note: "Public information, no probing" });

    const badgePrefixRes = brandEndpoint(req("/api/brand?badge=badge-passive"));
    expect(badgePrefixRes.status).toBe(200);
    expect((await badgePrefixRes.json()).badge.key).toBe("passive");

    const badgeExtRes = brandEndpoint(req("/api/brand?badge=passive.json"));
    expect(badgeExtRes.status).toBe(200);
    expect((await badgeExtRes.json()).badge.key).toBe("passive");

    const encodedBadgeRes = brandEndpoint(req("/api/brand?key=badge%2Dlocal"));
    expect(encodedBadgeRes.status).toBe(200);
    expect((await encodedBadgeRes.json()).badge.key).toBe("local");

    const keyRes = brandEndpoint(req("/api/brand?key=local"));
    expect(keyRes.status).toBe(200);
    expect((await keyRes.json()).badge.key).toBe("local");

    const badgeKeyAliasRes = brandEndpoint(req("/api/brand?badge_key=passive"));
    expect(badgeKeyAliasRes.status).toBe(200);
    expect((await badgeKeyAliasRes.json()).badge.key).toBe("passive");

    const badgeKeyCamelRes = brandEndpoint(req("/api/brand?badgeKey=passive"));
    expect(badgeKeyCamelRes.status).toBe(200);
    expect((await badgeKeyCamelRes.json()).badge.key).toBe("passive");

    const idBadgeRes = brandEndpoint(req("/api/brand?id=passive"));
    expect(idBadgeRes.status).toBe(200);
    expect((await idBadgeRes.json()).badge.key).toBe("passive");

    const slugBadgeRes = brandEndpoint(req("/api/brand?slug=passive"));
    expect(slugBadgeRes.status).toBe(200);
    expect((await slugBadgeRes.json()).badge.key).toBe("passive");

    const numBadgeRes = brandEndpoint(req("/api/brand?badge=1"));
    expect(numBadgeRes.status).toBe(200);
    expect((await numBadgeRes.json()).badge.key).toBe("passive");

    const zeroBadgeRes = brandEndpoint(req("/api/brand?badge=01"));
    expect(zeroBadgeRes.status).toBe(200);
    expect((await zeroBadgeRes.json()).badge.key).toBe("passive");

    const b1BadgeRes = brandEndpoint(req("/api/brand?badge=b1"));
    expect(b1BadgeRes.status).toBe(200);
    expect((await b1BadgeRes.json()).badge.key).toBe("passive");

    const bHyphenBadgeRes = brandEndpoint(req("/api/brand?badge=b-1"));
    expect(bHyphenBadgeRes.status).toBe(200);
    expect((await bHyphenBadgeRes.json()).badge.key).toBe("passive");

    const nBadgeRes = brandEndpoint(req("/api/brand?n=1"));
    expect(nBadgeRes.status).toBe(200);
    expect((await nBadgeRes.json()).badge.key).toBe("passive");

    const unknownBadgeRes = brandEndpoint(req("/api/brand?badge=nonexistent"));
    expect(unknownBadgeRes.status).toBe(200);
    expect((await unknownBadgeRes.json()).badge).toBeNull();
  });
});

describe("Entity query aliases, numeric indexing, and helper extensions", () => {
  it("GET /api/posts supports ?n=, ?post=, numeric index, and prefix aliases", async () => {
    const post1 = posts[0];
    const nRes = postsIndex(req("/api/posts?n=1"));
    expect(nRes.status).toBe(200);
    const nBody = await nRes.json();
    expect(nBody.count).toBe(1);
    expect(nBody.posts[0].slug).toBe(post1.slug);

    const postParamRes = postsIndex(req("/api/posts?post=1"));
    expect(postParamRes.status).toBe(200);
    expect((await postParamRes.json()).posts[0].slug).toBe(post1.slug);

    const pHyphenRes = postsIndex(req("/api/posts?id=p-1"));
    expect(pHyphenRes.status).toBe(200);
    expect((await pHyphenRes.json()).posts[0].slug).toBe(post1.slug);

    const postPrefixedRes = postsIndex(req(`/api/posts?slug=post-${post1.slug}`));
    expect(postPrefixedRes.status).toBe(200);
    expect((await postPrefixedRes.json()).posts[0].slug).toBe(post1.slug);

    const blogPrefixedRes = postsIndex(req(`/api/posts?id=blog-${post1.slug}`));
    expect(blogPrefixedRes.status).toBe(200);
    expect((await blogPrefixedRes.json()).posts[0].slug).toBe(post1.slug);
  });

  it("GET /api/posts/[slug] resolves numeric indices, p-, post-, and blog- prefixes", async () => {
    const post1 = posts[0];
    const numRes = await postOne(req("/api/posts/1"), slugCtx("1"));
    expect(numRes.status).toBe(200);
    expect((await numRes.json()).slug).toBe(post1.slug);

    const zeroRes = await postOne(req("/api/posts/01"), slugCtx("01"));
    expect(zeroRes.status).toBe(200);
    expect((await zeroRes.json()).slug).toBe(post1.slug);

    const p1Res = await postOne(req("/api/posts/p1"), slugCtx("p1"));
    expect(p1Res.status).toBe(200);
    expect((await p1Res.json()).slug).toBe(post1.slug);

    const pMinus1Res = await postOne(req("/api/posts/p-1"), slugCtx("p-1"));
    expect(pMinus1Res.status).toBe(200);
    expect((await pMinus1Res.json()).slug).toBe(post1.slug);

    const post1Res = await postOne(req("/api/posts/post-1"), slugCtx("post-1"));
    expect(post1Res.status).toBe(200);
    expect((await post1Res.json()).slug).toBe(post1.slug);

    const blog1Res = await postOne(req("/api/posts/blog-1"), slugCtx("blog-1"));
    expect(blog1Res.status).toBe(200);
    expect((await blog1Res.json()).slug).toBe(post1.slug);

    const fullPostPrefixRes = await postOne(req(`/api/posts/post-${post1.slug}`), slugCtx(`post-${post1.slug}`));
    expect(fullPostPrefixRes.status).toBe(200);
    expect((await fullPostPrefixRes.json()).slug).toBe(post1.slug);

    const outOfBoundsRes = await postOne(req("/api/posts/99"), slugCtx("99"));
    expect(outOfBoundsRes.status).toBe(404);
  });

  it("GET /api/scenarios supports ?scenario=, ?scenario_id=, ?scenarioId=, ?slug=, and sc prefix aliases", async () => {
    const sc1 = scenarios[0];
    const scenarioParamRes = scenariosIndex(req(`/api/scenarios?scenario=${sc1.id}`));
    expect(scenarioParamRes.status).toBe(200);
    expect((await scenarioParamRes.json()).scenarios[0].id).toBe(sc1.id);

    const scenarioIdSnakeRes = scenariosIndex(req("/api/scenarios?scenario_id=sc1"));
    expect(scenarioIdSnakeRes.status).toBe(200);
    expect((await scenarioIdSnakeRes.json()).scenarios[0].id).toBe(sc1.id);

    const scenarioIdCamelRes = scenariosIndex(req("/api/scenarios?scenarioId=sc01"));
    expect(scenarioIdCamelRes.status).toBe(200);
    expect((await scenarioIdCamelRes.json()).scenarios[0].id).toBe(sc1.id);

    const slugRes = scenariosIndex(req(`/api/scenarios?slug=${sc1.id}`));
    expect(slugRes.status).toBe(200);
    expect((await slugRes.json()).scenarios[0].id).toBe(sc1.id);

    const oneRes = await scenarioOne(req("/api/scenarios/sc1"), idCtx("sc1"));
    expect(oneRes.status).toBe(200);
    expect((await oneRes.json()).id).toBe(sc1.id);

    const sc01Res = await scenarioOne(req("/api/scenarios/sc01"), idCtx("sc01"));
    expect(sc01Res.status).toBe(200);
    expect((await sc01Res.json()).id).toBe(sc1.id);
  });

  it("GET /api/case-studies supports ?finding=, ?finding_id=, ?findingId=, ?case_study=, ?caseStudy=, and ?slug=", async () => {
    const f1 = findings[0];
    const findingRes = caseStudiesIndex(req("/api/case-studies?finding=f-01"));
    expect(findingRes.status).toBe(200);
    expect((await findingRes.json()).findings[0].id).toBe(f1.id);

    const findingIdSnakeRes = caseStudiesIndex(req("/api/case-studies?finding_id=f1"));
    expect(findingIdSnakeRes.status).toBe(200);
    expect((await findingIdSnakeRes.json()).findings[0].id).toBe(f1.id);

    const findingIdCamelRes = caseStudiesIndex(req("/api/case-studies?findingId=1"));
    expect(findingIdCamelRes.status).toBe(200);
    expect((await findingIdCamelRes.json()).findings[0].id).toBe(f1.id);

    const csSnakeRes = caseStudiesIndex(req("/api/case-studies?case_study=1"));
    expect(csSnakeRes.status).toBe(200);
    expect((await csSnakeRes.json()).findings[0].id).toBe(f1.id);

    const csCamelRes = caseStudiesIndex(req("/api/case-studies?caseStudy=cs-01"));
    expect(csCamelRes.status).toBe(200);
    expect((await csCamelRes.json()).findings[0].id).toBe(f1.id);

    const slugRes = caseStudiesIndex(req("/api/case-studies?slug=f-01"));
    expect(slugRes.status).toBe(200);
    expect((await slugRes.json()).findings[0].id).toBe(f1.id);
  });

  it("GET /api/incidents supports ?incident=, ?incident_id=, ?incidentId=, ?case=, ?case_id=, and ?slug=", async () => {
    const inc1 = incidents[0];
    const incRes = incidentsIndex(req("/api/incidents?incident=01"));
    expect(incRes.status).toBe(200);
    expect((await incRes.json()).incidents[0].id).toBe(inc1.id);

    const incIdSnakeRes = incidentsIndex(req("/api/incidents?incident_id=i1"));
    expect(incIdSnakeRes.status).toBe(200);
    expect((await incIdSnakeRes.json()).incidents[0].id).toBe(inc1.id);

    const incIdCamelRes = incidentsIndex(req("/api/incidents?incidentId=1"));
    expect(incIdCamelRes.status).toBe(200);
    expect((await incIdCamelRes.json()).incidents[0].id).toBe(inc1.id);

    const caseRes = incidentsIndex(req(`/api/incidents?case=${inc1.id}`));
    expect(caseRes.status).toBe(200);
    expect((await caseRes.json()).incidents[0].id).toBe(inc1.id);

    const caseIdRes = incidentsIndex(req("/api/incidents?case_id=01"));
    expect(caseIdRes.status).toBe(200);
    expect((await caseIdRes.json()).incidents[0].id).toBe(inc1.id);

    const slugRes = incidentsIndex(req(`/api/incidents?slug=${inc1.id}`));
    expect(slugRes.status).toBe(200);
    expect((await slugRes.json()).incidents[0].id).toBe(inc1.id);
  });

  it("GET /api/tiers supports ?tier_id=, ?tierId=, ?slug=, and ?n=", async () => {
    const t1 = tiers[0];
    const tierIdSnakeRes = tiersIndex(req("/api/tiers?tier_id=seraphim"));
    expect(tierIdSnakeRes.status).toBe(200);
    expect((await tierIdSnakeRes.json()).tiers[0].id).toBe(t1.id);

    const tierIdCamelRes = tiersIndex(req("/api/tiers?tierId=t1"));
    expect(tierIdCamelRes.status).toBe(200);
    expect((await tierIdCamelRes.json()).tiers[0].id).toBe(t1.id);

    const slugRes = tiersIndex(req("/api/tiers?slug=tier-1"));
    expect(slugRes.status).toBe(200);
    expect((await slugRes.json()).tiers[0].id).toBe(t1.id);

    const nRes = tiersIndex(req("/api/tiers?n=1"));
    expect(nRes.status).toBe(200);
    expect((await nRes.json()).tiers[0].id).toBe(t1.id);
  });

  it("GET /api/brand supports ?name= query filter for badge lookup by label", async () => {
    const nameRes = brandEndpoint(req("/api/brand?name=passive"));
    expect(nameRes.status).toBe(200);
    expect((await nameRes.json()).badge.key).toBe("passive");

    const fullLabelRes = brandEndpoint(req("/api/brand?name=Passive%20recon%20only"));
    expect(fullLabelRes.status).toBe(200);
    expect((await fullLabelRes.json()).badge.key).toBe("passive");
  });

  it("parseLimit, parsePage, and parseSortOrder support additional aliases", () => {
    const limitParams = new URLSearchParams("rows=25");
    expect(parseLimit(limitParams)).toBe(25);

    const pageIndexParams = new URLSearchParams("page_index=3");
    expect(parsePage(pageIndexParams)).toBe(3);

    const pageIndexCamelParams = new URLSearchParams("pageIndex=4");
    expect(parsePage(pageIndexCamelParams)).toBe(4);

    const sortByParams = new URLSearchParams("sort_by=asc");
    expect(parseSortOrder(sortByParams)).toBe("asc");

    const sortByCamelParams = new URLSearchParams("sortBy=desc");
    expect(parseSortOrder(sortByCamelParams)).toBe("desc");

    const recentParams = new URLSearchParams("order=recent");
    expect(parseSortOrder(recentParams)).toBe("desc");

    const forwardParams = new URLSearchParams("order=forward");
    expect(parseSortOrder(forwardParams)).toBe("asc");

    const backwardParams = new URLSearchParams("order=backward");
    expect(parseSortOrder(backwardParams)).toBe("desc");

    const backwardsParams = new URLSearchParams("order=backwards");
    expect(parseSortOrder(backwardsParams)).toBe("desc");

    const numAscParams = new URLSearchParams("order=1");
    expect(parseSortOrder(numAscParams)).toBe("asc");

    const plusAscParams = new URLSearchParams("order=+1");
    expect(parseSortOrder(plusAscParams)).toBe("asc");

    const numDescParams = new URLSearchParams("order=-1");
    expect(parseSortOrder(numDescParams)).toBe("desc");

    const rowsPerPageParams = new URLSearchParams("rows_per_page=20");
    expect(parseLimit(rowsPerPageParams)).toBe(20);

    const rowsPerPageCamelParams = new URLSearchParams("rowsPerPage=15");
    expect(parseLimit(rowsPerPageCamelParams)).toBe(15);

    const pgParams = new URLSearchParams("pg=5");
    expect(parsePage(pgParams)).toBe(5);

    const pageIdxParams = new URLSearchParams("page_idx=2");
    expect(parsePage(pageIdxParams)).toBe(2);

    const pageIdxCamelParams = new URLSearchParams("pageIdx=4");
    expect(parsePage(pageIdxCamelParams)).toBe(4);
  });

  it("GET /api/posts and GET /api/posts/[slug] handle extended aliases and numeric index extensions", async () => {
    const post1 = posts[0];
    const postIdRes = postsIndex(req("/api/posts?postId=1"));
    expect(postIdRes.status).toBe(200);
    expect((await postIdRes.json()).posts[0].slug).toBe(post1.slug);

    const postIdSnakeRes = postsIndex(req("/api/posts?post_id=1"));
    expect(postIdSnakeRes.status).toBe(200);
    expect((await postIdSnakeRes.json()).posts[0].slug).toBe(post1.slug);

    const articleRes = postsIndex(req("/api/posts?article=1"));
    expect(articleRes.status).toBe(200);
    expect((await articleRes.json()).posts[0].slug).toBe(post1.slug);

    const articleIdRes = postsIndex(req("/api/posts?article_id=1"));
    expect(articleIdRes.status).toBe(200);
    expect((await articleIdRes.json()).posts[0].slug).toBe(post1.slug);

    const articleIdCamelRes = postsIndex(req("/api/posts?articleId=1"));
    expect(articleIdCamelRes.status).toBe(200);
    expect((await articleIdCamelRes.json()).posts[0].slug).toBe(post1.slug);

    const readTimeRes = postsIndex(req("/api/posts?read_time=8"));
    expect(readTimeRes.status).toBe(200);
    expect((await readTimeRes.json()).posts.every((p: { readMins: number }) => p.readMins === 8)).toBe(true);

    const readTimeCamelRes = postsIndex(req("/api/posts?readTime=8"));
    expect(readTimeCamelRes.status).toBe(200);
    expect((await readTimeCamelRes.json()).posts.every((p: { readMins: number }) => p.readMins === 8)).toBe(true);

    const readingTimeRes = postsIndex(req("/api/posts?reading_time=8"));
    expect(readingTimeRes.status).toBe(200);
    expect((await readingTimeRes.json()).posts.every((p: { readMins: number }) => p.readMins === 8)).toBe(true);

    const readingMinsRes = postsIndex(req("/api/posts?reading_mins=8"));
    expect(readingMinsRes.status).toBe(200);
    expect((await readingMinsRes.json()).posts.every((p: { readMins: number }) => p.readMins === 8)).toBe(true);

    const sourceIdRes = postsIndex(req("/api/posts?source_id=oaiAug"));
    expect(sourceIdRes.status).toBe(200);
    expect((await sourceIdRes.json()).count).toBeGreaterThan(0);

    const sourceIdCamelRes = postsIndex(req("/api/posts?sourceId=oaiAug"));
    expect(sourceIdCamelRes.status).toBe(200);
    expect((await sourceIdCamelRes.json()).count).toBeGreaterThan(0);

    const srcRes = postsIndex(req("/api/posts?src=oaiAug"));
    expect(srcRes.status).toBe(200);
    expect((await srcRes.json()).count).toBeGreaterThan(0);

    const json1Res = await postOne(req("/api/posts/1.json"), slugCtx("1.json"));
    expect(json1Res.status).toBe(200);
    expect((await json1Res.json()).slug).toBe(post1.slug);

    const json01Res = await postOne(req("/api/posts/01.json"), slugCtx("01.json"));
    expect(json01Res.status).toBe(200);
    expect((await json01Res.json()).slug).toBe(post1.slug);

    const jsonP1Res = await postOne(req("/api/posts/p-1.json"), slugCtx("p-1.json"));
    expect(jsonP1Res.status).toBe(200);
    expect((await jsonP1Res.json()).slug).toBe(post1.slug);

    const jsonPost1Res = await postOne(req("/api/posts/post-1.json"), slugCtx("post-1.json"));
    expect(jsonPost1Res.status).toBe(200);
    expect((await jsonPost1Res.json()).slug).toBe(post1.slug);

    const jsonBlog1Res = await postOne(req("/api/posts/blog-1.json"), slugCtx("blog-1.json"));
    expect(jsonBlog1Res.status).toBe(200);
    expect((await jsonBlog1Res.json()).slug).toBe(post1.slug);

    const html1Res = await postOne(req("/api/posts/1.html"), slugCtx("1.html"));
    expect(html1Res.status).toBe(200);
    expect((await html1Res.json()).slug).toBe(post1.slug);
  });

  it("GET /api/case-studies supports fix, rationale, what, before, after filters and hyphenless finding lookups", async () => {
    const f8 = findings.find((f) => f.id === "F-08")!;
    const fixRes = caseStudiesIndex(req("/api/case-studies?fix=idempotency"));
    expect(fixRes.status).toBe(200);
    expect((await fixRes.json()).findings.some((f: { id: string }) => f.id === "F-07")).toBe(true);

    const rationaleRes = caseStudiesIndex(req("/api/case-studies?rationale=availability"));
    expect(rationaleRes.status).toBe(200);
    expect((await rationaleRes.json()).findings.some((f: { id: string }) => f.id === f8.id)).toBe(true);

    const whatRes = caseStudiesIndex(req("/api/case-studies?what=policy"));
    expect(whatRes.status).toBe(200);
    expect((await whatRes.json()).findings.some((f: { id: string }) => f.id === f8.id)).toBe(true);

    const beforeRes = caseStudiesIndex(req("/api/case-studies?before=circular"));
    expect(beforeRes.status).toBe(200);
    expect((await beforeRes.json()).findings.some((f: { id: string }) => f.id === f8.id)).toBe(true);

    const afterRes = caseStudiesIndex(req("/api/case-studies?after=helper"));
    expect(afterRes.status).toBe(200);
    expect((await afterRes.json()).findings.some((f: { id: string }) => f.id === f8.id)).toBe(true);

    const cs1Res = caseStudiesIndex(req("/api/case-studies?finding=cs1"));
    expect(cs1Res.status).toBe(200);
    expect((await cs1Res.json()).findings[0].id).toBe("F-01");

    const cs01Res = caseStudiesIndex(req("/api/case-studies?case_study=cs01"));
    expect(cs01Res.status).toBe(200);
    expect((await cs01Res.json()).findings[0].id).toBe("F-01");

    const finding1Res = caseStudiesIndex(req("/api/case-studies?id=finding1"));
    expect(finding1Res.status).toBe(200);
    expect((await finding1Res.json()).findings[0].id).toBe("F-01");

    const oneCs1 = await caseStudyOne(req("/api/case-studies/cs1"), idCtx("cs1"));
    expect(oneCs1.status).toBe(200);
    expect((await oneCs1.json()).id).toBe("F-01");

    const oneCs01 = await caseStudyOne(req("/api/case-studies/cs01"), idCtx("cs01"));
    expect(oneCs01.status).toBe(200);
    expect((await oneCs01.json()).id).toBe("F-01");

    const oneFinding1 = await caseStudyOne(req("/api/case-studies/finding1"), idCtx("finding1"));
    expect(oneFinding1.status).toBe(200);
    expect((await oneFinding1.json()).id).toBe("F-01");
  });

  it("GET /api/scenarios supports seraphim analysis filter and scenario hyphenless lookups", async () => {
    const sc1 = scenarios[0];
    const seraphimRes = scenariosIndex(req("/api/scenarios?seraphim=recon"));
    expect(seraphimRes.status).toBe(200);
    expect((await seraphimRes.json()).count).toBeGreaterThan(0);

    const analysisRes = scenariosIndex(req("/api/scenarios?analysis=controls"));
    expect(analysisRes.status).toBe(200);
    expect((await analysisRes.json()).count).toBeGreaterThan(0);

    const sc1ParamRes = scenariosIndex(req("/api/scenarios?scenario=scenario1"));
    expect(sc1ParamRes.status).toBe(200);
    expect((await sc1ParamRes.json()).scenarios[0].id).toBe(sc1.id);

    const sc01ParamRes = scenariosIndex(req("/api/scenarios?id=scenario01"));
    expect(sc01ParamRes.status).toBe(200);
    expect((await sc01ParamRes.json()).scenarios[0].id).toBe(sc1.id);

    const oneScenario1 = await scenarioOne(req("/api/scenarios/scenario1"), idCtx("scenario1"));
    expect(oneScenario1.status).toBe(200);
    expect((await oneScenario1.json()).id).toBe(sc1.id);

    const oneScenario01 = await scenarioOne(req("/api/scenarios/scenario01"), idCtx("scenario01"));
    expect(oneScenario01.status).toBe(200);
    expect((await oneScenario01.json()).id).toBe(sc1.id);

    const oneScenarioH1 = await scenarioOne(req("/api/scenarios/scenarioh1"), idCtx("scenarioh1"));
    expect(oneScenarioH1.status).toBe(200);
    expect((await oneScenarioH1.json()).id).toBe(sc1.id);
  });

  it("GET /api/incidents supports caseId alias and incident/case hyphenless lookups", async () => {
    const inc1 = incidents[0];
    const caseIdRes = incidentsIndex(req("/api/incidents?caseId=01"));
    expect(caseIdRes.status).toBe(200);
    expect((await caseIdRes.json()).incidents[0].id).toBe(inc1.id);

    const inc1ParamRes = incidentsIndex(req("/api/incidents?incident=incident1"));
    expect(inc1ParamRes.status).toBe(200);
    expect((await inc1ParamRes.json()).incidents[0].id).toBe(inc1.id);

    const case01ParamRes = incidentsIndex(req("/api/incidents?case=case01"));
    expect(case01ParamRes.status).toBe(200);
    expect((await case01ParamRes.json()).incidents[0].id).toBe(inc1.id);

    const oneInc1 = await incidentOne(req("/api/incidents/incident1"), idCtx("incident1"));
    expect(oneInc1.status).toBe(200);
    expect((await oneInc1.json()).id).toBe(inc1.id);

    const oneInc01 = await incidentOne(req("/api/incidents/incident01"), idCtx("incident01"));
    expect(oneInc01.status).toBe(200);
    expect((await oneInc01.json()).id).toBe(inc1.id);

    const oneCase1 = await incidentOne(req("/api/incidents/case1"), idCtx("case1"));
    expect(oneCase1.status).toBe(200);
    expect((await oneCase1.json()).id).toBe(inc1.id);

    const oneCase01 = await incidentOne(req("/api/incidents/case01"), idCtx("case01"));
    expect(oneCase01.status).toBe(200);
    expect((await oneCase01.json()).id).toBe(inc1.id);
  });

  it("GET /api/sources supports source_id, src, url/domain filters, and source1/src1 lookups", async () => {
    const s1 = sources[0];
    const sourceIdRes = sourcesIndex(req("/api/sources?source_id=oaiAug"));
    expect(sourceIdRes.status).toBe(200);
    expect((await sourceIdRes.json()).sources[0].id).toBe(s1.id);

    const sourceIdCamelRes = sourcesIndex(req("/api/sources?sourceId=oaiAug"));
    expect(sourceIdCamelRes.status).toBe(200);
    expect((await sourceIdCamelRes.json()).sources[0].id).toBe(s1.id);

    const srcRes = sourcesIndex(req("/api/sources?src=oaiAug"));
    expect(srcRes.status).toBe(200);
    expect((await srcRes.json()).sources[0].id).toBe(s1.id);

    const srcIdRes = sourcesIndex(req("/api/sources?src_id=oaiAug"));
    expect(srcIdRes.status).toBe(200);
    expect((await srcIdRes.json()).sources[0].id).toBe(s1.id);

    const urlRes = sourcesIndex(req("/api/sources?url=openai.com"));
    expect(urlRes.status).toBe(200);
    expect((await urlRes.json()).sources.every((s: { url: string }) => s.url.includes("openai.com"))).toBe(true);

    const domainRes = sourcesIndex(req("/api/sources?domain=huggingface.co"));
    expect(domainRes.status).toBe(200);
    expect((await domainRes.json()).sources.every((s: { url: string }) => s.url.includes("huggingface.co"))).toBe(true);

    const linkRes = sourcesIndex(req("/api/sources?link=metr.org"));
    expect(linkRes.status).toBe(200);
    expect((await linkRes.json()).sources.every((s: { url: string }) => s.url.includes("metr.org"))).toBe(true);

    const hrefRes = sourcesIndex(req("/api/sources?href=f5.com"));
    expect(hrefRes.status).toBe(200);
    expect((await hrefRes.json()).sources.every((s: { url: string }) => s.url.includes("f5.com"))).toBe(true);

    const oneSource1 = await sourceOne(req("/api/sources/source1"), idCtx("source1"));
    expect(oneSource1.status).toBe(200);
    expect((await oneSource1.json()).id).toBe(s1.id);

    const oneSource01 = await sourceOne(req("/api/sources/source01"), idCtx("source01"));
    expect(oneSource01.status).toBe(200);
    expect((await oneSource01.json()).id).toBe(s1.id);

    const oneSrc1 = await sourceOne(req("/api/sources/src1"), idCtx("src1"));
    expect(oneSrc1.status).toBe(200);
    expect((await oneSrc1.json()).id).toBe(s1.id);

    const oneSrc01 = await sourceOne(req("/api/sources/src01"), idCtx("src01"));
    expect(oneSrc01.status).toBe(200);
    expect((await oneSrc01.json()).id).toBe(s1.id);
  });

  it("GET /api/posts supports expanded aliases (postSlug, num, service_tier, min, headline, reference, article prefixes, and leading +)", async () => {
    const post1 = posts[0];
    const postSlugRes = postsIndex(req(`/api/posts?postSlug=${post1.slug}`));
    expect(postSlugRes.status).toBe(200);
    expect((await postSlugRes.json()).posts[0].slug).toBe(post1.slug);

    const numRes = postsIndex(req("/api/posts?num=1"));
    expect(numRes.status).toBe(200);
    expect((await numRes.json()).posts[0].slug).toBe(post1.slug);

    const tierRes = postsIndex(req("/api/posts?service_tier=seraphim"));
    expect(tierRes.status).toBe(200);
    expect((await tierRes.json()).posts.every((p: { tier: string }) => p.tier === "seraphim")).toBe(true);

    const minRes = postsIndex(req(`/api/posts?min=${post1.readMins}`));
    expect(minRes.status).toBe(200);
    expect((await minRes.json()).posts.every((p: { readMins: number }) => p.readMins === post1.readMins)).toBe(true);

    const minutesRes = postsIndex(req(`/api/posts?minutes=${post1.readMins}`));
    expect(minutesRes.status).toBe(200);
    expect((await minutesRes.json()).posts.every((p: { readMins: number }) => p.readMins === post1.readMins)).toBe(true);

    const headlineRes = postsIndex(req("/api/posts?headline=test%20subject"));
    expect(headlineRes.status).toBe(200);
    expect((await headlineRes.json()).posts[0].slug).toBe(post1.slug);

    const refRes = postsIndex(req("/api/posts?reference=oaiAug"));
    expect(refRes.status).toBe(200);
    expect((await refRes.json()).posts[0].slug).toBe(post1.slug);

    const art1Res = await postOne(req("/api/posts/article-1"), slugCtx("article-1"));
    expect(art1Res.status).toBe(200);
    expect((await art1Res.json()).slug).toBe(post1.slug);

    const artUnderscore1Res = await postOne(req("/api/posts/article_1"), slugCtx("article_1"));
    expect(artUnderscore1Res.status).toBe(200);
    expect((await artUnderscore1Res.json()).slug).toBe(post1.slug);

    const artDigitRes = await postOne(req("/api/posts/article1"), slugCtx("article1"));
    expect(artDigitRes.status).toBe(200);
    expect((await artDigitRes.json()).slug).toBe(post1.slug);

    const artShortRes = await postOne(req("/api/posts/art-1"), slugCtx("art-1"));
    expect(artShortRes.status).toBe(200);
    expect((await artShortRes.json()).slug).toBe(post1.slug);

    const artShortDigitRes = await postOne(req("/api/posts/art1"), slugCtx("art1"));
    expect(artShortDigitRes.status).toBe(200);
    expect((await artShortDigitRes.json()).slug).toBe(post1.slug);

    const plusOneRes = await postOne(req("/api/posts/+1"), slugCtx("+1"));
    expect(plusOneRes.status).toBe(200);
    expect((await plusOneRes.json()).slug).toBe(post1.slug);

    const plusZeroOneRes = await postOne(req("/api/posts/+01"), slugCtx("+01"));
    expect(plusZeroOneRes.status).toBe(200);
    expect((await plusZeroOneRes.json()).slug).toBe(post1.slug);

    const plusP1Res = await postOne(req("/api/posts/+p1"), slugCtx("+p1"));
    expect(plusP1Res.status).toBe(200);
    expect((await plusP1Res.json()).slug).toBe(post1.slug);
  });

  it("GET /api/incidents supports expanded query aliases and leading + lookups", async () => {
    const inc1 = incidents[0];
    const numRes = incidentsIndex(req("/api/incidents?num=01"));
    expect(numRes.status).toBe(200);
    expect((await numRes.json()).incidents[0].id).toBe(inc1.id);

    const incRes = incidentsIndex(req("/api/incidents?inc=01"));
    expect(incRes.status).toBe(200);
    expect((await incRes.json()).incidents[0].id).toBe(inc1.id);

    const incSlugRes = incidentsIndex(req(`/api/incidents?incident_slug=${inc1.id}`));
    expect(incSlugRes.status).toBe(200);
    expect((await incSlugRes.json()).incidents[0].id).toBe(inc1.id);

    const caseSlugRes = incidentsIndex(req(`/api/incidents?case_slug=${inc1.id}`));
    expect(caseSlugRes.status).toBe(200);
    expect((await caseSlugRes.json()).incidents[0].id).toBe(inc1.id);

    const refRes = incidentsIndex(req("/api/incidents?reference=oaiAug"));
    expect(refRes.status).toBe(200);
    expect((await refRes.json()).incidents[0].id).toBe(inc1.id);

    const timeframeRes = incidentsIndex(req("/api/incidents?timeframe=2026"));
    expect(timeframeRes.status).toBe(200);
    expect((await timeframeRes.json()).incidents[0].id).toBe(inc1.id);

    const statusRes = incidentsIndex(req("/api/incidents?status=documented"));
    expect(statusRes.status).toBe(200);
    expect((await statusRes.json()).incidents[0].id).toBe(inc1.id);

    const tagRes = incidentsIndex(req("/api/incidents?tag=landmark"));
    expect(tagRes.status).toBe(200);
    expect((await tagRes.json()).incidents[0].id).toBe(inc1.id);

    const weaknessRes = incidentsIndex(req("/api/incidents?weakness=token-refresh"));
    expect(weaknessRes.status).toBe(200);
    expect((await weaknessRes.json()).incidents[0].id).toBe(inc1.id);

    const flawRes = incidentsIndex(req("/api/incidents?flaw=token-refresh"));
    expect(flawRes.status).toBe(200);
    expect((await flawRes.json()).incidents[0].id).toBe(inc1.id);

    const plusOneRes = await incidentOne(req("/api/incidents/+1"), idCtx("+1"));
    expect(plusOneRes.status).toBe(200);
    expect((await plusOneRes.json()).id).toBe(inc1.id);

    const plusZeroOneRes = await incidentOne(req("/api/incidents/+01"), idCtx("+01"));
    expect(plusZeroOneRes.status).toBe(200);
    expect((await plusZeroOneRes.json()).id).toBe(inc1.id);
  });

  it("GET /api/scenarios supports expanded query aliases and leading + lookups", async () => {
    const sc1 = scenarios[0];
    const numRes = scenariosIndex(req("/api/scenarios?num=01"));
    expect(numRes.status).toBe(200);
    expect((await numRes.json()).scenarios[0].id).toBe(sc1.id);

    const scRes = scenariosIndex(req("/api/scenarios?sc=01"));
    expect(scRes.status).toBe(200);
    expect((await scRes.json()).scenarios[0].id).toBe(sc1.id);

    const scSlugRes = scenariosIndex(req(`/api/scenarios?scenario_slug=${sc1.id}`));
    expect(scSlugRes.status).toBe(200);
    expect((await scSlugRes.json()).scenarios[0].id).toBe(sc1.id);

    const refRes = scenariosIndex(req("/api/scenarios?reference=cs26"));
    expect(refRes.status).toBe(200);
    expect((await refRes.json()).scenarios.some((s: { id: string }) => s.id === sc1.id)).toBe(true);

    const mitRes = scenariosIndex(req("/api/scenarios?mitigation=least-privilege"));
    expect(mitRes.status).toBe(200);
    expect((await mitRes.json()).scenarios.length).toBeGreaterThan(0);

    const defRes = scenariosIndex(req("/api/scenarios?defense=least-privilege"));
    expect(defRes.status).toBe(200);
    expect((await defRes.json()).scenarios.length).toBeGreaterThan(0);

    const techRes = scenariosIndex(req("/api/scenarios?technique=adversary"));
    expect(techRes.status).toBe(200);
    expect((await techRes.json()).scenarios.length).toBeGreaterThan(0);

    const assessRes = scenariosIndex(req("/api/scenarios?assessment=scoped"));
    expect(assessRes.status).toBe(200);
    expect((await assessRes.json()).scenarios.length).toBeGreaterThan(0);

    const plusOneRes = await scenarioOne(req("/api/scenarios/+1"), idCtx("+1"));
    expect(plusOneRes.status).toBe(200);
    expect((await plusOneRes.json()).id).toBe(sc1.id);

    const plusZeroOneRes = await scenarioOne(req("/api/scenarios/+01"), idCtx("+01"));
    expect(plusZeroOneRes.status).toBe(200);
    expect((await plusZeroOneRes.json()).id).toBe(sc1.id);

    const plusH1Res = await scenarioOne(req("/api/scenarios/+h1"), idCtx("+h1"));
    expect(plusH1Res.status).toBe(200);
    expect((await plusH1Res.json()).id).toBe(sc1.id);

    const plusH01Res = await scenarioOne(req("/api/scenarios/+h01"), idCtx("+h01"));
    expect(plusH01Res.status).toBe(200);
    expect((await plusH01Res.json()).id).toBe(sc1.id);
  });

  it("GET /api/case-studies supports expanded query aliases and leading + lookups", async () => {
    const f1 = findings[0];
    const numRes = caseStudiesIndex(req("/api/case-studies?num=01"));
    expect(numRes.status).toBe(200);
    expect((await numRes.json()).findings[0].id).toBe(f1.id);

    const csRes = caseStudiesIndex(req("/api/case-studies?cs=01"));
    expect(csRes.status).toBe(200);
    expect((await csRes.json()).findings[0].id).toBe(f1.id);

    const fRes = caseStudiesIndex(req("/api/case-studies?f=01"));
    expect(fRes.status).toBe(200);
    expect((await fRes.json()).findings[0].id).toBe(f1.id);

    const levelRes = caseStudiesIndex(req("/api/case-studies?level=medium"));
    expect(levelRes.status).toBe(200);
    expect((await levelRes.json()).findings.every((f: { severity: string }) => f.severity === "Medium")).toBe(true);

    const stateRes = caseStudiesIndex(req("/api/case-studies?state=fixed"));
    expect(stateRes.status).toBe(200);
    expect((await stateRes.json()).findings.length).toBeGreaterThan(0);

    const solRes = caseStudiesIndex(req("/api/case-studies?solution=secret"));
    expect(solRes.status).toBe(200);
    expect((await solRes.json()).findings.length).toBeGreaterThan(0);

    const reasonRes = caseStudiesIndex(req("/api/case-studies?reason=credentials"));
    expect(reasonRes.status).toBe(200);
    expect((await reasonRes.json()).findings.length).toBeGreaterThan(0);

    const descRes = caseStudiesIndex(req("/api/case-studies?details=unpaid"));
    expect(descRes.status).toBe(200);
    expect((await descRes.json()).findings.length).toBeGreaterThan(0);

    const priorRes = caseStudiesIndex(req("/api/case-studies?prior=header"));
    expect(priorRes.status).toBe(200);
    expect((await priorRes.json()).findings.length).toBeGreaterThan(0);

    const curRes = caseStudiesIndex(req("/api/case-studies?current=vault"));
    expect(curRes.status).toBe(200);
    expect((await curRes.json()).findings.length).toBeGreaterThan(0);

    const plusOneRes = await caseStudyOne(req("/api/case-studies/+1"), idCtx("+1"));
    expect(plusOneRes.status).toBe(200);
    expect((await plusOneRes.json()).id).toBe(f1.id);

    const plusZeroOneRes = await caseStudyOne(req("/api/case-studies/+01"), idCtx("+01"));
    expect(plusZeroOneRes.status).toBe(200);
    expect((await plusZeroOneRes.json()).id).toBe(f1.id);

    const plusF1Res = await caseStudyOne(req("/api/case-studies/+f1"), idCtx("+f1"));
    expect(plusF1Res.status).toBe(200);
    expect((await plusF1Res.json()).id).toBe(f1.id);

    const casestudy1Res = await caseStudyOne(req("/api/case-studies/casestudy1"), idCtx("casestudy1"));
    expect(casestudy1Res.status).toBe(200);
    expect((await casestudy1Res.json()).id).toBe(f1.id);

    const fix1Res = await caseStudyOne(req("/api/case-studies/fix1"), idCtx("fix1"));
    expect(fix1Res.status).toBe(200);
    expect((await fix1Res.json()).id).toBe(f1.id);
  });

  it("GET /api/tiers supports expanded query aliases and rank prefixes", async () => {
    const t1 = tiers[0];
    const numRes = tiersIndex(req("/api/tiers?num=01"));
    expect(numRes.status).toBe(200);
    expect((await numRes.json()).tiers[0].id).toBe(t1.id);

    const tRes = tiersIndex(req("/api/tiers?t=01"));
    expect(tRes.status).toBe(200);
    expect((await tRes.json()).tiers[0].id).toBe(t1.id);

    const tierNameRes = tiersIndex(req("/api/tiers?tier_name=seraphim"));
    expect(tierNameRes.status).toBe(200);
    expect((await tierNameRes.json()).tiers[0].id).toBe(t1.id);

    const freqRes = tiersIndex(req("/api/tiers?frequency=scoped"));
    expect(freqRes.status).toBe(200);
    expect((await freqRes.json()).tiers[0].id).toBe(t1.id);

    const priceRes = tiersIndex(req("/api/tiers?price=premium"));
    expect(priceRes.status).toBe(200);
    expect((await priceRes.json()).tiers[0].id).toBe(t1.id);

    const rankRes = tiersIndex(req("/api/tiers?rank=1"));
    expect(rankRes.status).toBe(200);
    expect((await rankRes.json()).tiers[0].id).toBe(t1.id);

    const orderRankRes = tiersIndex(req("/api/tiers?order_rank=1"));
    expect(orderRankRes.status).toBe(200);
    expect((await orderRankRes.json()).tiers[0].id).toBe(t1.id);

    const rank1Res = await tierOne(req("/api/tiers/rank-1"), idCtx("rank-1"));
    expect(rank1Res.status).toBe(200);
    expect((await rank1Res.json()).id).toBe(t1.id);

    const rankUnderscore1Res = await tierOne(req("/api/tiers/rank_1"), idCtx("rank_1"));
    expect(rankUnderscore1Res.status).toBe(200);
    expect((await rankUnderscore1Res.json()).id).toBe(t1.id);

    const rankDigitRes = await tierOne(req("/api/tiers/rank1"), idCtx("rank1"));
    expect(rankDigitRes.status).toBe(200);
    expect((await rankDigitRes.json()).id).toBe(t1.id);

    const rShortRes = await tierOne(req("/api/tiers/r-1"), idCtx("r-1"));
    expect(rShortRes.status).toBe(200);
    expect((await rShortRes.json()).id).toBe(t1.id);

    const rDigitRes = await tierOne(req("/api/tiers/r1"), idCtx("r1"));
    expect(rDigitRes.status).toBe(200);
    expect((await rDigitRes.json()).id).toBe(t1.id);

    const plusOneRes = await tierOne(req("/api/tiers/+1"), idCtx("+1"));
    expect(plusOneRes.status).toBe(200);
    expect((await plusOneRes.json()).id).toBe(t1.id);
  });

  it("GET /api/sources supports expanded query aliases and ref prefix lookups", async () => {
    const s1 = sources[0];
    const numRes = sourcesIndex(req("/api/sources?num=01"));
    expect(numRes.status).toBe(200);
    expect((await numRes.json()).sources[0].id).toBe(s1.id);

    const sRes = sourcesIndex(req("/api/sources?s=01"));
    expect(sRes.status).toBe(200);
    expect((await sRes.json()).sources[0].id).toBe(s1.id);

    const refRes = sourcesIndex(req("/api/sources?reference=oaiAug"));
    expect(refRes.status).toBe(200);
    expect((await refRes.json()).sources[0].id).toBe(s1.id);

    const uriRes = sourcesIndex(req("/api/sources?uri=openai.com"));
    expect(uriRes.status).toBe(200);
    expect((await uriRes.json()).sources.every((s: { url: string }) => s.url.includes("openai.com"))).toBe(true);

    const credRes = sourcesIndex(req("/api/sources?credibility=primary"));
    expect(credRes.status).toBe(200);
    expect((await credRes.json()).sources.every((s: { note?: string }) => s.note?.toLowerCase().includes("primary"))).toBe(true);

    const refOaiRes = await sourceOne(req("/api/sources/ref-oaiAug"), idCtx("ref-oaiAug"));
    expect(refOaiRes.status).toBe(200);
    expect((await refOaiRes.json()).id).toBe(s1.id);

    const refUnderscoreRes = await sourceOne(req("/api/sources/ref_oaiAug"), idCtx("ref_oaiAug"));
    expect(refUnderscoreRes.status).toBe(200);
    expect((await refUnderscoreRes.json()).id).toBe(s1.id);

    const referenceRes = await sourceOne(req("/api/sources/reference-oaiAug"), idCtx("reference-oaiAug"));
    expect(referenceRes.status).toBe(200);
    expect((await referenceRes.json()).id).toBe(s1.id);

    const ref1Res = await sourceOne(req("/api/sources/ref1"), idCtx("ref1"));
    expect(ref1Res.status).toBe(200);
    expect((await ref1Res.json()).id).toBe(s1.id);

    const ref01Res = await sourceOne(req("/api/sources/ref01"), idCtx("ref01"));
    expect(ref01Res.status).toBe(200);
    expect((await ref01Res.json()).id).toBe(s1.id);

    const refHyphen1Res = await sourceOne(req("/api/sources/ref-1"), idCtx("ref-1"));
    expect(refHyphen1Res.status).toBe(200);
    expect((await refHyphen1Res.json()).id).toBe(s1.id);

    const reference1Res = await sourceOne(req("/api/sources/reference1"), idCtx("reference1"));
    expect(reference1Res.status).toBe(200);
    expect((await reference1Res.json()).id).toBe(s1.id);

    const plusOneRes = await sourceOne(req("/api/sources/+1"), idCtx("+1"));
    expect(plusOneRes.status).toBe(200);
    expect((await plusOneRes.json()).id).toBe(s1.id);
  });

  it("GET /api/brand supports expanded query aliases (b, b_key, bKey, num, badge1)", async () => {
    const badge1 = TRUE_BADGES[0];
    const bRes = brandEndpoint(req("/api/brand?b=passive"));
    expect(bRes.status).toBe(200);
    expect((await bRes.json()).badge.key).toBe(badge1.key);

    const bKeyRes = brandEndpoint(req("/api/brand?b_key=passive"));
    expect(bKeyRes.status).toBe(200);
    expect((await bKeyRes.json()).badge.key).toBe(badge1.key);

    const bKeyCamelRes = brandEndpoint(req("/api/brand?bKey=passive"));
    expect(bKeyCamelRes.status).toBe(200);
    expect((await bKeyCamelRes.json()).badge.key).toBe(badge1.key);

    const bIdRes = brandEndpoint(req("/api/brand?b_id=passive"));
    expect(bIdRes.status).toBe(200);
    expect((await bIdRes.json()).badge.key).toBe(badge1.key);

    const bIdCamelRes = brandEndpoint(req("/api/brand?bId=passive"));
    expect(bIdCamelRes.status).toBe(200);
    expect((await bIdCamelRes.json()).badge.key).toBe(badge1.key);

    const numRes = brandEndpoint(req("/api/brand?num=1"));
    expect(numRes.status).toBe(200);
    expect((await numRes.json()).badge.key).toBe(badge1.key);

    const badge1Res = brandEndpoint(req("/api/brand?badge=badge1"));
    expect(badge1Res.status).toBe(200);
    expect((await badge1Res.json()).badge.key).toBe(badge1.key);

    const badge01Res = brandEndpoint(req("/api/brand?badge=badge01"));
    expect(badge01Res.status).toBe(200);
    expect((await badge01Res.json()).badge.key).toBe(badge1.key);

    const plusOneRes = brandEndpoint(req("/api/brand?badge=+1"));
    expect(plusOneRes.status).toBe(200);
    expect((await plusOneRes.json()).badge.key).toBe(badge1.key);
  });

  it("GET /api/tiers supports rank prefix and rank ID query aliases (rank-1, r-1, rank1, tier-1, rank_id)", async () => {
    const t1 = tiers[0];
    const rankHyphenRes = tiersIndex(req("/api/tiers?rank=rank-1"));
    expect(rankHyphenRes.status).toBe(200);
    expect((await rankHyphenRes.json()).tiers[0].id).toBe(t1.id);

    const rHyphenRes = tiersIndex(req("/api/tiers?rank=r-1"));
    expect(rHyphenRes.status).toBe(200);
    expect((await rHyphenRes.json()).tiers[0].id).toBe(t1.id);

    const rankDigitRes = tiersIndex(req("/api/tiers?rank=rank1"));
    expect(rankDigitRes.status).toBe(200);
    expect((await rankDigitRes.json()).tiers[0].id).toBe(t1.id);

    const tierPrefixRes = tiersIndex(req("/api/tiers?rank=tier-1"));
    expect(tierPrefixRes.status).toBe(200);
    expect((await tierPrefixRes.json()).tiers[0].id).toBe(t1.id);

    const rankIdRes = tiersIndex(req("/api/tiers?rank_id=1"));
    expect(rankIdRes.status).toBe(200);
    expect((await rankIdRes.json()).tiers[0].id).toBe(t1.id);

    const rankIdCamelRes = tiersIndex(req("/api/tiers?rankId=1"));
    expect(rankIdCamelRes.status).toBe(200);
    expect((await rankIdCamelRes.json()).tiers[0].id).toBe(t1.id);
  });

  it("GET /api/case-studies supports fix1, casestudy1, +1, and +f1 lookup and query filters", async () => {
    const f1 = findings[0];
    const fix1Res = caseStudiesIndex(req("/api/case-studies?id=fix1"));
    expect(fix1Res.status).toBe(200);
    expect((await fix1Res.json()).findings[0].id).toBe(f1.id);

    const cs1Res = caseStudiesIndex(req("/api/case-studies?id=casestudy1"));
    expect(cs1Res.status).toBe(200);
    expect((await cs1Res.json()).findings[0].id).toBe(f1.id);

    const plus1Res = caseStudiesIndex(req("/api/case-studies?id=+1"));
    expect(plus1Res.status).toBe(200);
    expect((await plus1Res.json()).findings[0].id).toBe(f1.id);

    const plusF1Res = caseStudiesIndex(req("/api/case-studies?id=+f1"));
    expect(plusF1Res.status).toBe(200);
    expect((await plusF1Res.json()).findings[0].id).toBe(f1.id);

    const csOneFix1 = await caseStudyOne(req("/api/case-studies/fix1"), idCtx("fix1"));
    expect(csOneFix1.status).toBe(200);
    expect((await csOneFix1.json()).id).toBe(f1.id);

    const csOnePlusF1 = await caseStudyOne(req("/api/case-studies/+f1"), idCtx("+f1"));
    expect(csOnePlusF1.status).toBe(200);
    expect((await csOnePlusF1.json()).id).toBe(f1.id);
  });

  it("GET /api/scenarios and /api/incidents support leading plus and ref prefix filters", async () => {
    const sc1 = scenarios[0];
    const plusNRes = scenariosIndex(req("/api/scenarios?n=+1"));
    expect(plusNRes.status).toBe(200);
    expect((await plusNRes.json()).scenarios[0].id).toBe(sc1.id);

    const plusH1Res = scenariosIndex(req("/api/scenarios?n=+h1"));
    expect(plusH1Res.status).toBe(200);
    expect((await plusH1Res.json()).scenarios[0].id).toBe(sc1.id);

    const scRefPrefixRes = scenariosIndex(req("/api/scenarios?ref=ref-cs26"));
    expect(scRefPrefixRes.status).toBe(200);
    expect((await scRefPrefixRes.json()).scenarios.some((s: { id: string }) => s.id === sc1.id)).toBe(true);

    const inc1 = incidents[0];
    const incPlusNRes = incidentsIndex(req("/api/incidents?n=+1"));
    expect(incPlusNRes.status).toBe(200);
    expect((await incPlusNRes.json()).incidents[0].id).toBe(inc1.id);

    const incPlus01Res = incidentsIndex(req("/api/incidents?n=+01"));
    expect(incPlus01Res.status).toBe(200);
    expect((await incPlus01Res.json()).incidents[0].id).toBe(inc1.id);

    const incRefPrefixRes = incidentsIndex(req("/api/incidents?source=ref-oaiAug"));
    expect(incRefPrefixRes.status).toBe(200);
    expect((await incRefPrefixRes.json()).incidents[0].id).toBe(inc1.id);

    const postRefPrefixRes = postsIndex(req("/api/posts?source=ref-oaiAug"));
    expect(postRefPrefixRes.status).toBe(200);
    expect((await postRefPrefixRes.json()).posts.length).toBeGreaterThan(0);
  });

  it("lib/http pagination and query parsing helpers support extended parameter aliases", () => {
    const params = new URLSearchParams("results=5&limit_count=10&skip_count=2&start_idx=4&page_id=3&sort_direction=up&search_term=openai");
    expect(parseLimit(new URLSearchParams("results=7"))).toBe(7);
    expect(parseLimit(new URLSearchParams("limit_count=8"))).toBe(8);
    expect(parseLimit(new URLSearchParams("limitCount=9"))).toBe(9);
    expect(parseLimit(new URLSearchParams("items=11"))).toBe(11);
    expect(parseLimit(new URLSearchParams("items_per_page=12"))).toBe(12);
    expect(parseLimit(new URLSearchParams("itemsPerPage=13"))).toBe(13);
    expect(parseLimit(new URLSearchParams("records=14"))).toBe(14);
    expect(parseLimit(new URLSearchParams("records_per_page=15"))).toBe(15);
    expect(parseLimit(new URLSearchParams("recordsPerPage=16"))).toBe(16);
    expect(parseLimit(new URLSearchParams("item_count=17"))).toBe(17);
    expect(parseLimit(new URLSearchParams("itemCount=18"))).toBe(18);
    expect(parseLimit(new URLSearchParams("num_results=19"))).toBe(19);
    expect(parseLimit(new URLSearchParams("numResults=20"))).toBe(20);
    expect(parseLimit(new URLSearchParams("top=21"))).toBe(21);
    expect(parseOffset(new URLSearchParams("skip_count=3"))).toBe(3);
    expect(parseOffset(new URLSearchParams("skipCount=4"))).toBe(4);
    expect(parseOffset(new URLSearchParams("start_idx=5"))).toBe(5);
    expect(parseOffset(new URLSearchParams("startIdx=6"))).toBe(6);
    expect(parseOffset(new URLSearchParams("from_index=7"))).toBe(7);
    expect(parseOffset(new URLSearchParams("fromIndex=8"))).toBe(8);
    expect(parseOffset(new URLSearchParams("from_idx=9"))).toBe(9);
    expect(parseOffset(new URLSearchParams("fromIdx=10"))).toBe(10);
    expect(parseOffset(new URLSearchParams("offset_count=11"))).toBe(11);
    expect(parseOffset(new URLSearchParams("offsetCount=12"))).toBe(12);
    expect(parseOffset(new URLSearchParams("offset_idx=13"))).toBe(13);
    expect(parseOffset(new URLSearchParams("offsetIdx=14"))).toBe(14);
    expect(parsePage(new URLSearchParams("page_id=2"))).toBe(2);
    expect(parsePage(new URLSearchParams("pageId=3"))).toBe(3);
    expect(parsePage(new URLSearchParams("p_num=4"))).toBe(4);
    expect(parsePage(new URLSearchParams("pNum=5"))).toBe(5);
    expect(parseSortOrder(new URLSearchParams("sort_direction=up"))).toBe("asc");
    expect(parseSortOrder(new URLSearchParams("sortDirection=down"))).toBe("desc");
    expect(parseSortOrder(new URLSearchParams("sort_direction=ascend"))).toBe("asc");
    expect(parseSortOrder(new URLSearchParams("sort_direction=descend"))).toBe("desc");
    expect(parseSortOrder(new URLSearchParams("order_dir=asc"))).toBe("asc");
    expect(parseSortOrder(new URLSearchParams("orderDir=desc"))).toBe("desc");
    expect(parseSortOrder(new URLSearchParams("order_direction=asc"))).toBe("asc");
    expect(parseSortOrder(new URLSearchParams("orderDirection=desc"))).toBe("desc");
    expect(parseSortOrder(new URLSearchParams("sort_order_dir=asc"))).toBe("asc");
    expect(parseSortOrder(new URLSearchParams("sortOrderDir=desc"))).toBe("desc");
    expect(parseSortOrder(new URLSearchParams("ordering=newer"))).toBe("desc");
    expect(parseSortOrder(new URLSearchParams("ordering=older"))).toBe("asc");
    expect(parseSortOrder(new URLSearchParams("order=chronological"))).toBe("asc");
    expect(parseSortOrder(new URLSearchParams("sort=chrono"))).toBe("asc");
    expect(parseSortOrder(new URLSearchParams("sort=rev"))).toBe("desc");
    expect(parseSortOrder(new URLSearchParams("sort=reversed"))).toBe("desc");
    expect(parseSortOrder(new URLSearchParams("sort=reverse-chronological"))).toBe("desc");
    expect(parseSortOrder(new URLSearchParams("sort_dir=reverse_chronological"))).toBe("desc");
    expect(parseSearchQuery(new URLSearchParams("search_term=foo"))).toBe("foo");
    expect(parseSearchQuery(new URLSearchParams("searchTerm=bar"))).toBe("bar");
    expect(parseSearchQuery(new URLSearchParams("keywords=baz"))).toBe("baz");
    expect(parseSearchQuery(new URLSearchParams("lookup=qux"))).toBe("qux");
    expect(parseSearchQuery(new URLSearchParams("q_term=quux"))).toBe("quux");
    expect(parseSearchQuery(new URLSearchParams("qTerm=corge"))).toBe("corge");
    expect(parseSearchQuery(new URLSearchParams("query_term=grault"))).toBe("grault");
    expect(parseSearchQuery(new URLSearchParams("queryTerm=garply"))).toBe("garply");
    expect(parseSearchQuery(new URLSearchParams("search_text=waldo"))).toBe("waldo");
    expect(parseSearchQuery(new URLSearchParams("searchText=fred"))).toBe("fred");
    expect(parseSearchQuery(new URLSearchParams("text=plugh"))).toBe("plugh");
    expect(parseSearchQuery(new URLSearchParams("filter_text=xyzzy"))).toBe("xyzzy");
    expect(parseSearchQuery(new URLSearchParams("filterText=thud"))).toBe("thud");
  });

  it("entity lookup helpers and API endpoints support leading hash fragment (#) resilience", async () => {
    expect(badgeByKey("#passive")?.key).toBe("passive");
    expect(badgeByKey("#1")?.key).toBe("passive");
    expect(badgeByKey("#badge-passive")?.key).toBe("passive");
    expect(badgeByKey("#b1")?.key).toBe("passive");

    expect(tierById("#seraphim")?.id).toBe("seraphim");
    expect(tierById("#1")?.id).toBe("seraphim");
    expect(tierById("#tier-1")?.id).toBe("seraphim");
    expect(tierById("#t1")?.id).toBe("seraphim");

    expect(findingById("#f-01")?.id).toBe("F-01");
    expect(findingById("#1")?.id).toBe("F-01");
    expect(findingById("#fix-1")?.id).toBe("F-01");
    expect(findingById("#cs-1")?.id).toBe("F-01");
    expect(remediationById("#f-01")?.id).toBe("F-01");

    expect(sourceById("#oaiAug")?.id).toBe("oaiAug");
    expect(sourceById("#1")?.id).toBe("oaiAug");
    expect(sourceById("#ref-oaiAug")?.id).toBe("oaiAug");

    expect(incidentById("#openai-huggingface-2026")?.id).toBe("openai-huggingface-2026");
    expect(incidentById("#01")?.id).toBe("openai-huggingface-2026");
    expect(incidentById("#1")?.id).toBe("openai-huggingface-2026");
    expect(incidentById("#case-01")?.id).toBe("openai-huggingface-2026");

    expect(scenarioById("#legacy-internal-app")?.id).toBe("legacy-internal-app");
    expect(scenarioById("#h1")?.id).toBe("legacy-internal-app");
    expect(scenarioById("#1")?.id).toBe("legacy-internal-app");

    expect(postBySlug("#when-the-test-subject-leaves-the-test")?.slug).toBe("when-the-test-subject-leaves-the-test");
    expect(postBySlug("#1")?.slug).toBe("when-the-test-subject-leaves-the-test");
    expect(postBySlug("#post-1")?.slug).toBe("when-the-test-subject-leaves-the-test");
    expect(postBySlug("#article-1")?.slug).toBe("when-the-test-subject-leaves-the-test");
  });

  it("API routes support extended query aliases (?tag=, ?r=, ?finding_no=, ?h=, ?ref_id=, ?incidentNo=, ?blog=)", async () => {
    const brandTagRes = brandEndpoint(req("/api/brand?tag=passive"));
    expect(brandTagRes.status).toBe(200);
    expect((await brandTagRes.json()).badge?.key).toBe("passive");

    const brandNameRes = brandEndpoint(req("/api/brand?badge_name=passive"));
    expect(brandNameRes.status).toBe(200);
    expect((await brandNameRes.json()).badge?.key).toBe("passive");

    const brandHashRes = brandEndpoint(req("/api/brand?badge=%23passive"));
    expect(brandHashRes.status).toBe(200);
    expect((await brandHashRes.json()).badge?.key).toBe("passive");

    const tierRRes = tiersIndex(req("/api/tiers?r=1"));
    expect(tierRRes.status).toBe(200);
    expect((await tierRRes.json()).tiers[0].id).toBe("seraphim");

    const tierRIdRes = tiersIndex(req("/api/tiers?r_id=1"));
    expect(tierRIdRes.status).toBe(200);
    expect((await tierRIdRes.json()).tiers[0].id).toBe("seraphim");

    const tierRankNumRes = tiersIndex(req("/api/tiers?rank_num=1"));
    expect(tierRankNumRes.status).toBe(200);
    expect((await tierRankNumRes.json()).tiers[0].id).toBe("seraphim");

    const tierHashRes = tiersIndex(req("/api/tiers?tier=%23seraphim"));
    expect(tierHashRes.status).toBe(200);
    expect((await tierHashRes.json()).tiers[0].id).toBe("seraphim");

    const csFindingNoRes = caseStudiesIndex(req("/api/case-studies?finding_no=01"));
    expect(csFindingNoRes.status).toBe(200);
    expect((await csFindingNoRes.json()).findings[0].id).toBe("F-01");

    const csIdAliasRes = caseStudiesIndex(req("/api/case-studies?case_study_id=f-01"));
    expect(csIdAliasRes.status).toBe(200);
    expect((await csIdAliasRes.json()).findings[0].id).toBe("F-01");

    const csHashRes = caseStudiesIndex(req("/api/case-studies?id=%23f-01"));
    expect(csHashRes.status).toBe(200);
    expect((await csHashRes.json()).findings[0].id).toBe("F-01");

    const scHRes = scenariosIndex(req("/api/scenarios?h=h1"));
    expect(scHRes.status).toBe(200);
    expect((await scHRes.json()).scenarios[0].id).toBe("legacy-internal-app");

    const scHIdRes = scenariosIndex(req("/api/scenarios?h_id=1"));
    expect(scHIdRes.status).toBe(200);
    expect((await scHIdRes.json()).scenarios[0].id).toBe("legacy-internal-app");

    const scNoRes = scenariosIndex(req("/api/scenarios?scenario_no=h1"));
    expect(scNoRes.status).toBe(200);
    expect((await scNoRes.json()).scenarios[0].id).toBe("legacy-internal-app");

    const scHashRes = scenariosIndex(req("/api/scenarios?id=%23h1"));
    expect(scHashRes.status).toBe(200);
    expect((await scHashRes.json()).scenarios[0].id).toBe("legacy-internal-app");

    const srcRefIdRes = sourcesIndex(req("/api/sources?ref_id=oaiAug"));
    expect(srcRefIdRes.status).toBe(200);
    expect((await srcRefIdRes.json()).sources[0].id).toBe("oaiAug");

    const srcReferenceIdRes = sourcesIndex(req("/api/sources?reference_id=oaiAug"));
    expect(srcReferenceIdRes.status).toBe(200);
    expect((await srcReferenceIdRes.json()).sources[0].id).toBe("oaiAug");

    const srcHashRes = sourcesIndex(req("/api/sources?id=%23oaiAug"));
    expect(srcHashRes.status).toBe(200);
    expect((await srcHashRes.json()).sources[0].id).toBe("oaiAug");

    const incIncidentNoRes = incidentsIndex(req("/api/incidents?incidentNo=01"));
    expect(incIncidentNoRes.status).toBe(200);
    expect((await incIncidentNoRes.json()).incidents[0].id).toBe("openai-huggingface-2026");

    const incCaseNoRes = incidentsIndex(req("/api/incidents?caseNo=01"));
    expect(incCaseNoRes.status).toBe(200);
    expect((await incCaseNoRes.json()).incidents[0].id).toBe("openai-huggingface-2026");

    const incHashRes = incidentsIndex(req("/api/incidents?id=%23openai-huggingface-2026"));
    expect(incHashRes.status).toBe(200);
    expect((await incHashRes.json()).incidents[0].id).toBe("openai-huggingface-2026");

    const postBlogRes = postsIndex(req("/api/posts?blog=when-the-test-subject-leaves-the-test"));
    expect(postBlogRes.status).toBe(200);
    expect((await postBlogRes.json()).posts[0].slug).toBe("when-the-test-subject-leaves-the-test");

    const postBlogIdRes = postsIndex(req("/api/posts?blogId=1"));
    expect(postBlogIdRes.status).toBe(200);
    expect((await postBlogIdRes.json()).posts[0].slug).toBe("when-the-test-subject-leaves-the-test");

    const postHashRes = postsIndex(req("/api/posts?slug=%23when-the-test-subject-leaves-the-test"));
    expect(postHashRes.status).toBe(200);
    expect((await postHashRes.json()).posts[0].slug).toBe("when-the-test-subject-leaves-the-test");
  });
});


