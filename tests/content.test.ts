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
    for (const cardCls of [".tier-card", ".inc", ".scn", ".cs-finding"]) {
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

  it("sourceById handles exact, case-insensitive, and invalid lookups", () => {
    expect(sourceById("oaiAug")).toBe(S.oaiAug);
    expect(sourceById("OAIAUG")).toBe(S.oaiAug);
    expect(sourceById("  oaiAug  ")).toBe(S.oaiAug);
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

  it("have unique list items (list items are used as React keys)", () => {
    for (const p of posts) {
      for (const b of p.body) {
        if (b.t === "ul" || b.t === "ol") expect(new Set(b.x).size, p.slug).toBe(b.x.length);
      }
    }
  });

  it("postBySlug does not match inherited object properties", () => {
    expect(postBySlug("toString")).toBeUndefined();
    expect(postBySlug(posts[0].slug)).toBe(posts[0]);
    expect(postBySlug(`  ${posts[0].slug}  `)).toBe(posts[0]);
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
  it("have unique ids and contiguous ranks", () => {
    expect(new Set(tiers.map((t) => t.id)).size).toBe(tiers.length);
    expect(tiers.map((t) => t.rank).sort()).toEqual(tiers.map((_, i) => i + 1));
  });

  it("tierById handles case-insensitivity and returns undefined for unknown", () => {
    expect(tierById("SERAPHIM")).toBeDefined();
    expect(tierById("  seraphim  ")).toBeDefined();
    expect(tierById("unknown")).toBeUndefined();
    expect(tierById("toString")).toBeUndefined();
    expect(tierById("")).toBeUndefined();
    expect(tierById("   ")).toBeUndefined();
    expect(tierById(undefined as unknown as string)).toBeUndefined();
    expect(tierById(null as unknown as string)).toBeUndefined();
    expect(tierById(123 as unknown as string)).toBeUndefined();
    expect(tierById(true as unknown as string)).toBeUndefined();
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
      for (const id of inc.sources) expect(S[id], `${inc.id} -> ${id}`).toBeDefined();
      expect(inc.timeline.length, `${inc.id} timeline`).toBeGreaterThan(0);
      expect(inc.did.length, `${inc.id} did`).toBeGreaterThan(0);
      expect(inc.howIn.length, `${inc.id} howIn`).toBeGreaterThan(0);
      expect(inc.vuln.length, `${inc.id} vuln`).toBeGreaterThan(0);
      expect(inc.impact.length, `${inc.id} impact`).toBeGreaterThan(0);
      expect(inc.inferred.length, `${inc.id} inferred`).toBeGreaterThan(0);
      expect(inc.seraphim.flag.length, `${inc.id} seraphim.flag`).toBeGreaterThan(0);
      expect(inc.seraphim.prepare.length, `${inc.id} seraphim.prepare`).toBeGreaterThan(0);
      expect(inc.seraphim.limits.length, `${inc.id} seraphim.limits`).toBeGreaterThan(0);
    }
    expect(unverified.length).toBeGreaterThan(0);
    for (const note of unverified) {
      expect(note.trim().length).toBeGreaterThan(0);
    }
  });

  it("incidentById handles case-insensitivity and returns undefined for unknown", () => {
    const first = incidents[0];
    expect(incidentById(first.id.toUpperCase())).toBe(first);
    expect(incidentById(`  ${first.id}  `)).toBe(first);
    expect(incidentById("unknown-incident")).toBeUndefined();
    expect(incidentById("constructor")).toBeUndefined();
    expect(incidentById("")).toBeUndefined();
    expect(incidentById("   ")).toBeUndefined();
    expect(incidentById(undefined as unknown as string)).toBeUndefined();
    expect(incidentById(null as unknown as string)).toBeUndefined();
    expect(incidentById(123 as unknown as string)).toBeUndefined();
    expect(incidentById(true as unknown as string)).toBeUndefined();
  });

  it("scenarios have unique ids, contiguous H-numbering, non-empty sections, and cite only registered sources", () => {
    expect(new Set(scenarios.map((s) => s.id)).size).toBe(scenarios.length);
    expect(scenarios.map((s) => s.n)).toEqual(scenarios.map((_, idx) => `H${idx + 1}`));
    for (const sc of scenarios) {
      expect(sc.refs.length, `${sc.id} refs`).toBeGreaterThan(0);
      for (const id of sc.refs) expect(S[id], `${sc.id} -> ${id}`).toBeDefined();
      expect(sc.weaknessClass.length, `${sc.id} weaknessClass`).toBeGreaterThan(0);
      expect(sc.controls.length, `${sc.id} controls`).toBeGreaterThan(0);
      expect(sc.seraphim.length, `${sc.id} seraphim`).toBeGreaterThan(0);
      expect(sc.target.trim().length, `${sc.id} target`).toBeGreaterThan(0);
      expect(sc.approach.trim().length, `${sc.id} approach`).toBeGreaterThan(0);
      expect(sc.speed.trim().length, `${sc.id} speed`).toBeGreaterThan(0);
    }
  });

  it("scenarioById handles exact, case-insensitive, and invalid lookups", () => {
    const first = scenarios[0];
    expect(scenarioById(first.id)).toBe(first);
    expect(scenarioById(first.id.toUpperCase())).toBe(first);
    expect(scenarioById(`  ${first.id}  `)).toBe(first);
    expect(scenarioById("unknown-scenario")).toBeUndefined();
    expect(scenarioById("constructor")).toBeUndefined();
    expect(scenarioById("")).toBeUndefined();
    expect(scenarioById("   ")).toBeUndefined();
    expect(scenarioById(undefined as unknown as string)).toBeUndefined();
    expect(scenarioById(null as unknown as string)).toBeUndefined();
    expect(scenarioById(123 as unknown as string)).toBeUndefined();
    expect(scenarioById(true as unknown as string)).toBeUndefined();
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

  it("findingById handles case-insensitivity and returns undefined for unknown", () => {
    expect(findingById("F-01")).toBeDefined();
    expect(findingById("f-01")?.id).toBe("F-01");
    expect(findingById("  f-01  ")?.id).toBe("F-01");
    expect(findingById("F-99")).toBeUndefined();
    expect(findingById("toString")).toBeUndefined();
    expect(findingById("")).toBeUndefined();
    expect(findingById("   ")).toBeUndefined();
    expect(findingById(undefined as unknown as string)).toBeUndefined();
    expect(findingById(null as unknown as string)).toBeUndefined();
    expect(findingById(123 as unknown as string)).toBeUndefined();
    expect(findingById(true as unknown as string)).toBeUndefined();
  });

  it("remediationById handles case-insensitivity and returns undefined for unknown", () => {
    expect(remediationById("F-01")).toBeDefined();
    expect(remediationById("f-01")?.id).toBe("F-01");
    expect(remediationById("  f-01  ")?.id).toBe("F-01");
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



