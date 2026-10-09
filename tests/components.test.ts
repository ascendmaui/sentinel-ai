import { describe, expect, it } from "vitest";
import { Icon, type IconName } from "../components/Icons";
import { Mark, Wordmark } from "../components/Logo";
import { TrustBadges } from "../components/TrustBadges";
import { TierStrip } from "../components/TierStrip";
import { TierEmblem } from "../components/TierEmblem";
import { TierCta } from "../components/TierCta";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { HeroStage } from "../components/HeroStage";
import { BRAND_EMAIL, BRAND_MAIL, BRAND_NAME, BRAND_PARENT, BRAND_SUFFIX, BRAND_WORD, TRUE_BADGES } from "../lib/brand";
import { tiers, type TierId } from "../lib/tiers";

describe("Icon component", () => {
  const iconNames: IconName[] = ["scan", "shield", "fix", "users", "list", "mail", "check", "target"];

  it.each(iconNames)("renders %s icon with standard svg attributes", (name) => {
    const el = Icon({ name });
    expect(el).toBeDefined();
    expect(el.type).toBe("svg");
    expect(el.props.viewBox).toBe("0 0 24 24");
    expect(el.props.strokeWidth).toBe(1.7);
    expect(el.props["aria-hidden"]).toBe(true);
    expect(el.props.children).toBeDefined();
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
    expect(textSpan.props.children[0]).toBe(BRAND_WORD);
    if (BRAND_SUFFIX) {
      expect(textSpan.props.children[1].props.children).toBe(BRAND_SUFFIX);
    }

    // Screen reader text
    const srSpan = children[2];
    expect(srSpan.props.className).toBe("sr-only");
    expect(srSpan.props.children).toContain(BRAND_NAME);
  });
});

describe("TrustBadges component", () => {
  it("renders all true badges in standard mode", () => {
    const el = TrustBadges({ compact: false });
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
  });

  it("renders compact mode without note text", () => {
    const el = TrustBadges({ compact: true });
    expect(el.props.className).toBe("badges badges-compact");
    const items = el.props.children;
    for (const item of items) {
      const textSpan = item.props.children[1];
      expect(textSpan.props.children[1]).toBeNull();
    }
  });
});

describe("TierStrip and TierEmblem components", () => {
  const tierIds: TierId[] = ["seraphim", "cherubim", "thrones", "angels"];

  it.each(tierIds)("TierEmblem renders for %s", (id) => {
    const el = TierEmblem({ id, size: 36 });
    expect(el.type).toBe("svg");
    expect(el.props.width).toBe(36);
    expect(el.props.height).toBe(36);
    expect(el.props.viewBox).toBe("0 0 48 48");
    expect(el.props["aria-hidden"]).toBe(true);
    expect(el.props.className).toBe("tier-emblem");
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

    expect(copyright.props.children).toContain(BRAND_NAME);
    expect(copyright.props.children).toContain(BRAND_PARENT);
  });
});

describe("HeroStage component", () => {
  it("renders hero stage container, rings, mark, and figure", () => {
    const el = HeroStage();
    expect(el.type).toBe("div");
    expect(el.props.className).toBe("hero-stage");
    expect(el.props["data-hero-stage"]).toBe(true);

    const [rings, mark] = el.props.children;
    expect(rings.props.className).toBe("hero-rings");
    expect(rings.props["aria-hidden"]).toBe("true");

    expect(mark.type).toBe(Mark);
    expect(mark.props.size).toBe(220);
    expect(mark.props.id).toBe("hero");
    expect(mark.props.title).toBe(`${BRAND_NAME} seraphim mark`);
  });
});
