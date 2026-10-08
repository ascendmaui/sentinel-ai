import { describe, expect, it } from "vitest";
import { BRAND_MAIL, BRAND_NAME, BRAND_SUFFIX, BRAND_WORD } from "../lib/brand";
import { findings, findingById } from "../lib/caseStudies";
import { incidents, incidentById } from "../lib/incidents";
import { posts, postBySlug } from "../lib/posts";
import { S } from "../lib/sources";
import { tierById, tiers } from "../lib/tiers";

describe("brand", () => {
  it("derives the two-tone wordmark from BRAND_NAME", () => {
    expect(`${BRAND_WORD} ${BRAND_SUFFIX}`.trim()).toBe(BRAND_NAME);
    expect(BRAND_MAIL).toBe(encodeURIComponent(BRAND_NAME));
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
  });
});


