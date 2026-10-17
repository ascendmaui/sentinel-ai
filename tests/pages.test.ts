import { renderToStaticMarkup } from "react-dom/server";
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
  it("renders HomePage without error and outputs valid markup", () => {
    const el = HomePage();
    expect(el).toBeDefined();
    expect(el.type).toBe("main");
    expect(el.props.className).toBe("home");
    const html = renderToStaticMarkup(el);
    expect(html).toContain(BRAND_NAME);
    expect(html).toContain("Ready to see what an attacker would see first?");
  });
});

describe("Pricing Page", () => {
  it("exports valid metadata", () => {
    expect(pricingMeta.title).toBe("Services and tiers");
    expect(pricingMeta.alternates?.canonical).toBe("/pricing");
  });

  it("renders PricingPage with tier cards, comparison, and markup", () => {
    const el = PricingPage();
    expect(el).toBeDefined();
    expect(el.type).toBe("main");
    expect(el.props.className).toBe("home cs");
    const html = renderToStaticMarkup(el);
    expect(html).toContain("Seraphim");
    expect(html).toContain("Cherubim");
    expect(html).toContain("Thrones");
    expect(html).toContain("Angels");
  });
});

describe("Blog Page and Post Page", () => {
  it("exports valid blog metadata and renders BlogIndex markup", () => {
    expect(blogMeta.title).toBe("Blog");
    expect(blogMeta.alternates?.canonical).toBe("/blog");
    const el = BlogIndex();
    expect(el.type).toBe("main");
    const html = renderToStaticMarkup(el);
    for (const post of posts) {
      expect(html).toContain(post.title);
      expect(html).toContain(`/blog/${post.slug}`);
    }
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

  it("invokes notFound() when rendering unknown post slug", async () => {
    await expect(PostPage({ params: Promise.resolve({ slug: "unknown-slug" }) })).rejects.toThrow(
      "NEXT_HTTP_ERROR_FALLBACK;404"
    );
  });

  it("renders PostPage markup for every post", async () => {
    for (const post of posts) {
      const el = await PostPage({ params: Promise.resolve({ slug: post.slug }) });
      expect(el).toBeDefined();
      expect(el.type).toBe("main");
      expect(el.props.className).toBe("home cs");
      const html = renderToStaticMarkup(el);
      expect(html).toContain(post.title);
    }
  });
});

describe("Case Studies Page", () => {
  it("exports valid metadata and renders CaseStudiesPage markup", () => {
    expect(csMeta.title).toBe("Case studies");
    expect(csMeta.alternates?.canonical).toBe("/case-studies");
    const el = CaseStudiesPage();
    expect(el.type).toBe("main");
    const html = renderToStaticMarkup(el);
    expect(html).toContain("F-01");
    expect(html).toContain("Scheduled-maintenance endpoint");
  });
});

describe("Incident Case Studies Page", () => {
  it("exports valid metadata and renders IncidentCaseStudiesPage markup", () => {
    expect(incMeta.title).toBe("Incident Case Studies");
    expect(incMeta.alternates?.canonical).toBe("/incident-case-studies");
    const el = IncidentCaseStudiesPage();
    expect(el.type).toBe("main");
    const html = renderToStaticMarkup(el);
    expect(html).toContain("OpenAI and Hugging Face");
    expect(html).toContain("Hypothetical Scenarios");
  });
});

describe("Not Found Page", () => {
  it("renders NotFound page with recovery links and markup", () => {
    const el = NotFound();
    expect(el.type).toBe("main");
    expect(el.props.className).toBe("home cs");
    const section = el.props.children;
    expect(section.props.style?.textAlign).toBe("center");
    const linksRow = section.props.children[3];
    const links = linksRow.props.children;
    const hrefs = links.map((l: { props: { href: string } }) => l.props.href);
    expect(hrefs).toEqual(["/", "/blog", "/incident-case-studies", "/pricing"]);
    const html = renderToStaticMarkup(el);
    expect(html).toContain("Page not found");
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/pricing"');
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

    const [head, body] = el.props.children;
    expect(head.type).toBe("head");
    const script = head.props.children;
    expect(script.props.dangerouslySetInnerHTML?.__html).toContain("data-theme");

    expect(body.type).toBe("body");
    const [skipLink, codeRain, nav, mainDiv, footer] = body.props.children;
    expect(skipLink.props.href).toBe("#main");
    expect(skipLink.props.className).toBe("skip");
    expect(nav).toBeDefined();
    expect(mainDiv.props.id).toBe("main");
    expect(mainDiv.props.children).toBe("content");
    expect(footer).toBeDefined();

    const html = renderToStaticMarkup(el);
    expect(html).toContain("<html lang=\"en\"");
    expect(html).toContain("data-theme");
    expect(html).toContain("content");
  });
});
