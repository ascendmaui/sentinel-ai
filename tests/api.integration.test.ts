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
import { badRequest, json, methodNotAllowed, notFound, parseLimit, parseSearchQuery, SECURITY_HEADERS } from "../lib/http";

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
});

describe("GET /api/posts/[slug]", () => {
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

  it("supports case-insensitive post slug lookup and trims whitespace", async () => {
    const first = posts[0];
    const res = await postOne(req(`/api/posts/${first.slug.toUpperCase()}`), slugCtx(first.slug.toUpperCase()));
    expect(res.status).toBe(200);
    expect((await res.json()).slug).toBe(first.slug);

    const trimRes = await postOne(req(`/api/posts/${first.slug}`), slugCtx(`  ${first.slug}  `));
    expect(trimRes.status).toBe(200);
    expect((await trimRes.json()).slug).toBe(first.slug);
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
});

describe("GET /api/incidents/[id]", () => {
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

  it("supports case-insensitive incident lookup and trims whitespace", async () => {
    const first = incidents[0];
    const res = await incidentOne(req(`/api/incidents/${first.id.toUpperCase()}`), idCtx(first.id.toUpperCase()));
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe(first.id);

    const trimRes = await incidentOne(req(`/api/incidents/${first.id}`), idCtx(`  ${first.id}  `));
    expect(trimRes.status).toBe(200);
    expect((await trimRes.json()).id).toBe(first.id);
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
});

describe("GET /api/case-studies/[id]", () => {
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

  it("supports case-insensitive finding lookup and trims whitespace", async () => {
    const res = await caseStudyOne(req("/api/case-studies/f-01"), idCtx("f-01"));
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe("F-01");

    const trimRes = await caseStudyOne(req("/api/case-studies/f-01"), idCtx("  f-01  "));
    expect(trimRes.status).toBe(200);
    expect((await trimRes.json()).id).toBe("F-01");
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
});

describe("GET /api/tiers/[id]", () => {
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

  it("supports case-insensitive tier lookup and trims whitespace", async () => {
    const res = await tierOne(req("/api/tiers/SERAPHIM"), idCtx("SERAPHIM"));
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe("seraphim");

    const trimRes = await tierOne(req("/api/tiers/seraphim"), idCtx("  seraphim  "));
    expect(trimRes.status).toBe(200);
    expect((await trimRes.json()).id).toBe("seraphim");
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
  });

  it("parseLimit handles valid, invalid, negative, and capped limits", () => {
    expect(parseLimit(new URLSearchParams("limit=5"))).toBe(5);
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

  it("parseSearchQuery handles valid, whitespace, and custom param keys", () => {
    expect(parseSearchQuery(new URLSearchParams("q=Seraphim"))).toBe("seraphim");
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

  it("filters scenarios by cited reference ID", async () => {
    const refRes = scenariosIndex(req("/api/scenarios?ref=cs26"));
    expect(refRes.status).toBe(200);
    const refBody = await refRes.json();
    expect(refBody.count).toBeGreaterThan(0);

    const noneRes = scenariosIndex(req("/api/scenarios?ref=nonexistent-ref"));
    expect(noneRes.status).toBe(200);
    expect((await noneRes.json()).count).toBe(0);
  });
});

describe("GET /api/scenarios/[id]", () => {
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

  it("supports case-insensitive scenario lookup and trims whitespace", async () => {
    const first = scenarios[0];
    const res = await scenarioOne(req(`/api/scenarios/${first.id.toUpperCase()}`), idCtx(first.id.toUpperCase()));
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe(first.id);

    const trimRes = await scenarioOne(req(`/api/scenarios/${first.id}`), idCtx(`  ${first.id}  `));
    expect(trimRes.status).toBe(200);
    expect((await trimRes.json()).id).toBe(first.id);
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
});

describe("GET /api/sources/[id]", () => {
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
  });
});


