import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Icon, type IconName } from "../components/Icons";
import { Mark, Wordmark } from "../components/Logo";
import { TrustBadges } from "../components/TrustBadges";
import { TierStrip } from "../components/TierStrip";
import { TierEmblem } from "../components/TierEmblem";
import { TierCta } from "../components/TierCta";
import { Nav, NAV_LINKS } from "../components/Nav";
import { Footer } from "../components/Footer";
import { HeroStage } from "../components/HeroStage";
import { build as buildHeroGeometry, HeroFigure, mountHeroFigure } from "../components/HeroFigure";
import { CodeRain, GLYPHS, mountCodeRain } from "../components/CodeRain";
import {
  apply as applyTheme,
  current as currentTheme,
  mountThemeSync,
  ThemeSwitcher,
} from "../components/ThemeSwitcher";
import { THEME_KEY, type ThemeName } from "../lib/theme";
import { BRAND_EMAIL, BRAND_MAIL, BRAND_NAME, BRAND_PARENT, BRAND_SUFFIX, BRAND_WORD, TRUE_BADGES } from "../lib/brand";
import { tiers, type TierId } from "../lib/tiers";

describe("Icon component", () => {
  const iconNames: IconName[] = ["scan", "shield", "fix", "users", "list", "mail", "check", "target"];

  it.each(iconNames)("renders %s icon with standard svg attributes", (name) => {
    const el = Icon({ name });
    expect(el).not.toBeNull();
    expect(el?.type).toBe("svg");
    expect(el?.props.viewBox).toBe("0 0 24 24");
    expect(el?.props.strokeWidth).toBe(1.7);
    expect(el?.props["aria-hidden"]).toBe(true);
    expect(el?.props.children).toBeDefined();
  });

  it("normalizes case/whitespace and returns null for unknown or non-string icon name", () => {
    expect(Icon({ name: "  MAIL  " as unknown as IconName })?.type).toBe("svg");
    expect(Icon({ name: "unknown" as unknown as IconName })).toBeNull();
    expect(Icon({ name: null as unknown as IconName })).toBeNull();
  });
});

describe("Logo components (Mark & Wordmark)", () => {
  it("renders Mark with defaults and accessibility properties", () => {
    const el = Mark({ id: "test-mark" });
    expect(el.type).toBe("svg");
    expect(el.props.width).toBe(32);
    expect(el.props.height).toBe(32);
    expect(el.props.viewBox).toBe("0 0 32 32");
    expect(el.props["aria-hidden"]).toBe(true);
    expect(el.props.role).toBeUndefined();

    // With title
    const titled = Mark({ id: "titled-mark", title: "Test Logo", size: 48, className: "custom-class" });
    expect(titled.props.width).toBe(48);
    expect(titled.props.height).toBe(48);
    expect(titled.props.role).toBe("img");
    expect(titled.props["aria-label"]).toBe("Test Logo");
    expect(titled.props["aria-hidden"]).toBeUndefined();
    expect(titled.props.className).toContain("custom-class");
  });

  it("renders Wordmark with two-tone styling and hidden screen reader text", () => {
    const el = Wordmark({ id: "test-wordmark", size: 24 });
    expect(el.type).toBe("span");
    expect(el.props.className).toBe("wordmark");

    const children = el.props.children;
    expect(Array.isArray(children)).toBe(true);
    // Mark component
    expect(children[0].type).toBe(Mark);
    expect(children[0].props.size).toBe(24);

    // Wordmark text
    const textSpan = children[1];
    expect(textSpan.props.className).toBe("wordmark-text");
    expect(textSpan.props["aria-hidden"]).toBe("true");
    expect(textSpan.props.children[0]).toBe(BRAND_WORD);
    if (BRAND_SUFFIX) {
      expect(textSpan.props.children[1].props.children).toBe(BRAND_SUFFIX);
    }

    // Screen reader text
    const srSpan = children[2];
    expect(srSpan.props.className).toBe("sr-only");
    expect(srSpan.props.children).toContain(BRAND_NAME);

    const html = renderToStaticMarkup(el);
    expect(html).toContain('class="wordmark"');
    expect(html).toContain("sa-gold-test-wordmark");
    expect(html).toContain(BRAND_WORD);

    const defaultEl = Wordmark({ id: "default-wordmark" });
    expect(defaultEl.props.children[0].props.size).toBe(28);
  });

  it("omits suffix span in Wordmark when BRAND_SUFFIX is empty", async () => {
    vi.resetModules();
    vi.doMock("../lib/brand", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../lib/brand")>();
      return {
        ...actual,
        BRAND_NAME: "Seraphim",
        BRAND_WORD: "Seraphim",
        BRAND_SUFFIX: "",
      };
    });
    try {
      const { Wordmark: IsolatedWordmark } = await import("../components/Logo");
      const el = IsolatedWordmark({ id: "single-word" });
      const textSpan = el.props.children[1];
      expect(textSpan.props.children[0]).toBe("Seraphim");
      expect(textSpan.props.children[1]).toBeNull();
    } finally {
      vi.doUnmock("../lib/brand");
      vi.resetModules();
    }
  });
});

describe("TrustBadges component", () => {
  it("renders all true badges in standard mode (default and explicit)", () => {
    const el = TrustBadges({});
    expect(el.type).toBe("ul");
    expect(el.props.className).toBe("badges");
    expect(el.props["aria-label"]).toBe("How we work");

    const items = el.props.children;
    expect(items).toHaveLength(TRUE_BADGES.length);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const badge = TRUE_BADGES[i];
      expect(item.key).toBe(badge.key);
      const textSpan = item.props.children[1];
      expect(textSpan.props.children[0].props.children).toBe(badge.label);
      expect(textSpan.props.children[1].props.children).toBe(badge.note);
    }

    const html = renderToStaticMarkup(el);
    for (const badge of TRUE_BADGES) {
      expect(html).toContain(badge.label);
      expect(html).toContain(badge.note);
    }
  });

  it("renders compact mode without note text", () => {
    const el = TrustBadges({ compact: true });
    expect(el.props.className).toBe("badges badges-compact");
    const items = el.props.children;
    for (const item of items) {
      const textSpan = item.props.children[1];
      expect(textSpan.props.children[1]).toBeNull();
    }
    const html = renderToStaticMarkup(el);
    for (const badge of TRUE_BADGES) {
      expect(html).toContain(badge.label);
      expect(html).not.toContain(badge.note);
    }
  });
});

describe("TierStrip and TierEmblem components", () => {
  const tierIds: TierId[] = ["seraphim", "cherubim", "thrones", "angels"];

  it.each(tierIds)("TierEmblem renders for %s", (id) => {
    const el = TierEmblem({ id, size: 36 });
    expect(el).not.toBeNull();
    expect(el?.type).toBe("svg");
    expect(el?.props.width).toBe(36);
    expect(el?.props.height).toBe(36);
    expect(el?.props.viewBox).toBe("0 0 48 48");
    expect(el?.props["aria-hidden"]).toBe(true);
    expect(el?.props.className).toBe("tier-emblem");
  });

  it("normalizes case/whitespace and returns null for unknown or non-string tier id", () => {
    expect(TierEmblem({ id: "  SERAPHIM  " as unknown as TierId })?.type).toBe("svg");
    expect(TierEmblem({ id: "unknown" as unknown as TierId })).toBeNull();
    expect(TierEmblem({ id: null as unknown as TierId })).toBeNull();
  });

  it("TierStrip renders links and emblems for all tiers", () => {
    const el = TierStrip();
    expect(el.type).toBe("div");
    expect(el.props.className).toBe("tier-strip");
    const links = el.props.children;
    expect(links).toHaveLength(tiers.length);

    // Seraphim is flagship
    expect(links[0].props.className).toBe("tier-strip-top");
    expect(links[0].props.href).toBe("/pricing#seraphim");

    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      const tier = tiers[i];
      expect(link.props.href).toBe(`/pricing#${tier.id}`);
    }

    const html = renderToStaticMarkup(el);
    for (const tier of tiers) {
      expect(html).toContain(`href="/pricing#${tier.id}"`);
      expect(html).toContain(tier.name);
      expect(html).toContain(tier.positioning);
    }
  });
});

describe("TierCta component", () => {
  it("renders CTA for a valid tier", () => {
    const el = TierCta({ tier: "seraphim", lead: "Custom scoped engagement." });
    expect(el).not.toBeNull();
    expect(el?.type).toBe("aside");
    expect(el?.props["aria-label"]).toBe("Seraphim tier");

    const text = el?.props.children[0];
    expect(text.props.children[0].props.children).toEqual(["Seraphim", ". "]);
    expect(text.props.children[1]).toBe("Custom scoped engagement.");

    const row = el?.props.children[1];
    const emailLink = row.props.children[2];
    expect(emailLink.props.href).toBe(`mailto:${BRAND_EMAIL}?subject=${BRAND_MAIL}%20Seraphim%20inquiry`);

    const html = renderToStaticMarkup(el!);
    expect(html).toContain('aria-label="Seraphim tier"');
    expect(html).toContain('href="/pricing#seraphim"');
    expect(html).toContain('href="/pricing#compare"');

    const upperEl = TierCta({ tier: "  SERAPHIM  " as unknown as TierId, lead: "Normalized." });
    expect(renderToStaticMarkup(upperEl!)).toContain('href="/pricing#seraphim"');
  });

  it("returns null for an invalid tier", () => {
    const el = TierCta({ tier: "invalid" as unknown as TierId, lead: "Test" });
    expect(el).toBeNull();
  });
});

describe("Nav component", () => {
  it("renders navigation brand, links, action button, and mobile menu", () => {
    const el = Nav();
    expect(el.type).toBe("header");
    expect(el.props.className).toBe("nav-wrap");

    const nav = el.props.children;
    expect(nav.props["aria-label"]).toBe("Main");

    const [brandLink, navLinksDiv, actionsDiv] = nav.props.children;
    expect(brandLink.props.href).toBe("/");
    expect(brandLink.props["aria-label"]).toBe(`${BRAND_NAME} home`);

    // Main links
    const linkItems = navLinksDiv.props.children;
    const hrefs = linkItems.map((l: { props: { href: string } }) => l.props.href);
    expect(hrefs).toContain("/pricing");
    expect(hrefs).toContain("/incident-case-studies");
    expect(hrefs).toContain("/blog");
    expect(hrefs).toContain("/case-studies");

    // Talk to us button
    const emailBtn = actionsDiv.props.children[1];
    expect(emailBtn.props.href).toBe(`mailto:${BRAND_EMAIL}?subject=${BRAND_MAIL}`);

    // Mobile menu details
    const details = actionsDiv.props.children[2];
    expect(details.type).toBe("details");
    expect(details.props.className).toBe("nav-menu");
    const summaryEl = details.props.children[0];
    expect(summaryEl.props["aria-label"]).toBe("Open menu");
    for (const span of summaryEl.props.children) {
      expect(span.props["aria-hidden"]).toBe("true");
    }

    const html = renderToStaticMarkup(el);
    expect(html).toContain('class="nav-wrap"');
    expect(html).toContain('class="nav-menu"');
    expect(html).toContain('<summary aria-label="Open menu"><span aria-hidden="true"></span><span aria-hidden="true"></span></summary>');
    expect(html).toContain('href="/#phases"');
    expect(html).toContain('href="/#contact"');
    expect(html).toContain(`mailto:${BRAND_EMAIL}`);
  });
});

describe("Footer component", () => {
  it("renders footer brand, navigation links, email contact, and copyright", () => {
    const el = Footer();
    expect(el.type).toBe("footer");
    expect(el.props.className).toBe("footer");

    const bottom = el.props.children;
    const [brandLink, nav, , copyright] = bottom.props.children;

    expect(brandLink.props.href).toBe("/");
    expect(brandLink.props["aria-label"]).toBe(`${BRAND_NAME} home`);

    const links = nav.props.children;
    const hrefs = links.map((l: { props: { href: string } }) => l.props.href);
    expect(hrefs).toContain("/pricing");
    expect(hrefs).toContain("/incident-case-studies");
    expect(hrefs).toContain("/blog");
    expect(hrefs).toContain("/case-studies");
    expect(hrefs).toContain(`mailto:${BRAND_EMAIL}`);
    // Footer internal navigation links stay 1-to-1 with NAV_LINKS
    expect(
      links.slice(0, -1).map((l: { props: { href: string; children: string } }) => ({
        href: l.props.href,
        label: l.props.children,
      }))
    ).toEqual(NAV_LINKS);

    expect(copyright.props.children).toContain(BRAND_NAME);
    expect(copyright.props.children).toContain(BRAND_PARENT);

    const html = renderToStaticMarkup(el);
    expect(html).toContain('class="footer"');
    expect(html).toContain('class="footer-theme"');
    expect(html).toContain('href="/#phases"');
    expect(html).toContain(BRAND_NAME);
    expect(html).toContain(BRAND_PARENT);
  });
});

describe("HeroStage component", () => {
  it("renders hero stage container, rings, mark, and figure", () => {
    const el = HeroStage();
    expect(el.type).toBe("div");
    expect(el.props.className).toBe("hero-stage");
    expect(el.props["data-hero-stage"]).toBe(true);

    const [rings, mark, figure] = el.props.children;
    expect(rings.props.className).toBe("hero-rings");
    expect(rings.props["aria-hidden"]).toBe("true");

    expect(mark.type).toBe(Mark);
    expect(mark.props.size).toBe(220);
    expect(mark.props.id).toBe("hero");
    expect(mark.props.title).toBe(`${BRAND_NAME} seraphim mark`);

    expect(figure.type).toBe(HeroFigure);
  });
});

describe("HeroFigure component", () => {
  it("renders hero canvas with accessibility and styling attributes", () => {
    const html = renderToStaticMarkup(React.createElement(HeroFigure));
    expect(html).toContain('class="hero-canvas"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toMatch(/^<canvas[^>]*><\/canvas>$/);
  });

  it("builds valid 3D seraphim geometry across desktop and mobile densities", () => {
    const desktop = buildHeroGeometry(1);
    const mobile = buildHeroGeometry(0.6);

    expect(desktop.pts.length).toBeGreaterThan(mobile.pts.length);
    expect(desktop.lines.length).toBeGreaterThan(mobile.lines.length);
    expect(desktop.moteStart).toBeGreaterThan(0);
    expect(desktop.moteStart).toBeLessThan(desktop.pts.length);

    const layers = new Set<number>();
    const sides = new Set<number>();
    for (const p of desktop.pts) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
      expect(Number.isFinite(p.z)).toBe(true);
      expect(p.a).toBeGreaterThan(0);
      expect(p.a).toBeLessThanOrEqual(1);
      layers.add(p.layer);
      sides.add(p.side);
    }
    expect([...layers].sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect([...sides].sort()).toEqual([-1, 0, 1]);

    for (const line of desktop.lines) {
      expect(line.length).toBeGreaterThan(1);
      for (const idx of line) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(desktop.pts.length);
      }
    }

    // Clamps extreme or non-finite density values without producing NaN coordinates
    for (const d of [0, -5, 0.05, Number.NaN, Number.POSITIVE_INFINITY]) {
      const g = buildHeroGeometry(d);
      expect(g.pts.length).toBeGreaterThan(0);
      expect(g.pts.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z))).toBe(true);
    }
  });

  it("mountHeroFigure safely handles null/missing context, reduced motion, animation loop, visibility, and cleanup", () => {
    expect(mountHeroFigure(null)).toBeUndefined();
    expect(mountHeroFigure({ getContext: () => null } as unknown as HTMLCanvasElement)).toBeUndefined();
    expect(
      mountHeroFigure({ getContext: () => ({}), parentElement: null } as unknown as HTMLCanvasElement)
    ).toBeUndefined();

    const prevWin = (globalThis as Record<string, unknown>).window;
    const prevDoc = (globalThis as Record<string, unknown>).document;
    const prevRaf = (globalThis as Record<string, unknown>).requestAnimationFrame;
    const prevCaf = (globalThis as Record<string, unknown>).cancelAnimationFrame;
    const prevIO = (globalThis as Record<string, unknown>).IntersectionObserver;

    try {
      let reduceMatches = false;
      let docHidden = false;
      let rafCallback: ((now: number) => void) | null = null;
      let ioCallback: ((entries: { isIntersecting: boolean }[]) => void) | null = null;
      let motionListener: (() => void) | null = null;
      let visListener: (() => void) | null = null;
      let resizeListener: (() => void) | null = null;
      const stageClasses = new Set<string>();
      let clearRectCalls = 0;

      const makeCtx = () => ({
        setTransform: () => {},
        createRadialGradient: () => ({ addColorStop: () => {} }),
        fillRect: () => {},
        clearRect: () => {
          clearRectCalls++;
        },
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        drawImage: () => {},
        arc: () => {},
        fill: () => {},
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 1,
        globalAlpha: 1,
        globalCompositeOperation: "source-over",
      });

      const fakeCanvas = {
        width: 0,
        height: 0,
        getContext: () => makeCtx(),
        getBoundingClientRect: () => ({ width: 320, height: 320 }),
        parentElement: {
          classList: {
            add: (c: string) => stageClasses.add(c),
            remove: (c: string) => stageClasses.delete(c),
          },
        },
      } as unknown as HTMLCanvasElement;

      (globalThis as Record<string, unknown>).window = {
        devicePixelRatio: 1,
        matchMedia: (q: string) => ({
          get matches() {
            return q.includes("reduce") ? reduceMatches : true; // mobile density 0.6 for speed
          },
          addEventListener: (_e: string, fn: () => void) => {
            motionListener = fn;
          },
          removeEventListener: () => {},
        }),
        addEventListener: (_e: string, fn: () => void) => {
          resizeListener = fn;
        },
        removeEventListener: () => {},
      };
      (globalThis as Record<string, unknown>).document = {
        get hidden() {
          return docHidden;
        },
        createElement: () => ({ width: 0, height: 0, getContext: () => makeCtx() }),
        addEventListener: (_e: string, fn: () => void) => {
          visListener = fn;
        },
        removeEventListener: () => {},
      };
      (globalThis as Record<string, unknown>).requestAnimationFrame = (fn: (now: number) => void) => {
        rafCallback = fn;
        return 1;
      };
      (globalThis as Record<string, unknown>).cancelAnimationFrame = () => {};
      (globalThis as Record<string, unknown>).IntersectionObserver = class {
        constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
          ioCallback = cb;
        }
        observe() {}
        disconnect() {}
      };

      const cleanup = mountHeroFigure(fakeCanvas);
      expect(typeof cleanup).toBe("function");
      expect(stageClasses.has("is-3d")).toBe(true);

      // Run one animation frame
      expect(rafCallback).not.toBeNull();
      rafCallback!(performance.now() + 100);
      expect(clearRectCalls).toBeGreaterThan(0);

      // IntersectionObserver empty entries, off-screen, then on-screen
      ioCallback!([]);
      ioCallback!([{ isIntersecting: false }]);
      ioCallback!([{ isIntersecting: true }]);

      // Document visibility toggle
      docHidden = true;
      visListener!();
      docHidden = false;
      visListener!();

      // Switch to reduced motion and resize
      reduceMatches = true;
      motionListener!();
      resizeListener!();

      // Switch back to normal motion
      reduceMatches = false;
      motionListener!();

      cleanup!();
      expect(stageClasses.has("is-3d")).toBe(false);

      // Returns undefined if glow sprite 2d context is unavailable
      (globalThis as Record<string, unknown>).document = {
        ...(globalThis as Record<string, unknown>).document as object,
        createElement: () => ({ width: 0, height: 0, getContext: () => null }),
      };
      expect(mountHeroFigure(fakeCanvas)).toBeUndefined();
    } finally {
      (globalThis as Record<string, unknown>).window = prevWin;
      (globalThis as Record<string, unknown>).document = prevDoc;
      (globalThis as Record<string, unknown>).requestAnimationFrame = prevRaf;
      (globalThis as Record<string, unknown>).cancelAnimationFrame = prevCaf;
      (globalThis as Record<string, unknown>).IntersectionObserver = prevIO;
    }
  });
});

describe("CodeRain component", () => {
  it("renders background matrix code canvas with accessibility attributes and plain ASCII glyphs", () => {
    const html = renderToStaticMarkup(React.createElement(CodeRain));
    expect(html).toContain('class="code-rain"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toMatch(/^<canvas[^>]*><\/canvas>$/);

    expect(GLYPHS.length).toBeGreaterThan(10);
    for (const ch of GLYPHS) {
      expect(ch).toHaveLength(1);
      expect(ch.charCodeAt(0)).toBeGreaterThanOrEqual(32);
      expect(ch.charCodeAt(0)).toBeLessThanOrEqual(126);
    }
  });

  it("mountCodeRain handles null, reduced motion, 2d frame rendering, visibility changes, and cleanup", () => {
    expect(mountCodeRain(null)).toBeUndefined();

    const prevWin = (globalThis as Record<string, unknown>).window;
    const prevDoc = (globalThis as Record<string, unknown>).document;
    const prevRaf = (globalThis as Record<string, unknown>).requestAnimationFrame;
    const prevCaf = (globalThis as Record<string, unknown>).cancelAnimationFrame;

    try {
      let reduceMatches = true;
      let docHidden = false;
      let rafCallback: ((now: number) => void) | null = null;
      let visListener: (() => void) | null = null;
      let motionListener: (() => void) | null = null;
      let resizeListener: (() => void) | null = null;
      let fillTextCount = 0;
      let clearRectCount = 0;

      (globalThis as Record<string, unknown>).window = {
        innerWidth: 640,
        innerHeight: 100,
        matchMedia: (q: string) => ({
          get matches() {
            return q.includes("reduce") ? reduceMatches : true;
          },
          addEventListener: (_e: string, fn: () => void) => {
            motionListener = fn;
          },
          removeEventListener: () => {},
        }),
        addEventListener: (_e: string, fn: () => void) => {
          resizeListener = fn;
        },
        removeEventListener: () => {},
      };
      (globalThis as Record<string, unknown>).document = {
        get hidden() {
          return docHidden;
        },
        addEventListener: (_e: string, fn: () => void) => {
          visListener = fn;
        },
        removeEventListener: () => {},
      };
      (globalThis as Record<string, unknown>).requestAnimationFrame = (fn: (now: number) => void) => {
        rafCallback = fn;
        return 1;
      };
      (globalThis as Record<string, unknown>).cancelAnimationFrame = () => {};

      const fakeCanvas = {
        width: 0,
        height: 0,
        getContext: () => ({
          font: "",
          fillStyle: "",
          globalCompositeOperation: "source-over",
          fillRect: () => {},
          clearRect: () => {
            clearRectCount++;
          },
          fillText: () => {
            fillTextCount++;
          },
        }),
      } as unknown as HTMLCanvasElement;

      // Reduced motion returns early
      expect(mountCodeRain(fakeCanvas)).toBeUndefined();

      // Missing 2D context returns early
      reduceMatches = false;
      expect(mountCodeRain({ getContext: () => null } as unknown as HTMLCanvasElement)).toBeUndefined();

      // Active animation loop
      const cleanup = mountCodeRain(fakeCanvas);
      expect(typeof cleanup).toBe("function");
      expect(rafCallback).not.toBeNull();
      // Advance multiple frames so columns wrap past H + 40
      for (let i = 1; i <= 20; i++) {
        rafCallback!(performance.now() + i * 1000);
      }
      expect(fillTextCount).toBeGreaterThan(0);

      // Pause and resume on visibilitychange, plus resize
      docHidden = true;
      visListener!();
      docHidden = false;
      visListener!();
      resizeListener!();

      // Toggle prefers-reduced-motion on and off at runtime
      reduceMatches = true;
      motionListener!();
      expect(clearRectCount).toBe(1);
      reduceMatches = false;
      motionListener!();

      cleanup!();
    } finally {
      (globalThis as Record<string, unknown>).window = prevWin;
      (globalThis as Record<string, unknown>).document = prevDoc;
      (globalThis as Record<string, unknown>).requestAnimationFrame = prevRaf;
      (globalThis as Record<string, unknown>).cancelAnimationFrame = prevCaf;
    }
  });
});

describe("ThemeSwitcher component", () => {
  it("renders radiogroup with dark, light, and high-contrast theme options", () => {
    const html = renderToStaticMarkup(React.createElement(ThemeSwitcher));
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('class="theme-switch"');
    expect(html).toContain('Color theme');
    expect(html).toContain('data-theme-option="dark"');
    expect(html).toContain('data-theme-option="light"');
    expect(html).toContain('data-theme-option="high-contrast"');
    expect(html).toContain('aria-label="Dark theme"');
    expect(html).toContain('aria-label="Light theme"');
    expect(html).toContain('aria-label="High-contrast theme"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('aria-checked="false"');
    // Without showLabels, text span is not rendered
    expect(html).not.toContain('<span>Dark</span>');
  });

  it("renders short labels when showLabels is true and accepts custom className", () => {
    const html = renderToStaticMarkup(
      React.createElement(ThemeSwitcher, { showLabels: true, className: "nav-theme" })
    );
    expect(html).toContain('class="theme-switch has-labels nav-theme"');
    expect(html).toContain("<span>Dark</span>");
    expect(html).toContain("<span>Light</span>");
    expect(html).toContain("<span>Contrast</span>");
  });

  it("handles keyboard navigation (arrows, Home, End) and click selection across themes", () => {
    let tree: React.ReactElement<{
      onKeyDown: (e: unknown) => void;
      children: unknown[];
    }> | null = null;
    function Harness() {
      const el = ThemeSwitcher({ showLabels: true });
      tree = el as typeof tree;
      return el;
    }
    renderToStaticMarkup(React.createElement(Harness));
    expect(tree).not.toBeNull();

    let currentAttr = "dark";
    let metaContent = "";
    let storedValue = "";
    const dispatched: string[] = [];
    const focusedIndices: number[] = [];

    const prevDoc = (globalThis as Record<string, unknown>).document;
    const prevWin = (globalThis as Record<string, unknown>).window;
    const prevStorage = (globalThis as Record<string, unknown>).localStorage;

    try {
      (globalThis as Record<string, unknown>).document = {
        documentElement: {
          getAttribute: () => currentAttr,
          setAttribute: (_k: string, v: string) => {
            currentAttr = v;
          },
        },
        querySelectorAll: () => [
          {
            setAttribute: (_k: string, v: string) => {
              metaContent = v;
            },
          },
        ],
      };
      (globalThis as Record<string, unknown>).window = {
        dispatchEvent: (ev: CustomEvent<string>) => {
          dispatched.push(ev.detail);
        },
      };
      (globalThis as Record<string, unknown>).localStorage = {
        setItem: (_k: string, v: string) => {
          storedValue = v;
        },
      };

      const makeKeyEvent = (key: string) => {
        let prevented = false;
        return {
          key,
          preventDefault: () => {
            prevented = true;
          },
          get prevented() {
            return prevented;
          },
          currentTarget: {
            querySelectorAll: () =>
              [0, 1, 2].map((idx) => ({
                focus: () => focusedIndices.push(idx),
              })),
          },
        };
      };

      // Unhandled key is ignored
      const tabEv = makeKeyEvent("Tab");
      tree!.props.onKeyDown(tabEv);
      expect(tabEv.prevented).toBe(false);
      expect(dispatched).toHaveLength(0);

      // ArrowRight from default dark (index 0) -> light (index 1)
      const rightEv = makeKeyEvent("ArrowRight");
      tree!.props.onKeyDown(rightEv);
      expect(rightEv.prevented).toBe(true);
      expect(currentAttr).toBe("light");
      expect(storedValue).toBe("light");
      expect(metaContent).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(focusedIndices.at(-1)).toBe(1);

      // ArrowUp from default dark (index 0) -> wraps to high-contrast (index 2)
      const upEv = makeKeyEvent("ArrowUp");
      tree!.props.onKeyDown(upEv);
      expect(currentAttr).toBe("high-contrast");
      expect(focusedIndices.at(-1)).toBe(2);

      // Home -> dark (index 0), End -> high-contrast (index 2)
      tree!.props.onKeyDown(makeKeyEvent("Home"));
      expect(currentAttr).toBe("dark");
      expect(focusedIndices.at(-1)).toBe(0);

      tree!.props.onKeyDown(makeKeyEvent("End"));
      expect(currentAttr).toBe("high-contrast");
      expect(focusedIndices.at(-1)).toBe(2);

      // Direct button click and localStorage private-mode error resilience
      (globalThis as Record<string, unknown>).localStorage = {
        setItem: () => {
          throw new Error("QuotaExceededError");
        },
      };
      const buttons = tree!.props.children[1] as React.ReactElement<{ onClick: () => void }>[];
      expect(() => buttons[1].props.onClick()).not.toThrow();
      expect(currentAttr).toBe("light");
      expect(currentTheme()).toBe("light");

      // applyTheme without persistence does not write localStorage
      applyTheme("high-contrast", false);
      expect(currentTheme()).toBe("high-contrast");

      currentAttr = "unknown";
      expect(currentTheme()).toBe("dark");
    } finally {
      (globalThis as Record<string, unknown>).document = prevDoc;
      (globalThis as Record<string, unknown>).window = prevWin;
      (globalThis as Record<string, unknown>).localStorage = prevStorage;
    }
  });

  it("mountThemeSync synchronizes custom events, honors valid stored themes, and reacts to OS preference changes", () => {
    const prevDoc = (globalThis as Record<string, unknown>).document;
    const prevWin = (globalThis as Record<string, unknown>).window;
    const prevStorage = (globalThis as Record<string, unknown>).localStorage;

    try {
      let currentAttr = "light";
      let storedTheme: string | null = null;
      let throwOnGet = false;
      let lightMatch = false;
      let contrastMatch = false;
      let eventListener: ((e: Event) => void) | null = null;
      const mqListeners: (() => void)[] = [];
      const observedThemes: ThemeName[] = [];

      (globalThis as Record<string, unknown>).document = {
        documentElement: {
          getAttribute: () => currentAttr,
          setAttribute: (_k: string, v: string) => {
            currentAttr = v;
          },
        },
        querySelectorAll: () => [],
      };
      (globalThis as Record<string, unknown>).window = {
        addEventListener: (_ev: string, fn: (e: Event) => void) => {
          eventListener = fn;
        },
        removeEventListener: () => {},
        dispatchEvent: (ev: CustomEvent<ThemeName>) => {
          eventListener?.(ev);
        },
        matchMedia: (q: string) => ({
          get matches() {
            return q.includes("contrast") ? contrastMatch : lightMatch;
          },
          addEventListener: (_ev: string, fn: () => void) => {
            mqListeners.push(fn);
          },
          removeEventListener: () => {},
        }),
      };
      (globalThis as Record<string, unknown>).localStorage = {
        getItem: (k: string) => {
          if (throwOnGet) throw new Error("SecurityError");
          return k === THEME_KEY ? storedTheme : null;
        },
        setItem: (_k: string, v: string) => {
          storedTheme = v;
        },
      };

      const cleanup = mountThemeSync((t) => observedThemes.push(t));
      expect(observedThemes.at(-1)).toBe("light");

      // OS change when no valid theme is saved (or invalid string is saved) updates theme
      storedTheme = "invalid-stale-value";
      contrastMatch = true;
      mqListeners[0]();
      expect(currentAttr).toBe("high-contrast");
      expect(observedThemes.at(-1)).toBe("high-contrast");

      contrastMatch = false;
      lightMatch = true;
      mqListeners[0]();
      expect(currentAttr).toBe("light");

      lightMatch = false;
      throwOnGet = true;
      mqListeners[0]();
      expect(currentAttr).toBe("dark");
      throwOnGet = false;

      // OS change when a valid theme IS saved is ignored
      storedTheme = "light";
      contrastMatch = true;
      mqListeners[0]();
      expect(currentAttr).toBe("dark");

      cleanup();
    } finally {
      (globalThis as Record<string, unknown>).document = prevDoc;
      (globalThis as Record<string, unknown>).window = prevWin;
      (globalThis as Record<string, unknown>).localStorage = prevStorage;
    }
  });
});
