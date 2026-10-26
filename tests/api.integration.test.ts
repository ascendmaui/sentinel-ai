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
import { BRAND_EMAIL, BRAND_MAIL, BRAND_NAME, BRAND_PARENT, BRAND_SUFFIX, BRAND_TAGLINE, BRAND_WORD, SHOW_CODE_RAIN, SITE_URL, TRUE_BADGES } from "../lib/brand";
import { THEME_META, THEME_NAMES } from "../lib/theme";
import * as postsModule from "../lib/posts";
import { posts } from "../lib/posts";
import * as incidentsModule from "../lib/incidents";
import { incidents, scenarios } from "../lib/incidents";
import * as caseStudiesModule from "../lib/caseStudies";
import { findings } from "../lib/caseStudies";
import { tiers } from "../lib/tiers";
import { S, sources } from "../lib/sources";
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
    expect(parseSortOrder(new URLSearchParams("order=first"))).toBe("asc");
    expect(parseSortOrder(new URLSearchParams("order=desc"))).toBe("desc");
    expect(parseSortOrder(new URLSearchParams("order=descending"))).toBe("desc");
    expect(parseSortOrder(new URLSearchParams("order=newest"))).toBe("desc");
    expect(parseSortOrder(new URLSearchParams("order=last"))).toBe("desc");
    expect(parseSortOrder(new URLSearchParams("order=reverse"))).toBe("desc");
    expect(parseSortOrder(new URLSearchParams("sort=ASC"))).toBe("asc");
    expect(parseSortOrder(new URLSearchParams("dir=desc"))).toBe("desc");
    expect(parseSortOrder(new URLSearchParams("direction=asc"))).toBe("asc");
    expect(parseSortOrder(new URLSearchParams("direction=desc"))).toBe("desc");
    expect(parseSortOrder(new URLSearchParams("orderBy=asc"))).toBe("asc");
    expect(parseSortOrder(new URLSearchParams("order_by=desc"))).toBe("desc");
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
    expect(parseSearchQuery(new URLSearchParams("q=  Modal  "))).toBe("modal");
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

    const unknownBadgeRes = brandEndpoint(req("/api/brand?badge=nonexistent"));
    expect(unknownBadgeRes.status).toBe(200);
    expect((await unknownBadgeRes.json()).badge).toBeNull();
  });
});


