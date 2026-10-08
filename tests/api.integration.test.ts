import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as health } from "../app/api/health/route";
import { GET as postsIndex } from "../app/api/posts/route";
import { GET as postOne, generateStaticParams } from "../app/api/posts/[slug]/route";
import { BRAND_NAME } from "../lib/brand";
import { posts } from "../lib/posts";
import { S } from "../lib/sources";

const ctx = (slug: string) => ({ params: Promise.resolve({ slug }) });
const req = (path: string) => new Request(`http://localhost${path}`);

afterEach(() => vi.unstubAllEnvs());

describe("GET /api/health", () => {
  it("returns ok JSON, uncached, with hardening headers", async () => {
    const res = health();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await res.json()).toMatchObject({ status: "ok", service: BRAND_NAME });
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
});

describe("GET /api/posts/[slug]", () => {
  it("returns every known post with resolved source records", async () => {
    for (const p of posts) {
      const res = await postOne(req(`/api/posts/${p.slug}`), ctx(p.slug));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.slug).toBe(p.slug);
      expect(body.body.length).toBeGreaterThan(0);
      expect(body.sources.map((s: { id: string }) => s.id)).toEqual(p.sources);
      for (const s of body.sources) expect(s.url).toBe(S[s.id].url);
    }
  });

  it.each(["nope", "", "../etc/passwd", "%2e%2e", "__proto__", "constructor", "toString"])(
    "returns a JSON 404 for %j",
    async (slug) => {
      const res = await postOne(req(`/api/posts/${slug}`), ctx(slug));
      expect(res.status).toBe(404);
      expect(res.headers.get("content-type")).toContain("application/json");
      expect(await res.json()).toMatchObject({ error: "not_found" });
    },
  );

  it("generateStaticParams covers every post", () => {
    expect(generateStaticParams()).toEqual(posts.map((p) => ({ slug: p.slug })));
  });
});
