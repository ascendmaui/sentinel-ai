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
import { posts } from "../lib/posts";
import { incidents, scenarios } from "../lib/incidents";
import { findings } from "../lib/caseStudies";
import { tiers } from "../lib/tiers";
import { S, sources } from "../lib/sources";
import { methodNotAllowed, SECURITY_HEADERS } from "../lib/http";

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

  it("filters by search query parameter q", async () => {
    const res = postsIndex(req("/api/posts?q=hugging"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBeGreaterThan(0);
    for (const p of body.posts) {
      const match =
        p.title.toLowerCase().includes("hugging") || p.description.toLowerCase().includes("hugging");
      expect(match).toBe(true);
    }
  });

  it("limits result count using limit query parameter", async () => {
    const res = postsIndex(req("/api/posts?limit=2"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.posts).toHaveLength(2);
    expect(body.count).toBe(2);
    expect(body.totalCount).toBe(posts.length);
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

  it("supports case-insensitive post slug lookup", async () => {
    const first = posts[0];
    const res = await postOne(req(`/api/posts/${first.slug.toUpperCase()}`), slugCtx(first.slug.toUpperCase()));
    expect(res.status).toBe(200);
    expect((await res.json()).slug).toBe(first.slug);
  });


  it.each(["nope", "", "../etc/passwd", "%2e%2e", "__proto__", "constructor", "toString"])(
    "returns a JSON 404 for %j",
    async (slug) => {
      const res = await postOne(req(`/api/posts/${slug}`), slugCtx(slug));
      expect(res.status).toBe(404);
      expect(res.headers.get("content-type")).toContain("application/json");
      expect(await res.json()).toMatchObject({ error: "not_found" });
    },
  );

  it("generateStaticParams covers every post", () => {
    expect(postParams()).toEqual(posts.map((p) => ({ slug: p.slug })));
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

  it("supports case-insensitive incident lookup", async () => {
    const first = incidents[0];
    const res = await incidentOne(req(`/api/incidents/${first.id.toUpperCase()}`), idCtx(first.id.toUpperCase()));
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe(first.id);
  });

  it.each(["nonexistent-incident", "../etc/passwd", "__proto__", "constructor", "toString"])(
    "returns a JSON 404 for %j",
    async (id) => {
      const res = await incidentOne(req(`/api/incidents/${id}`), idCtx(id));
      expect(res.status).toBe(404);
      expect(res.headers.get("content-type")).toContain("application/json");
      expect(await res.json()).toMatchObject({ error: "not_found" });
    },
  );

  it("generateStaticParams covers every incident", () => {
    expect(incidentParams()).toEqual(incidents.map((i) => ({ id: i.id })));
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

  it("supports case-insensitive finding lookup", async () => {
    const res = await caseStudyOne(req("/api/case-studies/f-01"), idCtx("f-01"));
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe("F-01");
  });

  it.each(["F-999", "unknown", "__proto__", "constructor", "toString"])(
    "returns a JSON 404 for %j",
    async (id) => {
      const res = await caseStudyOne(req(`/api/case-studies/${id}`), idCtx(id));
      expect(res.status).toBe(404);
      expect(res.headers.get("content-type")).toContain("application/json");
      expect(await res.json()).toMatchObject({ error: "not_found" });
    },
  );

  it("generateStaticParams covers every finding", () => {
    expect(caseStudyParams()).toEqual(findings.map((f) => ({ id: f.id.toLowerCase() })));
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

  it("supports case-insensitive tier lookup", async () => {
    const res = await tierOne(req("/api/tiers/SERAPHIM"), idCtx("SERAPHIM"));
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe("seraphim");
  });

  it.each(["free", "enterprise-plus", "__proto__", "constructor", "toString"])(
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

describe("methodNotAllowed helper", () => {
  it("returns 405 with JSON body, Allow header, and hardening headers", async () => {
    const res = methodNotAllowed(["GET", "HEAD"]);
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("GET, HEAD");
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(await res.json()).toMatchObject({ error: "method_not_allowed" });
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

  it("supports case-insensitive scenario lookup", async () => {
    const first = scenarios[0];
    const res = await scenarioOne(req(`/api/scenarios/${first.id.toUpperCase()}`), idCtx(first.id.toUpperCase()));
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe(first.id);
  });

  it.each(["nonexistent-scenario", "../etc/passwd", "__proto__", "constructor", "toString"])(
    "returns a JSON 404 for %j",
    async (id) => {
      const res = await scenarioOne(req(`/api/scenarios/${id}`), idCtx(id));
      expect(res.status).toBe(404);
      expect(res.headers.get("content-type")).toContain("application/json");
      expect(await res.json()).toMatchObject({ error: "not_found" });
    },
  );

  it("generateStaticParams covers all scenarios", () => {
    expect(scenarioParams()).toEqual(scenarios.map((s) => ({ id: s.id })));
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

  it("supports case-insensitive source lookup", async () => {
    const first = sources[0];
    const res = await sourceOne(req(`/api/sources/${first.id.toUpperCase()}`), idCtx(first.id.toUpperCase()));
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe(first.id);
  });

  it.each(["nonexistent-source", "../etc/passwd", "__proto__", "constructor", "toString"])(
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
  });
});


