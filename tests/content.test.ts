import { describe, expect, it } from "vitest";
import { badgeByKey, BRAND_EMAIL, BRAND_MAIL, BRAND_NAME, BRAND_SUFFIX, BRAND_WORD, resolveSiteUrl, SITE_URL, TRUE_BADGES } from "../lib/brand";
import { findings, findingById, remediation, remediationById, severityCounts } from "../lib/caseStudies";
import { incidents, incidentById, scenarios, scenarioById } from "../lib/incidents";
import { posts, postBySlug, postWords } from "../lib/posts";
import { S, sources, sourceById } from "../lib/sources";
import { helper, matrix, tierById, tierHref, tiers } from "../lib/tiers";
import { THEME_BOOT_SCRIPT, THEME_META, THEME_NAMES } from "../lib/theme";
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
    expect(resolveSiteUrl({ VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "seraphim.ai" })).toBe("https://seraphim.ai");
    expect(resolveSiteUrl({ VERCEL_URL: "preview-123.vercel.app" })).toBe("https://preview-123.vercel.app");
    expect(resolveSiteUrl({})).toBe("http://localhost:3000");
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
    expect(badgeByKey(undefined as unknown as string)).toBeUndefined();
  });
});

describe("theme and tokens", () => {
  it("theme names match tokens and THEME_META keys", () => {
    expect(THEME_NAMES).toEqual(["dark", "light", "high-contrast"]);
    expect(Object.keys(THEME_META).sort()).toEqual([...THEME_NAMES].sort());
    for (const name of THEME_NAMES) {
      expect(THEME_META[name]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("theme boot script is valid executable JavaScript", () => {
    expect(THEME_BOOT_SCRIPT.length).toBeGreaterThan(0);
    expect(() => new Function(THEME_BOOT_SCRIPT)).not.toThrow();
  });

  it("theme boot script evaluates cleanly in simulated DOM environments", () => {
    const fakeDoc = {
      documentElement: {
        theme: "",
        setAttribute(k: string, v: string) {
          if (k === "data-theme") this.theme = v;
        },
      },
    };
    const fakeStorage = { getItem: () => null };
    const fakeMatchMedia = (query: string) => ({
      matches: query.includes("light"),
    });

    const runScript = new Function("document", "localStorage", "window", THEME_BOOT_SCRIPT);
    runScript(fakeDoc, fakeStorage, { matchMedia: fakeMatchMedia });
    expect(fakeDoc.documentElement.theme).toBe("light");
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

  it("sources array matches S values", () => {
    expect(sources).toHaveLength(Object.keys(S).length);
    expect(new Set(sources.map((s) => s.id)).size).toBe(sources.length);
  });

  it("sourceById handles exact, case-insensitive, and invalid lookups", () => {
    expect(sourceById("oaiAug")).toBe(S.oaiAug);
    expect(sourceById("OAIAUG")).toBe(S.oaiAug);
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
    expect(postBySlug("")).toBeUndefined();
    expect(postBySlug(undefined as unknown as string)).toBeUndefined();
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
});

describe("tiers", () => {
  it("have unique ids and contiguous ranks", () => {
    expect(new Set(tiers.map((t) => t.id)).size).toBe(tiers.length);
    expect(tiers.map((t) => t.rank).sort()).toEqual(tiers.map((_, i) => i + 1));
  });

  it("tierById handles case-insensitivity and returns undefined for unknown", () => {
    expect(tierById("SERAPHIM")).toBeDefined();
    expect(tierById("unknown")).toBeUndefined();
    expect(tierById("toString")).toBeUndefined();
    expect(tierById("")).toBeUndefined();
    expect(tierById(undefined as unknown as string)).toBeUndefined();
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
  });
});


describe("incidents", () => {
  it("have unique ids and cite only registered sources", () => {
    expect(new Set(incidents.map((i) => i.id)).size).toBe(incidents.length);
    for (const inc of incidents) {
      expect(inc.sources.length, inc.id).toBeGreaterThan(0);
      for (const id of inc.sources) expect(S[id], `${inc.id} -> ${id}`).toBeDefined();
    }
  });

  it("incidentById handles case-insensitivity and returns undefined for unknown", () => {
    const first = incidents[0];
    expect(incidentById(first.id.toUpperCase())).toBe(first);
    expect(incidentById("unknown-incident")).toBeUndefined();
    expect(incidentById("constructor")).toBeUndefined();
    expect(incidentById("")).toBeUndefined();
    expect(incidentById(undefined as unknown as string)).toBeUndefined();
  });

  it("scenarios have unique ids and cite only registered sources", () => {
    expect(new Set(scenarios.map((s) => s.id)).size).toBe(scenarios.length);
    for (const sc of scenarios) {
      for (const id of sc.refs) expect(S[id], `${sc.id} -> ${id}`).toBeDefined();
    }
  });

  it("scenarioById handles exact, case-insensitive, and invalid lookups", () => {
    const first = scenarios[0];
    expect(scenarioById(first.id)).toBe(first);
    expect(scenarioById(first.id.toUpperCase())).toBe(first);
    expect(scenarioById("unknown-scenario")).toBeUndefined();
    expect(scenarioById("constructor")).toBeUndefined();
    expect(scenarioById("")).toBeUndefined();
    expect(scenarioById(undefined as unknown as string)).toBeUndefined();
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
    expect(findingById("F-99")).toBeUndefined();
    expect(findingById("toString")).toBeUndefined();
    expect(findingById("")).toBeUndefined();
    expect(findingById(undefined as unknown as string)).toBeUndefined();
  });

  it("remediationById handles case-insensitivity and returns undefined for unknown", () => {
    expect(remediationById("F-01")).toBeDefined();
    expect(remediationById("f-01")?.id).toBe("F-01");
    expect(remediationById("F-99")).toBeUndefined();
    expect(remediationById("toString")).toBeUndefined();
    expect(remediationById("")).toBeUndefined();
    expect(remediationById(undefined as unknown as string)).toBeUndefined();
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
  it("robots generates permissive crawling rule and sitemap reference", () => {
    const r = robots();
    expect(r.rules).toBeDefined();
    expect(r.sitemap).toMatch(/^https?:\/\/.*\/sitemap\.xml$/);
  });

  it("sitemap includes all main pages and every blog post", () => {
    const s = sitemap();
    const urls = s.map((entry) => entry.url);
    expect(urls).toContainEqual(expect.stringMatching(/\/pricing$/));
    expect(urls).toContainEqual(expect.stringMatching(/\/incident-case-studies$/));
    expect(urls).toContainEqual(expect.stringMatching(/\/blog$/));
    expect(urls).toContainEqual(expect.stringMatching(/\/case-studies$/));
    for (const post of posts) {
      expect(urls).toContainEqual(expect.stringContaining(`/blog/${post.slug}`));
    }
  });
});



