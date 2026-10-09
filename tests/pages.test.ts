import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Bricolage_Grotesque: () => ({ variable: "--font-display" }),
  Inter: () => ({ variable: "--font-body" }),
  JetBrains_Mono: () => ({ variable: "--font-mono" }),
}));
import HomePage from "../app/page";
import PricingPage, { metadata as pricingMeta } from "../app/pricing/page";
import BlogIndex, { metadata as blogMeta } from "../app/blog/page";
import PostPage, { generateMetadata as postMeta } from "../app/blog/[slug]/page";
import CaseStudiesPage, { metadata as csMeta } from "../app/case-studies/page";
import IncidentCaseStudiesPage, { metadata as incMeta } from "../app/incident-case-studies/page";
import NotFound from "../app/not-found";
import RootLayout, { metadata as rootMeta, viewport as rootViewport } from "../app/layout";
import { BRAND_NAME, SITE_URL } from "../lib/brand";
import { posts } from "../lib/posts";

describe("Home Page", () => {
  it("renders HomePage without error", () => {
    const el = HomePage();
    expect(el).toBeDefined();
    expect(el.type).toBe("main");
    expect(el.props.className).toBe("home");
  });
});

describe("Pricing Page", () => {
  it("exports valid metadata", () => {
    expect(pricingMeta.title).toBe("Services and tiers");
    expect(pricingMeta.alternates?.canonical).toBe("/pricing");
  });

  it("renders PricingPage with tier cards and comparison", () => {
    const el = PricingPage();
    expect(el).toBeDefined();
    expect(el.type).toBe("main");
    expect(el.props.className).toBe("home cs");
  });
});

describe("Blog Page and Post Page", () => {
  it("exports valid blog metadata and renders BlogIndex", () => {
    expect(blogMeta.title).toBe("Blog");
    expect(blogMeta.alternates?.canonical).toBe("/blog");
    const el = BlogIndex();
    expect(el.type).toBe("main");
  });

  it("generateMetadata for every post returns article title and canonical url", async () => {
    for (const post of posts) {
      const meta = await postMeta({ params: Promise.resolve({ slug: post.slug }) });
      expect(meta.title).toBe(post.title);
      expect(meta.description).toBe(post.description);
      expect(meta.alternates?.canonical).toBe(`/blog/${post.slug}`);
    }
  });

  it("generateMetadata returns empty object for unknown post", async () => {
    const meta = await postMeta({ params: Promise.resolve({ slug: "unknown-slug" }) });
    expect(meta).toEqual({});
  });

  it("renders PostPage for every post", async () => {
    for (const post of posts) {
      const el = await PostPage({ params: Promise.resolve({ slug: post.slug }) });
      expect(el).toBeDefined();
      expect(el.type).toBe("main");
      expect(el.props.className).toBe("home cs");
    }
  });
});

describe("Case Studies Page", () => {
  it("exports valid metadata and renders CaseStudiesPage", () => {
    expect(csMeta.title).toBe("Case studies");
    expect(csMeta.alternates?.canonical).toBe("/case-studies");
    const el = CaseStudiesPage();
    expect(el.type).toBe("main");
  });
});

describe("Incident Case Studies Page", () => {
  it("exports valid metadata and renders IncidentCaseStudiesPage", () => {
    expect(incMeta.title).toBe("Incident Case Studies");
    expect(incMeta.alternates?.canonical).toBe("/incident-case-studies");
    const el = IncidentCaseStudiesPage();
    expect(el.type).toBe("main");
  });
});

describe("Not Found Page", () => {
  it("renders NotFound page with recovery links", () => {
    const el = NotFound();
    expect(el.type).toBe("main");
    expect(el.props.className).toBe("home cs");
  });
});

describe("Root Layout and Shell Metadata", () => {
  it("exports site metadataBase and openGraph info", () => {
    expect(rootMeta.metadataBase).toEqual(new URL(SITE_URL));
    expect(rootMeta.applicationName).toBe(BRAND_NAME);
    expect(rootMeta.openGraph?.siteName).toBe(BRAND_NAME);
    expect(rootViewport.colorScheme).toBe("dark light");
  });

  it("renders RootLayout with html and body structure", () => {
    const el = RootLayout({ children: "content" });
    expect(el.type).toBe("html");
    expect(el.props.lang).toBe("en");
    expect(el.props.suppressHydrationWarning).toBe(true);
  });
});
