import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { badgeByKey, BRAND_EMAIL, BRAND_MAIL, BRAND_NAME, BRAND_PARENT, BRAND_SUFFIX, BRAND_WORD, resolveSiteUrl, SITE_URL, TRUE_BADGES } from "../lib/brand";
import { findings, findingById, remediation, remediationById, severityCounts } from "../lib/caseStudies";
import { incidents, incidentById, scenarios, scenarioById, unverified } from "../lib/incidents";
import { posts, postBySlug, postWords } from "../lib/posts";
import { S, sources, sourceById } from "../lib/sources";
import { helper, matrix, tierById, tierHref, tiers } from "../lib/tiers";
import { DEFAULT_THEME, THEME_BOOT_SCRIPT, THEME_META, THEME_NAMES } from "../lib/theme";
import tokens from "../lib/tokens.json";
import robots from "../app/robots";
import sitemap from "../app/sitemap";

describe("brand", () => {
  it("derives the two-tone wordmark from BRAND_NAME", () => {
    expect(`${BRAND_WORD} ${BRAND_SUFFIX}`.trim()).toBe(BRAND_NAME);
    expect(BRAND_MAIL).toBe(encodeURIComponent(BRAND_NAME));
  });

  it("has valid BRAND_EMAIL and SITE_URL", () => {
    expect(BRAND_EMAIL).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(() => new URL(SITE_URL)).not.toThrow();
  });

  it("resolves site URL correctly across environments", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://custom.seraphim.ai/" })).toBe("https://custom.seraphim.ai");
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "   https://custom.seraphim.ai///   " })).toBe("https://custom.seraphim.ai");
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "   ", SITE_URL: "https://fallback.seraphim.ai//" })).toBe("https://fallback.seraphim.ai");
    expect(resolveSiteUrl({ SITE_URL: "https://env.seraphim.ai" })).toBe("https://env.seraphim.ai");
    expect(resolveSiteUrl({ VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "seraphim.ai/" })).toBe("https://seraphim.ai");
    expect(resolveSiteUrl({ VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "https://seraphim.ai///" })).toBe("https://seraphim.ai");
    expect(resolveSiteUrl({ VERCEL_URL: "preview-123.vercel.app/" })).toBe("https://preview-123.vercel.app");
    expect(resolveSiteUrl({ VERCEL_URL: "https://preview-123.vercel.app///" })).toBe("https://preview-123.vercel.app");
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "custom.seraphim.ai" })).toBe("https://custom.seraphim.ai");
    expect(resolveSiteUrl({ SITE_URL: "fallback.seraphim.ai" })).toBe("https://fallback.seraphim.ai");
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "HTTPS://CUSTOM.SERAPHIM.AI/" })).toBe("https://custom.seraphim.ai");
    expect(resolveSiteUrl({ SITE_URL: "HTTP://LOCALHOST:4000/" })).toBe("http://localhost:4000");
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "///", SITE_URL: "https://valid.seraphim.ai" })).toBe("https://valid.seraphim.ai");
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://", SITE_URL: "http://", VERCEL_URL: "preview.vercel.app" })).toBe("https://preview.vercel.app");
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "not a valid url", SITE_URL: "bad..host..name" })).toBe("http://localhost:3000");
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://user:pass@seraphim.ai", SITE_URL: "https://.seraphim.ai" })).toBe("http://localhost:3000");
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://seraphim.ai." })).toBe("http://localhost:3000");
    expect(resolveSiteUrl({ VERCEL_ENV: "  PRODUCTION  ", VERCEL_PROJECT_PRODUCTION_URL: "prod.seraphim.ai" })).toBe("https://prod.seraphim.ai");
    expect(resolveSiteUrl(null as unknown as Record<string, string | undefined>)).toBe("http://localhost:3000");
    expect(resolveSiteUrl({ VERCEL_ENV: "preview", VERCEL_PROJECT_PRODUCTION_URL: "prod.seraphim.ai", VERCEL_URL: "branch-preview.vercel.app" })).toBe("https://branch-preview.vercel.app");
    expect(resolveSiteUrl({ VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "   ", VERCEL_URL: "fallback-prod.vercel.app" })).toBe("https://fallback-prod.vercel.app");
    expect(resolveSiteUrl({})).toBe("http://localhost:3000");
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "", SITE_URL: "" })).toBe("http://localhost:3000");
  });

  it("defines unique, honest trust badges and supports defensive badgeByKey lookup", () => {
    const keys = TRUE_BADGES.map((b) => b.key);
    expect(new Set(keys).size).toBe(TRUE_BADGES.length);
    for (const b of TRUE_BADGES) {
      expect(b.label.length).toBeGreaterThan(0);
      expect(b.note.length).toBeGreaterThan(0);
      expect(badgeByKey(b.key)).toBe(b);
      expect(badgeByKey(b.key.toUpperCase())).toBe(b);
    }
    expect(badgeByKey("nonexistent")).toBeUndefined();
    expect(badgeByKey("")).toBeUndefined();
    expect(badgeByKey("   ")).toBeUndefined();
    expect(badgeByKey(undefined as unknown as string)).toBeUndefined();
    expect(badgeByKey(null as unknown as string)).toBeUndefined();
    expect(badgeByKey(123 as unknown as string)).toBeUndefined();
    expect(badgeByKey(true as unknown as string)).toBeUndefined();
    expect(badgeByKey("  passive  ")).toEqual(TRUE_BADGES.find((b) => b.key === "passive"));
    expect(badgeByKey("badge-passive")).toEqual(TRUE_BADGES.find((b) => b.key === "passive"));
    expect(badgeByKey("badge_passive")).toEqual(TRUE_BADGES.find((b) => b.key === "passive"));
    expect(badgeByKey("passive.json")).toEqual(TRUE_BADGES.find((b) => b.key === "passive"));
    expect(badgeByKey("badge%2Dpassive")).toEqual(TRUE_BADGES.find((b) => b.key === "passive"));
    expect(badgeByKey("/passive/")).toEqual(TRUE_BADGES.find((b) => b.key === "passive"));
    expect(badgeByKey("//badge-passive//")).toEqual(TRUE_BADGES.find((b) => b.key === "passive"));
    expect(badgeByKey("1")).toEqual(TRUE_BADGES[0]);
    expect(badgeByKey("01")).toEqual(TRUE_BADGES[0]);
    expect(badgeByKey("5")).toEqual(TRUE_BADGES[4]);
    expect(badgeByKey("05")).toEqual(TRUE_BADGES[4]);
    expect(badgeByKey("6")).toBeUndefined();
    expect(badgeByKey("0")).toBeUndefined();
    expect(badgeByKey("b-1")).toEqual(TRUE_BADGES[0]);
    expect(badgeByKey("b_1")).toEqual(TRUE_BADGES[0]);
    expect(badgeByKey("b1")).toEqual(TRUE_BADGES[0]);
    expect(badgeByKey("b01")).toEqual(TRUE_BADGES[0]);
    expect(badgeByKey("badge1")).toEqual(TRUE_BADGES[0]);
    expect(badgeByKey("badge01")).toEqual(TRUE_BADGES[0]);
    expect(badgeByKey("+1")).toEqual(TRUE_BADGES[0]);
    expect(badgeByKey("Passive recon only")).toEqual(TRUE_BADGES[0]);
    expect(badgeByKey("Written client authorization required")).toEqual(TRUE_BADGES[1]);
  });
});

describe("theme and tokens", () => {
  it("theme names match tokens and THEME_META keys", () => {
    expect(tokens.name).toBe(BRAND_NAME);
    expect(DEFAULT_THEME).toBe(tokens.defaultTheme);
    expect(THEME_NAMES).toContain(DEFAULT_THEME);
    expect(THEME_NAMES).toEqual(["dark", "light", "high-contrast"]);
    expect(Object.keys(tokens.themes).sort()).toEqual([...THEME_NAMES].sort());
    expect(Object.keys(THEME_META).sort()).toEqual([...THEME_NAMES].sort());
    for (const name of THEME_NAMES) {
      expect(THEME_META[name]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("theme boot script is valid executable JavaScript", () => {
    expect(THEME_BOOT_SCRIPT.length).toBeGreaterThan(0);
    expect(() => new Function(THEME_BOOT_SCRIPT)).not.toThrow();
  });

  it("theme boot script evaluates cleanly in simulated DOM environments across all preference branches", () => {
    const createEnv = (storageVal: string | null | (() => never), matches: (q: string) => boolean, hasMatchMedia = true) => {
      const doc = {
        documentElement: {
          theme: "",
          setAttribute(k: string, v: string) {
            if (k === "data-theme") this.theme = v;
          },
        },
      };
      const storage = {
        getItem: typeof storageVal === "function" ? storageVal : () => storageVal,
      };
      const win = hasMatchMedia
        ? { matchMedia: (q: string) => ({ matches: matches(q) }) }
        : {};
      const run = new Function("document", "localStorage", "window", THEME_BOOT_SCRIPT);
      run(doc, storage, win);
      return doc.documentElement.theme;
    };

    // Stored valid values override media queries
    expect(createEnv("high-contrast", () => false)).toBe("high-contrast");
    expect(createEnv("light", () => false)).toBe("light");
    expect(createEnv("dark", (q) => q.includes("light"))).toBe("dark");

    // Invalid stored value falls through to media query
    expect(createEnv("custom-invalid", (q) => q.includes("more"))).toBe("high-contrast");
    expect(createEnv("custom-invalid", (q) => q.includes("light"))).toBe("light");
    expect(createEnv(null, () => false)).toBe("dark");

    // prefers-contrast takes priority over prefers-color-scheme light
    expect(createEnv(null, (q) => q.includes("more") || q.includes("light"))).toBe("high-contrast");

    // Exception in localStorage (e.g. private mode SecurityError) safely falls back to dark
    expect(createEnv(() => { throw new Error("SecurityError"); }, () => true)).toBe("dark");

    // Missing matchMedia falls back to dark
    expect(createEnv(null, () => false, false)).toBe("dark");
  });

  it("app/tokens.css defines every theme from THEME_NAMES with matching background color tokens and identical custom property sets", () => {
    const css = readFileSync(join(__dirname, "..", "app", "tokens.css"), "utf8");
    const themePropertySets: string[][] = [];
    for (const name of THEME_NAMES) {
      expect(css).toContain(`[data-theme="${name}"]`);
      expect(css).toContain(`--ao-bg: ${THEME_META[name]};`);
      const blockMatch = css.match(new RegExp(`\\[data-theme="${name}"\\]\\s*\\{([^}]+)\\}`));
      expect(blockMatch, `theme block for ${name}`).not.toBeNull();
      const props = [...blockMatch![1].matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]).sort();
      expect(props.length).toBeGreaterThanOrEqual(45);
      themePropertySets.push(props);
    }
    expect(themePropertySets[1]).toEqual(themePropertySets[0]);
    expect(themePropertySets[2]).toEqual(themePropertySets[0]);
  });

  it("every CSS var(--...) reference without fallback across app/ and components/ resolves to a defined custom property", () => {
    const rootDir = join(__dirname, "..");
    const tokensCss = readFileSync(join(rootDir, "app", "tokens.css"), "utf8");
    const globalsCss = readFileSync(join(rootDir, "app", "globals.css"), "utf8");
    const definedVars = new Set<string>(["--font-display", "--font-body", "--font-mono"]);
    for (const m of tokensCss.matchAll(/(--[a-z0-9-]+)\s*:/g)) definedVars.add(m[1]);
    for (const m of globalsCss.matchAll(/(--[a-z0-9-]+)\s*:/g)) definedVars.add(m[1]);

    const walkFiles = (dir: string): string[] => {
      const out: string[] = [];
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) out.push(...walkFiles(full));
        else if (/\.(css|tsx|ts)$/.test(entry)) out.push(full);
      }
      return out;
    };

    const sourceFiles = [...walkFiles(join(rootDir, "app")), ...walkFiles(join(rootDir, "components"))];
    for (const file of sourceFiles) {
      const content = readFileSync(file, "utf8");
      for (const m of content.matchAll(/var\(\s*(--[a-z0-9-]+)\s*\)/g)) {
        expect(definedVars.has(m[1]), `${file} references undefined CSS custom property ${m[1]}`).toBe(true);
      }
    }

    for (const sev of ["critical", "high", "medium", "low", "info"]) {
      expect(globalsCss).toContain(`.cs-sev-${sev}`);
    }
    for (const tag of ["known", "inferred", "ours"]) {
      expect(globalsCss).toContain(`.tag-${tag}`);
    }
    expect(globalsCss).toContain(".post-src a");
    expect(globalsCss).toContain(".theme-switch button.is-on");
    for (const cardCls of [".section", ".tier-card", ".inc", ".scn", ".cs-finding"]) {
      expect(globalsCss).toMatch(new RegExp(`\\${cardCls}\\s*\\{[^}]*scroll-margin-top:`));
    }
  });

  it("app/icon.svg is a valid text-free SVG icon matching Logo.tsx Mark geometry and dark theme background", () => {
    const svg = readFileSync(join(__dirname, "..", "app", "icon.svg"), "utf8");
    const logoSrc = readFileSync(join(__dirname, "..", "components", "Logo.tsx"), "utf8");
    expect(svg).toMatch(/^<svg[^>]+viewBox="0 0 32 32"/);
    expect(svg.trim()).toMatch(/<\/svg>$/);
    expect(svg).not.toMatch(/<text\b/i);
    expect(svg).not.toMatch(/<tspan\b/i);
    expect(svg.toLowerCase()).not.toContain("seraphim");
    expect(svg).toContain(`fill="${THEME_META.dark}"`);

    const iconPaths = [...svg.matchAll(/<path[^>]*\bd="([^"]+)"/g)].map((m) => m[1]);
    const markPaths = [...logoSrc.matchAll(/\bd="([^"]+)"/g)].map((m) => m[1]);
    expect(iconPaths.length).toBe(5);
    expect(iconPaths).toEqual(markPaths);
  });

  it("public/og.png is a valid 1200x630 PNG matching OpenGraph metadata", () => {
    const ogBuf = readFileSync(join(__dirname, "..", "public", "og.png"));
    expect(ogBuf.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(ogBuf.subarray(12, 16).toString("ascii")).toBe("IHDR");
    expect(ogBuf.readUInt32BE(16)).toBe(1200);
    expect(ogBuf.readUInt32BE(20)).toBe(630);
  });

  it("lib/brand.ts is the single source of truth for BRAND_NAME, BRAND_PARENT, and BRAND_EMAIL across all TS/TSX modules", () => {
    const rootDir = join(__dirname, "..");
    const brandFile = join(rootDir, "lib", "brand.ts");
    const walkTs = (dir: string): string[] => {
      const out: string[] = [];
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) out.push(...walkTs(full));
        else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
      }
      return out;
    };
    const files = [
      ...walkTs(join(rootDir, "app")),
      ...walkTs(join(rootDir, "components")),
      ...walkTs(join(rootDir, "lib")),
    ].filter((f) => f !== brandFile);

    for (const file of files) {
      const src = readFileSync(file, "utf8");
      expect(src, `${file} hardcodes BRAND_NAME`).not.toContain(BRAND_NAME);
      expect(src, `${file} hardcodes BRAND_PARENT`).not.toContain(BRAND_PARENT);
      expect(src, `${file} hardcodes BRAND_EMAIL`).not.toContain(BRAND_EMAIL);
    }
  });
});


describe("sources registry", () => {
  it("has ids that match their keys and well-formed https URLs", () => {
    for (const [key, s] of Object.entries(S)) {
      expect(s.id).toBe(key);
      expect(s.label.length).toBeGreaterThan(0);
      expect(() => new URL(s.url)).not.toThrow();
      expect(new URL(s.url).protocol).toBe("https:");
    }
  });

  it("sources array matches S values and has no unreferenced orphan entries", () => {
    expect(sources).toHaveLength(Object.keys(S).length);
    expect(new Set(sources.map((s) => s.id)).size).toBe(sources.length);

    const referencedIds = new Set<string>([
      ...posts.flatMap((p) => p.sources),
      ...incidents.flatMap((i) => i.sources),
      ...scenarios.flatMap((s) => s.refs),
    ]);
    for (const src of sources) {
      expect(referencedIds.has(src.id), `source "${src.id}" is never referenced`).toBe(true);
    }
  });

  it("sourceById handles exact, case-insensitive, prefix patterns, and invalid lookups", () => {
    expect(sourceById("oaiAug")).toBe(S.oaiAug);
    expect(sourceById("OAIAUG")).toBe(S.oaiAug);
    expect(sourceById("  oaiAug  ")).toBe(S.oaiAug);
    expect(sourceById("src-oaiAug")).toBe(S.oaiAug);
    expect(sourceById("src_oaiAug")).toBe(S.oaiAug);
    expect(sourceById("source-oaiAug")).toBe(S.oaiAug);
    expect(sourceById("source_oaiAug")).toBe(S.oaiAug);
    expect(sourceById("ref-oaiAug")).toBe(S.oaiAug);
    expect(sourceById("ref_oaiAug")).toBe(S.oaiAug);
    expect(sourceById("reference-oaiAug")).toBe(S.oaiAug);
    expect(sourceById("reference_oaiAug")).toBe(S.oaiAug);
    expect(sourceById("src%2DoaiAug")).toBe(S.oaiAug);
    expect(sourceById("SRC-OAIAUG")).toBe(S.oaiAug);
    expect(sourceById("oaiAug.json")).toBe(S.oaiAug);
    expect(sourceById("oaiAug.html")).toBe(S.oaiAug);
    expect(sourceById("/oaiAug/")).toBe(S.oaiAug);
    expect(sourceById("//src-oaiAug//")).toBe(S.oaiAug);
    expect(sourceById("1")).toBe(sources[0]);
    expect(sourceById("01")).toBe(sources[0]);
    expect(sourceById("18")).toBe(sources[17]);
    expect(sourceById("018")).toBe(sources[17]);
    expect(sourceById("19")).toBeUndefined();
    expect(sourceById("0")).toBeUndefined();
    expect(sourceById("s-1")).toBe(sources[0]);
    expect(sourceById("s_1")).toBe(sources[0]);
    expect(sourceById("s1")).toBe(sources[0]);
    expect(sourceById("source1")).toBe(sources[0]);
    expect(sourceById("source01")).toBe(sources[0]);
    expect(sourceById("source-1")).toBe(sources[0]);
    expect(sourceById("src1")).toBe(sources[0]);
    expect(sourceById("src01")).toBe(sources[0]);
    expect(sourceById("src-1")).toBe(sources[0]);
    expect(sourceById("ref1")).toBe(sources[0]);
    expect(sourceById("ref01")).toBe(sources[0]);
    expect(sourceById("ref-1")).toBe(sources[0]);
    expect(sourceById("ref_1")).toBe(sources[0]);
    expect(sourceById("reference1")).toBe(sources[0]);
    expect(sourceById("reference-1")).toBe(sources[0]);
    expect(sourceById("+1")).toBe(sources[0]);
    expect(sourceById("+01")).toBe(sources[0]);
    expect(sourceById("")).toBeUndefined();
    expect(sourceById("   ")).toBeUndefined();
    expect(sourceById(undefined as unknown as string)).toBeUndefined();
    expect(sourceById(null as unknown as string)).toBeUndefined();
    expect(sourceById(123 as unknown as string)).toBeUndefined();
    expect(sourceById(true as unknown as string)).toBeUndefined();
    expect(sourceById("unknown")).toBeUndefined();
    expect(sourceById("toString")).toBeUndefined();
    expect(sourceById("__proto__")).toBeUndefined();
  });
});


describe("posts", () => {
  it("have unique slugs that are URL-safe", () => {
    const slugs = posts.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it("reference only sources and tiers that exist", () => {
    for (const p of posts) {
      expect(p.sources.length).toBeGreaterThan(0);
      for (const id of p.sources) expect(S[id], `${p.slug} -> ${id}`).toBeDefined();
      expect(tierById(p.tier), `${p.slug} tier`).toBeDefined();
      expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(p.date))).toBe(false);
      expect(p.readMins).toBeGreaterThan(0);
    }
  });

  it("have unique list items and source refs (used as React keys)", () => {
    for (const p of posts) {
      expect(new Set(p.sources).size, `${p.slug} sources`).toBe(p.sources.length);
      for (const b of p.body) {
        if (b.t === "ul" || b.t === "ol") expect(new Set(b.x).size, p.slug).toBe(b.x.length);
      }
    }
  });

  it("postBySlug does not match inherited object properties and handles slashes", () => {
    expect(postBySlug("toString")).toBeUndefined();
    expect(postBySlug(posts[0].slug)).toBe(posts[0]);
    expect(postBySlug(`  ${posts[0].slug}  `)).toBe(posts[0]);
    expect(postBySlug(`/${posts[0].slug}`)).toBe(posts[0]);
    expect(postBySlug(`/${posts[0].slug}/`)).toBe(posts[0]);
    expect(postBySlug(`${posts[0].slug}.json`)).toBe(posts[0]);
    expect(postBySlug(`${posts[0].slug}.html`)).toBe(posts[0]);
    expect(postBySlug(encodeURIComponent(posts[0].slug))).toBe(posts[0]);
    expect(postBySlug("post-" + posts[0].slug)).toBe(posts[0]);
    expect(postBySlug("blog-" + posts[0].slug)).toBe(posts[0]);
    expect(postBySlug("p-" + posts[0].slug)).toBe(posts[0]);
    expect(postBySlug("article-" + posts[0].slug)).toBe(posts[0]);
    expect(postBySlug("art-" + posts[0].slug)).toBe(posts[0]);
    expect(postBySlug("1")).toBe(posts[0]);
    expect(postBySlug("01")).toBe(posts[0]);
    expect(postBySlug("+1")).toBe(posts[0]);
    expect(postBySlug("1.json")).toBe(posts[0]);
    expect(postBySlug("01.json")).toBe(posts[0]);
    expect(postBySlug("1.html")).toBe(posts[0]);
    expect(postBySlug("p-1.json")).toBe(posts[0]);
    expect(postBySlug("post-1.json")).toBe(posts[0]);
    expect(postBySlug("blog-1.json")).toBe(posts[0]);
    expect(postBySlug("4")).toBe(posts[3]);
    expect(postBySlug("04")).toBe(posts[3]);
    expect(postBySlug("+4")).toBe(posts[3]);
    expect(postBySlug("p-1")).toBe(posts[0]);
    expect(postBySlug("p_1")).toBe(posts[0]);
    expect(postBySlug("p1")).toBe(posts[0]);
    expect(postBySlug("p01")).toBe(posts[0]);
    expect(postBySlug("post-1")).toBe(posts[0]);
    expect(postBySlug("post_1")).toBe(posts[0]);
    expect(postBySlug("post1")).toBe(posts[0]);
    expect(postBySlug("blog-1")).toBe(posts[0]);
    expect(postBySlug("blog_1")).toBe(posts[0]);
    expect(postBySlug("blog1")).toBe(posts[0]);
    expect(postBySlug("article-1")).toBe(posts[0]);
    expect(postBySlug("article_1")).toBe(posts[0]);
    expect(postBySlug("article1")).toBe(posts[0]);
    expect(postBySlug("art-1")).toBe(posts[0]);
    expect(postBySlug("art_1")).toBe(posts[0]);
    expect(postBySlug("art1")).toBe(posts[0]);
    expect(postBySlug("+p-1")).toBe(posts[0]);
    expect(postBySlug("0")).toBeUndefined();
    expect(postBySlug("5")).toBeUndefined();
    expect(postBySlug("99")).toBeUndefined();
    expect(postBySlug("")).toBeUndefined();
    expect(postBySlug("   ")).toBeUndefined();
    expect(postBySlug(undefined as unknown as string)).toBeUndefined();
    expect(postBySlug(null as unknown as string)).toBeUndefined();
    expect(postBySlug(123 as unknown as string)).toBeUndefined();
    expect(postBySlug(true as unknown as string)).toBeUndefined();
  });

  it("calculates positive word counts and validates block text", () => {
    for (const p of posts) {
      expect(postWords(p)).toBeGreaterThan(100);
      for (const b of p.body) {
        if (b.t === "ul" || b.t === "ol") {
          expect(b.x.length).toBeGreaterThan(0);
        } else {
          expect(b.x.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("postWords ignores extra whitespace and empty strings accurately", () => {
    const dummyPost = {
      slug: "dummy",
      title: "Dummy",
      description: "Dummy desc",
      date: "2026-10-09",
      readMins: 1,
      tier: "seraphim" as const,
      ctaLead: "Lead",
      sources: [],
      body: [
        { t: "p" as const, x: "   hello   world   " },
        { t: "ul" as const, x: ["one two", "   ", "three"] },
        { t: "quote" as const, x: "" },
      ],
    };
    expect(postWords(dummyPost)).toBe(5);
  });

  it("postWords safely handles empty, malformed, or nullish posts", () => {
    expect(postWords(undefined as unknown as (typeof posts)[0])).toBe(0);
    expect(postWords(null as unknown as (typeof posts)[0])).toBe(0);
    expect(postWords({ body: [] } as unknown as (typeof posts)[0])).toBe(0);
    expect(postWords({ body: [null, undefined] } as unknown as (typeof posts)[0])).toBe(0);
  });
});

describe("tiers", () => {
  it("have unique ids, contiguous ranks, and unique included/notIncluded items", () => {
    expect(new Set(tiers.map((t) => t.id)).size).toBe(tiers.length);
    expect(tiers.map((t) => t.rank).sort()).toEqual(tiers.map((_, i) => i + 1));
    for (const t of tiers) {
      expect(new Set(t.included).size, `${t.id} included`).toBe(t.included.length);
      expect(new Set(t.notIncluded).size, `${t.id} notIncluded`).toBe(t.notIncluded.length);
    }
    expect(new Set(matrix.map((r) => r.row)).size).toBe(matrix.length);
    for (const h of helper) {
      expect(new Set(h.a.map((o) => o.label)).size).toBe(h.a.length);
    }
  });

  it("tierById handles case-insensitivity, rank numbers, prefixes, and returns undefined for unknown", () => {
    expect(tierById("SERAPHIM")).toBeDefined();
    expect(tierById("  seraphim  ")).toBeDefined();
    expect(tierById("tier-seraphim")).toBe(tiers[0]);
    expect(tierById("tier_seraphim")).toBe(tiers[0]);
    expect(tierById("tier-1")).toBe(tiers[0]);
    expect(tierById("tier_1")).toBe(tiers[0]);
    expect(tierById("tier1")).toBe(tiers[0]);
    expect(tierById("t1")).toBe(tiers[0]);
    expect(tierById("T1")).toBe(tiers[0]);
    expect(tierById("+1")).toBe(tiers[0]);
    expect(tierById("1")).toBe(tiers[0]);
    expect(tierById(" 1 ")).toBe(tiers[0]);
    expect(tierById("4")).toBe(tiers[3]);
    expect(tierById("t4")).toBe(tiers[3]);
    expect(tierById("tier%2Dseraphim")).toBe(tiers[0]);
    expect(tierById("seraphim.json")).toBe(tiers[0]);
    expect(tierById("seraphim.html")).toBe(tiers[0]);
    expect(tierById("unknown")).toBeUndefined();
    expect(tierById("99")).toBeUndefined();
    expect(tierById("0")).toBeUndefined();
    expect(tierById("toString")).toBeUndefined();
    expect(tierById("")).toBeUndefined();
    expect(tierById("   ")).toBeUndefined();
    expect(tierById(undefined as unknown as string)).toBeUndefined();
    expect(tierById(null as unknown as string)).toBeUndefined();
    expect(tierById(123 as unknown as string)).toBeUndefined();
    expect(tierById(true as unknown as string)).toBeUndefined();
  });

  it("tierById normalizes leading-zero ranks (01..04), t- and t_ prefixes, and surrounding slashes", () => {
    expect(tierById("01")).toBe(tiers[0]);
    expect(tierById("02")).toBe(tiers[1]);
    expect(tierById("03")).toBe(tiers[2]);
    expect(tierById("04")).toBe(tiers[3]);
    expect(tierById("t-1")).toBe(tiers[0]);
    expect(tierById("t-2")).toBe(tiers[1]);
    expect(tierById("t_1")).toBe(tiers[0]);
    expect(tierById("t_2")).toBe(tiers[1]);
    expect(tierById("t01")).toBe(tiers[0]);
    expect(tierById("t02")).toBe(tiers[1]);
    expect(tierById("tier-01")).toBe(tiers[0]);
    expect(tierById("tier_01")).toBe(tiers[0]);
    expect(tierById("/seraphim/")).toBe(tiers[0]);
    expect(tierById("//t-1//")).toBe(tiers[0]);
    expect(tierById("/01/")).toBe(tiers[0]);
    expect(tierById("rank-1")).toBe(tiers[0]);
    expect(tierById("rank_1")).toBe(tiers[0]);
    expect(tierById("rank1")).toBe(tiers[0]);
    expect(tierById("rank01")).toBe(tiers[0]);
    expect(tierById("r-1")).toBe(tiers[0]);
    expect(tierById("r_1")).toBe(tiers[0]);
    expect(tierById("r1")).toBe(tiers[0]);
    expect(tierById("r01")).toBe(tiers[0]);
  });

  it("matrix and helper cover all tiers correctly", () => {
    expect(matrix.length).toBe(8);
    for (const row of matrix) {
      for (const t of tiers) {
        expect(row.values[t.id]).toBeDefined();
      }
    }
    for (const q of helper) {
      expect(q.a.length).toBe(4);
      for (const a of q.a) {
        expect(tierById(a.tier)).toBeDefined();
        expect(tierHref(a.tier)).toBe(`/pricing#${a.tier}`);
      }
    }
    expect(tierHref("  SERAPHIM  " as unknown as (typeof tiers)[0]["id"])).toBe("/pricing#seraphim");
    expect(tierHref("1")).toBe("/pricing#seraphim");
    expect(tierHref("01")).toBe("/pricing#seraphim");
    expect(tierHref("t-1")).toBe("/pricing#seraphim");
    expect(tierHref("tier-1")).toBe("/pricing#seraphim");
    expect(tierHref("tier_02")).toBe("/pricing#cherubim");
    expect(tierHref(null as unknown as (typeof tiers)[0]["id"])).toBe("/pricing#");
  });
});


describe("incidents", () => {
  it("have unique ids, contiguous numbering, non-empty sections, and cite only registered sources", () => {
    expect(new Set(incidents.map((i) => i.id)).size).toBe(incidents.length);
    expect(incidents.map((i) => i.n)).toEqual(
      incidents.map((_, idx) => String(idx + 1).padStart(2, "0"))
    );
    for (const inc of incidents) {
      expect(inc.sources.length, inc.id).toBeGreaterThan(0);
      expect(new Set(inc.sources).size, `${inc.id} unique sources`).toBe(inc.sources.length);
      for (const id of inc.sources) expect(S[id], `${inc.id} -> ${id}`).toBeDefined();
      expect(inc.timeline.length, `${inc.id} timeline`).toBeGreaterThan(0);
      const tlKeys = inc.timeline.map((t) => `${t.d}-${t.t}`);
      expect(new Set(tlKeys).size, `${inc.id} timeline keys`).toBe(tlKeys.length);
      expect(inc.did.length, `${inc.id} did`).toBeGreaterThan(0);
      expect(new Set(inc.did).size, `${inc.id} unique did`).toBe(inc.did.length);
      expect(inc.howIn.length, `${inc.id} howIn`).toBeGreaterThan(0);
      expect(new Set(inc.howIn).size, `${inc.id} unique howIn`).toBe(inc.howIn.length);
      expect(inc.vuln.length, `${inc.id} vuln`).toBeGreaterThan(0);
      expect(new Set(inc.vuln).size, `${inc.id} unique vuln`).toBe(inc.vuln.length);
      expect(inc.impact.length, `${inc.id} impact`).toBeGreaterThan(0);
      expect(new Set(inc.impact).size, `${inc.id} unique impact`).toBe(inc.impact.length);
      expect(inc.inferred.length, `${inc.id} inferred`).toBeGreaterThan(0);
      expect(new Set(inc.inferred).size, `${inc.id} unique inferred`).toBe(inc.inferred.length);
      expect(inc.seraphim.flag.length, `${inc.id} seraphim.flag`).toBeGreaterThan(0);
      expect(new Set(inc.seraphim.flag).size, `${inc.id} unique seraphim.flag`).toBe(inc.seraphim.flag.length);
      expect(inc.seraphim.prepare.length, `${inc.id} seraphim.prepare`).toBeGreaterThan(0);
      expect(new Set(inc.seraphim.prepare).size, `${inc.id} unique seraphim.prepare`).toBe(inc.seraphim.prepare.length);
      expect(inc.seraphim.limits.length, `${inc.id} seraphim.limits`).toBeGreaterThan(0);
    }
    expect(unverified.length).toBeGreaterThan(0);
    expect(new Set(unverified).size).toBe(unverified.length);
    for (const note of unverified) {
      expect(note.trim().length).toBeGreaterThan(0);
    }
  });

  it("incidentById handles case-insensitivity, incident numbering, prefixes, and returns undefined for unknown", () => {
    const first = incidents[0];
    expect(incidentById(first.id.toUpperCase())).toBe(first);
    expect(incidentById(`  ${first.id}  `)).toBe(first);
    expect(incidentById("01")).toBe(first);
    expect(incidentById("1")).toBe(first);
    expect(incidentById(" 01 ")).toBe(first);
    expect(incidentById("incident-01")).toBe(first);
    expect(incidentById("incident_01")).toBe(first);
    expect(incidentById("case-01")).toBe(first);
    expect(incidentById("case_01")).toBe(first);
    expect(incidentById("inc-01")).toBe(first);
    expect(incidentById("inc_01")).toBe(first);
    expect(incidentById("case-1")).toBe(first);
    expect(incidentById("case_1")).toBe(first);
    expect(incidentById("inc-1")).toBe(first);
    expect(incidentById("inc_1")).toBe(first);
    expect(incidentById("001")).toBe(first);
    expect(incidentById(encodeURIComponent(first.id))).toBe(first);
    expect(incidentById(`${first.id}.json`)).toBe(first);
    expect(incidentById(`${first.id}.html`)).toBe(first);
    expect(incidentById("99")).toBeUndefined();
    expect(incidentById("unknown-incident")).toBeUndefined();
    expect(incidentById("constructor")).toBeUndefined();
    expect(incidentById("")).toBeUndefined();
    expect(incidentById("   ")).toBeUndefined();
    expect(incidentById(undefined as unknown as string)).toBeUndefined();
    expect(incidentById(null as unknown as string)).toBeUndefined();
    expect(incidentById(123 as unknown as string)).toBeUndefined();
    expect(incidentById(true as unknown as string)).toBeUndefined();
  });

  it("incidentById normalizes i- and inc prefixes, single-digit incident numbers, and surrounding slashes", () => {
    const first = incidents[0];
    expect(incidentById("i-01")).toBe(first);
    expect(incidentById("i-1")).toBe(first);
    expect(incidentById("i_01")).toBe(first);
    expect(incidentById("i_1")).toBe(first);
    expect(incidentById("inc01")).toBe(first);
    expect(incidentById("i1")).toBe(first);
    expect(incidentById("incident1")).toBe(first);
    expect(incidentById("incident01")).toBe(first);
    expect(incidentById("case1")).toBe(first);
    expect(incidentById("case01")).toBe(first);
    expect(incidentById("/01/")).toBe(first);
    expect(incidentById("/openai-huggingface-2026/")).toBe(first);
    expect(incidentById("//i-1//")).toBe(first);
    expect(incidentById("+1")).toBe(first);
    expect(incidentById("+01")).toBe(first);
  });

  it("scenarios have unique ids, contiguous H-numbering, non-empty sections, and cite only registered sources", () => {
    expect(new Set(scenarios.map((s) => s.id)).size).toBe(scenarios.length);
    expect(scenarios.map((s) => s.n)).toEqual(scenarios.map((_, idx) => `H${idx + 1}`));
    for (const sc of scenarios) {
      expect(sc.refs.length, `${sc.id} refs`).toBeGreaterThan(0);
      expect(new Set(sc.refs).size, `${sc.id} unique refs`).toBe(sc.refs.length);
      for (const id of sc.refs) expect(S[id], `${sc.id} -> ${id}`).toBeDefined();
      expect(sc.weaknessClass.length, `${sc.id} weaknessClass`).toBeGreaterThan(0);
      expect(new Set(sc.weaknessClass).size, `${sc.id} unique weaknessClass`).toBe(sc.weaknessClass.length);
      expect(sc.controls.length, `${sc.id} controls`).toBeGreaterThan(0);
      expect(new Set(sc.controls).size, `${sc.id} unique controls`).toBe(sc.controls.length);
      expect(sc.seraphim.length, `${sc.id} seraphim`).toBeGreaterThan(0);
      expect(new Set(sc.seraphim).size, `${sc.id} unique seraphim`).toBe(sc.seraphim.length);
      expect(sc.target.trim().length, `${sc.id} target`).toBeGreaterThan(0);
      expect(sc.approach.trim().length, `${sc.id} approach`).toBeGreaterThan(0);
      expect(sc.speed.trim().length, `${sc.id} speed`).toBeGreaterThan(0);
    }
  });

  it("scenarioById handles exact, case-insensitive, scenario numbering, prefixes, and invalid lookups", () => {
    const first = scenarios[0];
    expect(scenarioById(first.id)).toBe(first);
    expect(scenarioById(first.id.toUpperCase())).toBe(first);
    expect(scenarioById(`  ${first.id}  `)).toBe(first);
    expect(scenarioById("h1")).toBe(first);
    expect(scenarioById("H1")).toBe(first);
    expect(scenarioById("1")).toBe(first);
    expect(scenarioById(" h1 ")).toBe(first);
    expect(scenarioById("scenario-h1")).toBe(first);
    expect(scenarioById("scenario_h1")).toBe(first);
    expect(scenarioById("sc-1")).toBe(first);
    expect(scenarioById("sc_1")).toBe(first);
    expect(scenarioById("sc1")).toBe(first);
    expect(scenarioById("sc01")).toBe(first);
    expect(scenarioById("h-1")).toBe(first);
    expect(scenarioById("h_1")).toBe(first);
    expect(scenarioById("h01")).toBe(first);
    expect(scenarioById("SC-H1")).toBe(first);
    expect(scenarioById(encodeURIComponent(first.id))).toBe(first);
    expect(scenarioById(`${first.id}.json`)).toBe(first);
    expect(scenarioById(`${first.id}.html`)).toBe(first);
    expect(scenarioById("h99")).toBeUndefined();
    expect(scenarioById("unknown-scenario")).toBeUndefined();
    expect(scenarioById("constructor")).toBeUndefined();
    expect(scenarioById("")).toBeUndefined();
    expect(scenarioById("   ")).toBeUndefined();
    expect(scenarioById(undefined as unknown as string)).toBeUndefined();
    expect(scenarioById(null as unknown as string)).toBeUndefined();
    expect(scenarioById(123 as unknown as string)).toBeUndefined();
    expect(scenarioById(true as unknown as string)).toBeUndefined();
  });

  it("scenarioById normalizes single-digit scenario prefixes and surrounding slashes", () => {
    const first = scenarios[0];
    expect(scenarioById("scenario_1")).toBe(first);
    expect(scenarioById("scenario-1")).toBe(first);
    expect(scenarioById("scenario1")).toBe(first);
    expect(scenarioById("scenario01")).toBe(first);
    expect(scenarioById("scenarioh1")).toBe(first);
    expect(scenarioById("sc_1")).toBe(first);
    expect(scenarioById("sc-1")).toBe(first);
    expect(scenarioById("h_1")).toBe(first);
    expect(scenarioById("h-1")).toBe(first);
    expect(scenarioById("/legacy-internal-app/")).toBe(first);
    expect(scenarioById("/h1/")).toBe(first);
    expect(scenarioById("//h-1//")).toBe(first);
    expect(scenarioById("+1")).toBe(first);
    expect(scenarioById("+01")).toBe(first);
    expect(scenarioById("+h1")).toBe(first);
    expect(scenarioById("+h01")).toBe(first);
  });
});

describe("case studies / findings", () => {
  it("have unique IDs and recognized severity levels", () => {
    expect(new Set(findings.map((f) => f.id)).size).toBe(findings.length);
    const validSeverities = new Set(["Critical", "High", "Medium", "Low", "Info"]);
    for (const f of findings) {
      expect(validSeverities.has(f.severity), `${f.id} severity ${f.severity}`).toBe(true);
      expect(f.title.length).toBeGreaterThan(0);
      expect(f.fix.length).toBeGreaterThan(0);
    }
  });

  it("findingById handles case-insensitivity, fix- prefix, hyphenless form, single-digit and extension forms, and returns undefined for unknown", () => {
    expect(findingById("F-01")).toBeDefined();
    expect(findingById("f-01")?.id).toBe("F-01");
    expect(findingById("  f-01  ")?.id).toBe("F-01");
    expect(findingById("f01")?.id).toBe("F-01");
    expect(findingById("f-1")?.id).toBe("F-01");
    expect(findingById("f1")?.id).toBe("F-01");
    expect(findingById("fix-f-01")?.id).toBe("F-01");
    expect(findingById("fix-f-1")?.id).toBe("F-01");
    expect(findingById("fix-01")?.id).toBe("F-01");
    expect(findingById("fix_01")?.id).toBe("F-01");
    expect(findingById("fix-1")?.id).toBe("F-01");
    expect(findingById("fix_1")?.id).toBe("F-01");
    expect(findingById("finding-01")?.id).toBe("F-01");
    expect(findingById("finding_01")?.id).toBe("F-01");
    expect(findingById("finding-1")?.id).toBe("F-01");
    expect(findingById("1")?.id).toBe("F-01");
    expect(findingById("01")?.id).toBe("F-01");
    expect(findingById("001")?.id).toBe("F-01");
    expect(findingById("f-01.json")?.id).toBe("F-01");
    expect(findingById("f-01.html")?.id).toBe("F-01");
    expect(findingById("f%2D01")?.id).toBe("F-01");
    expect(findingById("FIX-F01")?.id).toBe("F-01");
    expect(findingById("F-99")).toBeUndefined();
    expect(findingById("toString")).toBeUndefined();
    expect(findingById("")).toBeUndefined();
    expect(findingById("   ")).toBeUndefined();
    expect(findingById(undefined as unknown as string)).toBeUndefined();
    expect(findingById(null as unknown as string)).toBeUndefined();
    expect(findingById(123 as unknown as string)).toBeUndefined();
    expect(findingById(true as unknown as string)).toBeUndefined();
  });

  it("findingById and remediationById normalize cs- and case-study- prefixes and surrounding slashes", () => {
    expect(findingById("cs-01")?.id).toBe("F-01");
    expect(findingById("cs-1")?.id).toBe("F-01");
    expect(findingById("cs_01")?.id).toBe("F-01");
    expect(findingById("cs_1")?.id).toBe("F-01");
    expect(findingById("cs1")?.id).toBe("F-01");
    expect(findingById("cs01")?.id).toBe("F-01");
    expect(findingById("finding1")?.id).toBe("F-01");
    expect(findingById("finding01")?.id).toBe("F-01");
    expect(findingById("case-study-01")?.id).toBe("F-01");
    expect(findingById("case_study_01")?.id).toBe("F-01");
    expect(findingById("/f-01/")?.id).toBe("F-01");
    expect(findingById("//cs-1//")?.id).toBe("F-01");
    expect(findingById("+1")?.id).toBe("F-01");
    expect(findingById("+01")?.id).toBe("F-01");
    expect(findingById("+f1")?.id).toBe("F-01");
    expect(findingById("casestudy1")?.id).toBe("F-01");
    expect(findingById("fix1")?.id).toBe("F-01");
    expect(remediationById("+1")?.id).toBe("F-01");
    expect(remediationById("+01")?.id).toBe("F-01");
    expect(remediationById("+f1")?.id).toBe("F-01");
    expect(remediationById("casestudy1")?.id).toBe("F-01");
    expect(remediationById("fix1")?.id).toBe("F-01");

    expect(remediationById("cs-01")?.id).toBe("F-01");
    expect(remediationById("cs-1")?.id).toBe("F-01");
    expect(remediationById("cs_01")?.id).toBe("F-01");
    expect(remediationById("cs_1")?.id).toBe("F-01");
    expect(remediationById("cs1")?.id).toBe("F-01");
    expect(remediationById("cs01")?.id).toBe("F-01");
    expect(remediationById("finding1")?.id).toBe("F-01");
    expect(remediationById("finding01")?.id).toBe("F-01");
    expect(remediationById("case-study-01")?.id).toBe("F-01");
    expect(remediationById("case_study_01")?.id).toBe("F-01");
    expect(remediationById("/f-01/")?.id).toBe("F-01");
    expect(remediationById("//cs-1//")?.id).toBe("F-01");
  });

  it("remediationById handles case-insensitivity, hyphenless form, single-digit and extension forms, and returns undefined for unknown", () => {
    expect(remediationById("F-01")).toBeDefined();
    expect(remediationById("f-01")?.id).toBe("F-01");
    expect(remediationById("  f-01  ")?.id).toBe("F-01");
    expect(remediationById("f01")?.id).toBe("F-01");
    expect(remediationById("f-1")?.id).toBe("F-01");
    expect(remediationById("f1")?.id).toBe("F-01");
    expect(remediationById("fix-f-01")?.id).toBe("F-01");
    expect(remediationById("fix-f-1")?.id).toBe("F-01");
    expect(remediationById("fix-01")?.id).toBe("F-01");
    expect(remediationById("fix_01")?.id).toBe("F-01");
    expect(remediationById("fix-1")?.id).toBe("F-01");
    expect(remediationById("fix_1")?.id).toBe("F-01");
    expect(remediationById("finding-01")?.id).toBe("F-01");
    expect(remediationById("finding_01")?.id).toBe("F-01");
    expect(remediationById("finding-1")?.id).toBe("F-01");
    expect(remediationById("1")?.id).toBe("F-01");
    expect(remediationById("01")?.id).toBe("F-01");
    expect(remediationById("001")?.id).toBe("F-01");
    expect(remediationById("f-01.json")?.id).toBe("F-01");
    expect(remediationById("f-01.html")?.id).toBe("F-01");
    expect(remediationById("f%2D01")?.id).toBe("F-01");
    expect(remediationById("FIX-F-01")?.id).toBe("F-01");
    expect(remediationById("FIX-F01")?.id).toBe("F-01");
    expect(remediationById("F-99")).toBeUndefined();
    expect(remediationById("toString")).toBeUndefined();
    expect(remediationById("")).toBeUndefined();
    expect(remediationById("   ")).toBeUndefined();
    expect(remediationById(undefined as unknown as string)).toBeUndefined();
    expect(remediationById(null as unknown as string)).toBeUndefined();
    expect(remediationById(123 as unknown as string)).toBeUndefined();
    expect(remediationById(true as unknown as string)).toBeUndefined();
  });

  it("severityCounts matches findings tally", () => {
    const manualTally: Record<string, number> = {};
    for (const f of findings) {
      manualTally[f.severity] = (manualTally[f.severity] ?? 0) + 1;
    }
    expect(severityCounts).toEqual(manualTally);
  });

  it("remediation entries match findings one-to-one", () => {
    expect(remediation.length).toBe(findings.length);
    for (const r of remediation) {
      const f = findingById(r.id);
      expect(f).toBeDefined();
      expect(r.title).toBe(f?.title);
      expect(r.severity).toBe(f?.severity);
      expect(r.checked.length).toBeGreaterThan(0);
    }
  });
});


describe("metadata routes", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("robots generates permissive crawling rule and sitemap reference (and honors runtime env)", () => {
    const r = robots();
    expect(r.rules).toEqual([{ userAgent: "*", allow: "/" }]);
    expect(r.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
    expect(r.sitemap).toMatch(/^https?:\/\/.*\/sitemap\.xml$/);

    vi.stubEnv("SITE_URL", "https://seraphim.ai/");
    expect(robots().sitemap).toBe("https://seraphim.ai/sitemap.xml");
  });

  it("sitemap includes all main pages, home page, and every blog post with valid metadata", () => {
    const s = sitemap();
    const urls = s.map((entry) => entry.url);
    expect(urls).toContain(SITE_URL);
    expect(urls).toContain(`${SITE_URL}/pricing`);
    expect(urls).toContain(`${SITE_URL}/incident-case-studies`);
    expect(urls).toContain(`${SITE_URL}/blog`);
    expect(urls).toContain(`${SITE_URL}/case-studies`);
    for (const post of posts) {
      expect(urls).toContain(`${SITE_URL}/blog/${post.slug}`);
    }
    const validFreqs = new Set(["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"]);
    for (const entry of s) {
      expect(entry.url).toMatch(/^https?:\/\//);
      expect(entry.priority).toBeGreaterThanOrEqual(0);
      expect(entry.priority).toBeLessThanOrEqual(1);
      expect(validFreqs.has(entry.changeFrequency ?? "")).toBe(true);
      expect(entry.lastModified).toBeInstanceOf(Date);
      expect(isNaN((entry.lastModified as Date).getTime())).toBe(false);
    }

    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://seraphim.ai/");
    expect(sitemap()[0].url).toBe("https://seraphim.ai");
  });
});



