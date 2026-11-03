import { describe, expect, it } from "vitest";
import robots from "../app/robots";
import sitemap from "../app/sitemap";
import { posts } from "../lib/posts";
import { resolveSiteUrl } from "../lib/brand";
import { DEFAULT_THEME, THEME_BOOT_SCRIPT, THEME_KEY, THEME_META, THEME_NAMES } from "../lib/theme";

describe("robots.txt metadata", () => {
  it("allows all crawlers and points at the sitemap on the resolved origin", () => {
    const r = robots();
    const site = resolveSiteUrl();
    expect(r.rules).toEqual([{ userAgent: "*", allow: "/" }]);
    expect(r.sitemap).toBe(`${site}/sitemap.xml`);
    expect(r.host).toBe(site);
  });

  it("does not expose API routes as disallowed hints or leak absolute paths", () => {
    expect(JSON.stringify(robots())).not.toContain("disallow");
  });
});

describe("sitemap metadata", () => {
  const entries = sitemap();
  const site = resolveSiteUrl();

  it("lists static pages and one entry per post with unique absolute URLs", () => {
    const urls = entries.map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toContain(site);
    for (const p of ["/pricing", "/incident-case-studies", "/blog", "/case-studies"]) {
      expect(urls).toContain(`${site}${p}`);
    }
    for (const post of posts) expect(urls).toContain(`${site}/blog/${post.slug}`);
    expect(entries).toHaveLength(5 + posts.length);
  });

  it("has valid priorities and lastModified dates", () => {
    for (const e of entries) {
      expect(e.priority).toBeGreaterThan(0);
      expect(e.priority).toBeLessThanOrEqual(1);
      expect(e.lastModified).toBeInstanceOf(Date);
      expect(Number.isNaN((e.lastModified as Date).getTime())).toBe(false);
    }
  });

  it("excludes API routes", () => {
    expect(entries.some((e) => e.url.includes("/api/"))).toBe(false);
  });
});

describe("theme config", () => {
  it("default theme is a known theme and every theme has a meta color", () => {
    expect(THEME_NAMES).toContain(DEFAULT_THEME);
    for (const n of THEME_NAMES) expect(THEME_META[n]).toMatch(/^#|^rgb|^hsl/i);
  });

  it("boot script is valid JS that falls back safely", () => {
    expect(() => new Function(THEME_BOOT_SCRIPT)).not.toThrow();
    expect(THEME_BOOT_SCRIPT).toContain(THEME_KEY);
    for (const n of THEME_NAMES) expect(THEME_BOOT_SCRIPT).toContain(`"${n}"`);
  });

  it("boot script applies stored theme, ignores junk, and survives storage errors", () => {
    const run = (store: () => string | null, mm?: (q: string) => { matches: boolean }) => {
      const attrs: Record<string, string> = {};
      const doc = { documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v) } };
      const win = { matchMedia: mm };
      new Function("document", "localStorage", "window", `var matchMedia=window.matchMedia;${THEME_BOOT_SCRIPT.replace(/window\.matchMedia/g, "matchMedia")}`)(
        doc,
        { getItem: store },
        win,
      );
      return attrs["data-theme"];
    };
    expect(run(() => "light")).toBe("light");
    expect(run(() => "junk")).toBe(DEFAULT_THEME);
    expect(run(() => { throw new Error("denied"); })).toBe(DEFAULT_THEME);
    expect(run(() => null, (q) => ({ matches: q.includes("contrast") }))).toBe("high-contrast");
    expect(run(() => null, (q) => ({ matches: q.includes("light") }))).toBe("light");
  });
});
