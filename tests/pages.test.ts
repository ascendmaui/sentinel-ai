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
import PostPage, { generateMetadata as postMeta, generateStaticParams as blogStaticParams } from "../app/blog/[slug]/page";
import CaseStudiesPage, { metadata as csMeta } from "../app/case-studies/page";
import IncidentCaseStudiesPage, { metadata as incMeta } from "../app/incident-case-studies/page";
import NotFound from "../app/not-found";
import RootLayout, { metadata as rootMeta, viewport as rootViewport } from "../app/layout";
import { BRAND_NAME, SITE_URL } from "../lib/brand";
import { findings, remediation, severityCounts } from "../lib/caseStudies";
import { INCIDENTS_DISCLAIMER, incidents, scenarios, unverified } from "../lib/incidents";
import * as postsModule from "../lib/posts";
import { posts } from "../lib/posts";
import { tiers } from "../lib/tiers";

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
    for (const t of tiers) {
      expect(html).toContain(`id="${t.id}"`);
      expect(html).toContain(t.name);
      expect(html).toContain(t.positioning);
    }
    expect(html).toContain('<span class="yes">Included</span>');
    expect(html).toContain('<span class="no">Not included</span>');
    expect(html).toContain('id="compare"');
    expect(html).toContain('id="fit"');
    expect(html).toContain('id="terms"');
    expect(html).toContain('id="contact"');
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

  it("generateStaticParams covers every blog post slug", () => {
    expect(blogStaticParams()).toEqual(posts.map((p) => ({ slug: p.slug })));
  });

  it("generateMetadata for every post returns article title and canonical url (including case-insensitive lookup)", async () => {
    for (const post of posts) {
      const meta = await postMeta({ params: Promise.resolve({ slug: post.slug }) });
      expect(meta.title).toBe(post.title);
      expect(meta.description).toBe(post.description);
      expect(meta.alternates?.canonical).toBe(`/blog/${post.slug}`);
    }
    const upperMeta = await postMeta({ params: Promise.resolve({ slug: `  ${posts[0].slug.toUpperCase()}  ` }) });
    expect(upperMeta.title).toBe(posts[0].title);
    expect(upperMeta.alternates?.canonical).toBe(`/blog/${posts[0].slug}`);
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

  it("renders PostPage markup for every post, plus quote blocks, unknown block types, and missing sources", async () => {
    for (const post of posts) {
      const el = await PostPage({ params: Promise.resolve({ slug: post.slug }) });
      expect(el).toBeDefined();
      expect(el.type).toBe("main");
      expect(el.props.className).toBe("home cs");
      const html = renderToStaticMarkup(el);
      expect(html).toContain(post.title);
      expect(html).toContain('rel="noopener noreferrer"');
    }

    // Exercise quote block, unknown block fallback, and missing source guard
    const spy = vi.spyOn(postsModule, "postBySlug").mockReturnValueOnce({
      ...posts[0],
      sources: ["oaiAug", "nonexistent-source-id"],
      body: [
        { t: "quote", x: "Verification is evidence, not assurance." },
        { t: "unknown" as unknown as "p", x: "ignored" },
      ],
    });
    const customEl = await PostPage({ params: Promise.resolve({ slug: posts[0].slug }) });
    const customHtml = renderToStaticMarkup(customEl);
    expect(customHtml).toContain("<blockquote>Verification is evidence, not assurance.</blockquote>");
    expect(customHtml).not.toContain("ignored");
    spy.mockRestore();
  });
});

describe("Case Studies Page", () => {
  it("exports valid metadata and renders CaseStudiesPage markup with all findings and remediations", () => {
    expect(csMeta.title).toBe("Case studies");
    expect(csMeta.alternates?.canonical).toBe("/case-studies");
    const el = CaseStudiesPage();
    expect(el.type).toBe("main");
    const html = renderToStaticMarkup(el);
    for (const f of findings) {
      expect(html).toContain(`id="${f.id.toLowerCase()}"`);
      expect(html).toContain(f.title.replace(/'/g, "&#x27;"));
    }
    for (const r of remediation) {
      expect(html).toContain(`id="fix-${r.id.toLowerCase()}"`);
      expect(html).toContain(r.checked.replace(/'/g, "&#x27;"));
    }
    for (const [sev, count] of Object.entries(severityCounts)) {
      expect(html).toContain(`${sev}</span> ${count}`);
    }
  });
});

describe("Incident Case Studies Page", () => {
  it("exports valid metadata and renders IncidentCaseStudiesPage markup with all incidents, scenarios, and unverified notes", () => {
    expect(incMeta.title).toBe("Incident Case Studies");
    expect(incMeta.alternates?.canonical).toBe("/incident-case-studies");
    const el = IncidentCaseStudiesPage();
    expect(el.type).toBe("main");
    const html = renderToStaticMarkup(el);
    expect(html).toContain(INCIDENTS_DISCLAIMER);
    for (const inc of incidents) {
      expect(html).toContain(`id="${inc.id}"`);
      expect(html).toContain(`href="#${inc.id}"`);
      expect(html).toContain(inc.title.replace(/'/g, "&#x27;"));
    }
    for (const sc of scenarios) {
      expect(html).toContain(`id="${sc.id}"`);
      expect(html).toContain(sc.title.replace(/'/g, "&#x27;"));
    }
    for (const u of unverified) {
      expect(html).toContain(u.slice(0, 40).replace(/'/g, "&#x27;"));
    }
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
