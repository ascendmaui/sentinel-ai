import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import sitemap from "../app/sitemap";

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
import { GET as postsApi } from "../app/api/posts/route";
import { GET as incidentsApi } from "../app/api/incidents/route";
import { GET as scenariosApi } from "../app/api/scenarios/route";
import { GET as caseStudiesApi } from "../app/api/case-studies/route";
import { GET as tiersApi } from "../app/api/tiers/route";
import { BRAND_EMAIL, BRAND_MAIL, BRAND_NAME, BRAND_PARENT, SITE_URL } from "../lib/brand";
import { findings, remediation, severityCounts } from "../lib/caseStudies";
import { INCIDENTS_DISCLAIMER, incidents, scenarios, unverified } from "../lib/incidents";
import * as postsModule from "../lib/posts";
import { posts } from "../lib/posts";
import * as sourcesModule from "../lib/sources";
import { ENGAGEMENT_TERMS, helper, matrix, tierById, tierHref, tiers } from "../lib/tiers";

describe("Home Page", () => {
  it("renders HomePage without error and outputs valid markup across all sections", () => {
    const el = HomePage();
    expect(el).toBeDefined();
    expect(el.type).toBe("main");
    expect(el.props.className).toBe("home");
    const html = renderToStaticMarkup(el);
    expect(html).toContain(BRAND_NAME);
    expect(html).toContain('id="phases"');
    expect(html).toContain('id="who"');
    expect(html).toContain('id="tiers"');
    expect(html).toContain('id="incidents"');
    expect(html).toContain('id="how"');
    expect(html).toContain('id="contact"');
    expect(html).toContain("Recon");
    expect(html).toContain("Scoped Assessment");
    expect(html).toContain("Remediation and Retest");
    expect(html).toContain("Security and AppSec teams");
    expect(html).toContain("Founders and product leads");
    expect(html).toContain("Compliance and risk owners");
    expect(html).toContain("Define scope");
    expect(html).toContain("Run the three phases");
    expect(html).toContain("Verify and hand off");
    expect(`mailto:${BRAND_EMAIL}?subject=${BRAND_MAIL}%20inquiry`).toBeDefined();
    expect(html).toContain(`mailto:${BRAND_EMAIL}?subject=${BRAND_MAIL}%20inquiry`);
    expect(html).toContain("Ready to see what an attacker would see first?");
  });

  it("renders hero actions, phases with icons, audience cards, process steps, and dual contact mailto links", () => {
    const html = renderToStaticMarkup(HomePage());
    expect(html).toContain('class="pulse"');
    expect(html).toContain("Know your exposure.");
    expect(html).toContain("Close it on purpose.");
    expect(html).toContain(`mailto:${BRAND_EMAIL}?subject=${BRAND_MAIL}%20inquiry`);
    expect(html).toContain('href="#phases"');
    expect(html).toContain('class="badges badges-compact"');
    expect(html).toContain(`Built by ${BRAND_PARENT}`);

    // All phases with icons
    for (const phase of ["Phase 01", "Phase 02", "Phase 03"]) {
      expect(html).toContain(phase);
    }

    // Process steps
    expect(html).toContain("01");
    expect(html).toContain("02");
    expect(html).toContain("03");
    expect(html).toContain("Agree on systems, accounts, windows, and hard stop conditions.");
    expect(html).toContain("Recon, Scoped Assessment, then Remediation and Retest");
    expect(html).toContain("Confirm critical fixes, leave a durable record");

    // Incident teaser button
    expect(html).toContain('href="/incident-case-studies"');
    expect(html).toContain("Read the Incident Case Studies");

    // Dual mailto links
    expect(html).toContain(`mailto:${BRAND_EMAIL}?subject=${BRAND_MAIL}%20scope%20request`);
    expect(html).toContain("Request a scoped assessment");
  });
});

describe("Pricing Page", () => {
  it("exports valid metadata and OpenGraph configuration", () => {
    expect(pricingMeta.title).toBe("Services and tiers");
    expect(pricingMeta.alternates?.canonical).toBe("/pricing");
    expect((pricingMeta.openGraph as Record<string, unknown>)?.type).toBe("website");
    expect(pricingMeta.openGraph?.url).toBe("/pricing");
    expect(pricingMeta.openGraph?.siteName).toBe(BRAND_NAME);
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
    expect(html).toContain("tier-flagship");
    expect(html).toContain('class="cmp-hi"');
    expect(html).toContain('<span class="yes">Included</span>');
    expect(html).toContain('<span class="no">Not included</span>');
    expect(html).toContain('<span class="yes">Scheduled re-checks</span>');
    expect(html).toContain('<span class="yes">Comprehensive</span>');
    expect(html).toContain('<span class="yes">One target</span>');
    expect(html).toContain('id="compare"');
    expect(html).toContain('id="fit"');
    expect(html).toContain('id="terms"');
    expect(html).toContain('id="contact"');
    for (const r of matrix) {
      expect(html).toContain(r.row);
    }
    expect(html).toContain(helper[0].q);
    for (const a of helper[0].a) {
      expect(html).toContain(a.label);
    }
    expect(html).toContain(ENGAGEMENT_TERMS);
    for (const t of tiers) {
      expect(html).toContain(`mailto:${BRAND_EMAIL}?subject=${BRAND_MAIL}%20${encodeURIComponent(t.name)}%20inquiry`);
    }
    // No published dollar prices on /pricing
    expect(html).not.toMatch(/\$\s*\d/);
  });

  it("renders comparison table header, positioning, column order, and fit recommendations", () => {
    const html = renderToStaticMarkup(PricingPage());
    expect(html).toContain('scope="col">What you get</th>');
    expect(html).toContain('scope="col">Positioning</th>');
    for (const id of ["seraphim", "cherubim", "thrones", "angels"]) {
      expect(html).toContain(tierById(id)!.name);
      expect(html).toContain(tierById(id)!.positioning);
    }
    for (const item of helper[0].a) {
      expect(html).toContain(tierHref(item.tier));
      expect(html).toContain(tierById(item.tier)!.name);
    }
    expect(html).toContain(`mailto:${BRAND_EMAIL}?subject=${BRAND_MAIL}%20scope%20request`);
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
      expect(html).toContain(`<time dateTime="${post.date}">${post.date}</time>`);
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

    const numMeta = await postMeta({ params: Promise.resolve({ slug: "1" }) });
    expect(numMeta.title).toBe(posts[0].title);
    expect(numMeta.alternates?.canonical).toBe(`/blog/${posts[0].slug}`);

    const p1Meta = await postMeta({ params: Promise.resolve({ slug: "p-1" }) });
    expect(p1Meta.title).toBe(posts[0].title);
    expect(p1Meta.alternates?.canonical).toBe(`/blog/${posts[0].slug}`);

    const jsonMeta = await postMeta({ params: Promise.resolve({ slug: "1.json" }) });
    expect(jsonMeta.title).toBe(posts[0].title);
    expect(jsonMeta.alternates?.canonical).toBe(`/blog/${posts[0].slug}`);

    const p1JsonMeta = await postMeta({ params: Promise.resolve({ slug: "p-1.json" }) });
    expect(p1JsonMeta.title).toBe(posts[0].title);
    expect(p1JsonMeta.alternates?.canonical).toBe(`/blog/${posts[0].slug}`);

    const postPrefixedMeta = await postMeta({ params: Promise.resolve({ slug: `post-${posts[0].slug}` }) });
    expect(postPrefixedMeta.title).toBe(posts[0].title);
    expect(postPrefixedMeta.alternates?.canonical).toBe(`/blog/${posts[0].slug}`);

    const hashMeta = await postMeta({ params: Promise.resolve({ slug: `#${posts[0].slug}` }) });
    expect(hashMeta.title).toBe(posts[0].title);
    expect(hashMeta.alternates?.canonical).toBe(`/blog/${posts[0].slug}`);

    const hashNumMeta = await postMeta({ params: Promise.resolve({ slug: "#1" }) });
    expect(hashNumMeta.title).toBe(posts[0].title);
    expect(hashNumMeta.alternates?.canonical).toBe(`/blog/${posts[0].slug}`);
  });

  it("generateMetadata returns empty object for unknown post or missing params", async () => {
    const meta = await postMeta({ params: Promise.resolve({ slug: "unknown-slug" }) });
    expect(meta).toEqual({});
    expect(await postMeta(undefined as unknown as { params: Promise<{ slug: string }> })).toEqual({});
  });

  it("invokes notFound() when rendering unknown post slug or missing params", async () => {
    await expect(PostPage({ params: Promise.resolve({ slug: "unknown-slug" }) })).rejects.toThrow(
      "NEXT_HTTP_ERROR_FALLBACK;404"
    );
    await expect(PostPage(undefined as unknown as { params: Promise<{ slug: string }> })).rejects.toThrow(
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
      expect(html).toContain(`<time dateTime="${post.date}">${post.date}</time>`);
      expect(html).toContain('rel="noopener noreferrer"');
    }

    // Resolves by numeric index and prefix aliases
    for (const alias of ["1", "01", "+1", "p-1", "post-1", "article-1", "art-1", "article1", "1.json", "01.json", "p-1.json", `post-${posts[0].slug}`, `#${posts[0].slug}`, "#1", "#p-1", `#post-${posts[0].slug}`]) {
      const el = await PostPage({ params: Promise.resolve({ slug: alias }) });
      const html = renderToStaticMarkup(el);
      expect(html).toContain(posts[0].title);
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

    // When all source IDs on a post are unresolvable, omits the Sources section rather than rendering an empty <ul>
    spy.mockReturnValueOnce({
      ...posts[0],
      sources: ["nonexistent-source-id"],
    });
    const noSrcHtml = renderToStaticMarkup(await PostPage({ params: Promise.resolve({ slug: posts[0].slug }) }));
    expect(noSrcHtml).not.toContain('class="post-src"');
    expect(noSrcHtml).not.toMatch(/<(?:ul|ol)\b[^>]*>\s*<\/(?:ul|ol)>/);
    spy.mockRestore();
  });

  it("renders blog header links, ordered lists in post bodies, reading note callouts, and post CTA bands", async () => {
    const blogHtml = renderToStaticMarkup(BlogIndex());
    expect(blogMeta.openGraph).toBeDefined();
    expect((blogMeta.openGraph as Record<string, unknown>).type).toBe("website");
    expect(blogMeta.openGraph?.url).toBe("/blog");
    expect(blogHtml).toContain('href="/incident-case-studies"');
    expect(blogHtml).toContain('aria-label="Seraphim tier"');

    // Verify all posts render, with <ol> lists where defined
    for (const post of posts) {
      const el = await PostPage({ params: Promise.resolve({ slug: post.slug }) });
      const html = renderToStaticMarkup(el);
      expect(html).toContain("Reading note.");
      expect(html).toContain('href="/incident-case-studies#hypothetical-scenarios"');
      expect(html).toContain('href="/incident-case-studies"');
      expect(html).toContain(`mailto:${BRAND_EMAIL}?subject=${BRAND_MAIL}%20inquiry`);
      expect(html).toContain(post.ctaLead);

      const hasOl = post.body.some((b) => b.t === "ol");
      if (hasOl) {
        expect(html).toContain("<ol>");
        expect(html).toContain("</ol>");
      }
    }
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
      expect(html).toContain(f.rationale.replace(/'/g, "&#x27;"));
      expect(html).toContain(f.fix.replace(/'/g, "&#x27;"));
    }
    for (const r of remediation) {
      expect(html).toContain(`id="fix-${r.id.toLowerCase()}"`);
      expect(html).toContain(r.checked.replace(/'/g, "&#x27;"));
    }
    expect(html).toContain("Self-engagement");
    expect(html).toContain("airport ride platform");
    expect(html).toContain("Recon");
    expect(html).toContain("Scoped Assessment");
    expect(html).toContain("Remediation and Retest");
    for (const [sev, count] of Object.entries(severityCounts)) {
      expect(html).toContain(`${sev}</span> ${count}`);
    }
  });

  it("renders summary definition list, 3 phase states, before/after finding descriptions, and limits writeup", () => {
    const html = renderToStaticMarkup(CaseStudiesPage());
    // Metadata OpenGraph
    expect(csMeta.openGraph).toBeDefined();
    expect((csMeta.openGraph as Record<string, unknown>).type).toBe("article");
    expect(csMeta.openGraph?.title).toBe("Case study 01: Self-engagement, airport ride platform");
    expect(csMeta.openGraph?.url).toBe("/case-studies");

    // Assessment summary dictionary
    expect(html).toContain("<dt>Assessor</dt>");
    expect(html).toContain("<dt>Target</dt>");
    expect(html).toContain("<dt>Method</dt>");
    expect(html).toContain("<dt>Scope</dt>");
    expect(html).toContain("<dt>Report status</dt>");
    expect(html).toContain("This is a self-engagement.");

    // The three phases
    expect(html).toContain("Performed (observational)");
    expect(html).toContain("Not performed");
    expect(html).toContain("Performed, with verification");

    // Finding before/after sections
    for (const f of findings) {
      expect(html).toContain(f.what.replace(/"/g, "&quot;").replace(/'/g, "&#x27;"));
      expect(html).toContain(f.before.replace(/"/g, "&quot;").replace(/'/g, "&#x27;"));
      expect(html).toContain(f.after.replace(/"/g, "&quot;").replace(/'/g, "&#x27;"));
      expect(html).toContain(f.status.replace(/"/g, "&quot;").replace(/'/g, "&#x27;"));
    }

    // Limits panel and TierCta aside
    expect(html).toContain('id="cs-limits"');
    expect(html).toContain("What this case study does not claim");
    expect(html).toContain('aria-label="Thrones tier"');
    expect(html).toContain(`mailto:${BRAND_EMAIL}?subject=${BRAND_MAIL}%20inquiry`);
    expect(html).toContain(`mailto:${BRAND_EMAIL}?subject=${BRAND_MAIL}%20scope%20request`);
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
    expect(html).toContain("Rogue agent");
    expect(html).toContain("investigations");
    for (const inc of incidents) {
      expect(html).toContain(`id="${inc.id}"`);
      expect(html).toContain(`href="#${inc.id}"`);
      expect(html).toContain(`<b>${inc.n}</b> ${inc.title.replace(/'/g, "&#x27;")}`);
      expect(html).toContain(inc.title.replace(/'/g, "&#x27;"));
      expect(html).toContain(inc.kicker.replace(/'/g, "&#x27;"));
      expect(html).toContain(inc.seraphim.limits.replace(/'/g, "&#x27;"));
    }
    for (const sc of scenarios) {
      expect(html).toContain(`id="${sc.id}"`);
      expect(html).toContain(sc.title.replace(/'/g, "&#x27;"));
    }
    for (const u of unverified) {
      expect(html).toContain(u.slice(0, 40).replace(/'/g, "&#x27;"));
    }
  });

  it("handles sources without notes, unresolvable source/ref IDs, and scenarios with empty refs", () => {
    const origRefs = scenarios[0].refs;
    const origLookup = sourcesModule.sourceById;
    const spy = vi.spyOn(sourcesModule, "sourceById").mockImplementation((id: string) => {
      if (id === "oaiAug") return { id: "oaiAug", label: "No-note source", url: "https://openai.com", date: "2026" };
      if (id === "hfDisc" || id === "cs26") return undefined;
      return origLookup(id);
    });
    scenarios[0].refs = [];
    try {
      const html = renderToStaticMarkup(IncidentCaseStudiesPage());
      expect(html).toContain("No-note source");
      expect(html).toContain(scenarios[0].title);
    } finally {
      scenarios[0].refs = origRefs;
      spy.mockRestore();
    }
  });

  it("renders table of contents, premise panel, detailed case breakdown, and hypothetical scenarios controls", () => {
    const html = renderToStaticMarkup(IncidentCaseStudiesPage());
    // Metadata OpenGraph
    expect(incMeta.openGraph).toBeDefined();
    expect((incMeta.openGraph as Record<string, unknown>).type).toBe("article");
    expect(incMeta.openGraph?.url).toBe("/incident-case-studies");

    // TOC
    expect(html).toContain('class="inc-toc"');
    expect(html).toContain('href="#hypothetical-scenarios"');
    expect(html).toContain('href="#not-verified"');

    // Premise panel
    expect(html).toContain('id="premise"');
    expect(html).toContain("Did an AI really hack Hugging Face?");

    // Incident details
    for (const inc of incidents) {
      expect(html).toContain(inc.standing.replace(/'/g, "&#x27;"));
      for (const t of inc.timeline) {
        expect(html).toContain(t.d.replace(/'/g, "&#x27;"));
      }
      for (const d of inc.did) {
        expect(html).toContain(d.replace(/'/g, "&#x27;"));
      }
    }

    // Aside TierCta for seraphim
    expect(html).toContain('aria-label="Seraphim tier"');

    // Hypothetical scenarios
    expect(html).toContain('id="hypothetical-scenarios"');
    expect(html).toContain("Conceptual and educational only.");
    for (const sc of scenarios) {
      expect(html).toContain(sc.target.replace(/'/g, "&#x27;"));
      expect(html).toContain(sc.speed.replace(/'/g, "&#x27;"));
      for (const c of sc.controls) {
        expect(html).toContain(c.replace(/'/g, "&#x27;"));
      }
    }

    // Aside TierCta for thrones
    expect(html).toContain('aria-label="Thrones tier"');

    // How it works panel
    expect(html).toContain('id="how"');
    expect(html).toContain('href="/pricing#terms"');

    // Contact CTA band
    expect(html).toContain('href="/pricing#compare"');
    expect(html).toContain(`mailto:${BRAND_EMAIL}?subject=${BRAND_MAIL}%20scope%20request`);
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
    expect(rootMeta.alternates?.canonical).toBe("/");
    expect(rootMeta.openGraph?.siteName).toBe(BRAND_NAME);
    expect(rootMeta.openGraph?.url).toBe("/");
    expect(rootViewport.colorScheme).toBe("dark light");
  });

  it("enforces canonical URL, OpenGraph siteName/url parity, and description bounds across all routes", async () => {
    const entries = [
      { route: "/", meta: rootMeta },
      { route: "/pricing", meta: pricingMeta },
      { route: "/blog", meta: blogMeta },
      { route: "/case-studies", meta: csMeta },
      { route: "/incident-case-studies", meta: incMeta },
    ];
    for (const post of posts) {
      entries.push({
        route: `/blog/${post.slug}`,
        meta: await postMeta({ params: Promise.resolve({ slug: post.slug }) }),
      });
    }

    for (const { route, meta } of entries) {
      expect(meta.alternates?.canonical, `${route} canonical`).toBe(route);
      expect(typeof meta.description, `${route} description`).toBe("string");
      expect((meta.description as string).length, `${route} description length`).toBeGreaterThanOrEqual(50);
      expect((meta.description as string).length, `${route} description length`).toBeLessThanOrEqual(320);
      expect(meta.openGraph?.siteName, `${route} og:site_name`).toBe(BRAND_NAME);
      expect(meta.openGraph?.url, `${route} og:url`).toBe(route);
      expect(meta.openGraph?.description, `${route} og:description`).toBe(meta.description);
      expect(meta.openGraph?.images, `${route} og:image`).toEqual([
        { url: "/og.png", width: 1200, height: 630, alt: BRAND_NAME },
      ]);
    }
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

  it("omits CodeRain when SHOW_CODE_RAIN is false", async () => {
    vi.resetModules();
    vi.doMock("../lib/brand", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../lib/brand")>();
      return {
        ...actual,
        SHOW_CODE_RAIN: false,
      };
    });
    try {
      const { default: IsolatedRootLayout } = await import("../app/layout");
      const el = IsolatedRootLayout({ children: "no-rain" });
      const [, body] = el.props.children;
      const [, codeRain] = body.props.children;
      expect(codeRain).toBeNull();
    } finally {
      vi.doUnmock("../lib/brand");
      vi.resetModules();
    }
  });
});

describe("Cross-page internal link, anchor (#id), and unique DOM id integrity", () => {
  it("resolves every internal href and #anchor fragment across all pages and ensures no duplicate DOM ids on any page", async () => {
    const routeHtml = new Map<string, string>();
    routeHtml.set("/", renderToStaticMarkup(RootLayout({ children: HomePage() })));
    routeHtml.set("/pricing", renderToStaticMarkup(RootLayout({ children: PricingPage() })));
    routeHtml.set("/blog", renderToStaticMarkup(RootLayout({ children: BlogIndex() })));
    routeHtml.set("/case-studies", renderToStaticMarkup(RootLayout({ children: CaseStudiesPage() })));
    routeHtml.set("/incident-case-studies", renderToStaticMarkup(RootLayout({ children: IncidentCaseStudiesPage() })));
    routeHtml.set("/_not-found", renderToStaticMarkup(RootLayout({ children: NotFound() })));

    for (const post of posts) {
      const postEl = await PostPage({ params: Promise.resolve({ slug: post.slug }) });
      routeHtml.set(`/blog/${post.slug}`, renderToStaticMarkup(RootLayout({ children: postEl })));
    }

    const globalsCss = readFileSync(join(__dirname, "..", "app", "globals.css"), "utf8");
    const definedCssClasses = new Set([
      ...[...globalsCss.matchAll(/\.([a-zA-Z0-9_-]+)/g)].map((m) => m[1]),
      "cs",
      "hero-copy",
      "--font-display",
      "--font-body",
      "--font-mono",
    ]);

    const routeIds = new Map<string, Set<string>>();
    for (const [route, html] of routeHtml.entries()) {
      const ids = new Set<string>();
      for (const m of html.matchAll(/\bid="([^"]+)"/g)) {
        const id = m[1];
        expect(ids.has(id), `${route} has duplicate DOM id="${id}"`).toBe(false);
        ids.add(id);
      }
      routeIds.set(route, ids);
    }

    for (const [sourceRoute, html] of routeHtml.entries()) {
      const pageIds = routeIds.get(sourceRoute)!;
      // Every CSS class emitted in rendered HTML must exist in app/globals.css (or structural/font hooks)
      for (const m of html.matchAll(/\bclass="([^"]+)"/g)) {
        for (const cls of m[1].trim().split(/\s+/)) {
          expect(definedCssClasses.has(cls), `${sourceRoute} uses undefined CSS class ".${cls}"`).toBe(true);
        }
      }
      for (const m of html.matchAll(/<section\b([^>]*)>/g)) {
        expect(
          /\baria-labelledby="[^"]+"|\baria-label="[^"]+"/.test(m[1]),
          `${sourceRoute} <section> missing aria-labelledby or aria-label`
        ).toBe(true);
      }
      for (const m of html.matchAll(/\baria-labelledby="([^"]+)"/g)) {
        for (const refId of m[1].trim().split(/\s+/)) {
          expect(pageIds.has(refId), `${sourceRoute} has aria-labelledby="${refId}" pointing to missing DOM id`).toBe(true);
        }
      }

      // Landmark & heading hierarchy checks (exactly 1 <main>, 1 <h1>, and no skipped heading ranks)
      expect([...html.matchAll(/<main\b/g)].length, `${sourceRoute} <main> count`).toBe(1);
      const headingLevels = [...html.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
      expect(headingLevels.filter((lvl) => lvl === 1).length, `${sourceRoute} <h1> count`).toBe(1);
      expect(headingLevels[0], `${sourceRoute} first heading is h1`).toBe(1);
      for (let i = 1; i < headingLevels.length; i++) {
        expect(
          headingLevels[i] <= headingLevels[i - 1] + 1,
          `${sourceRoute} skips heading rank from h${headingLevels[i - 1]} to h${headingLevels[i]}`
        ).toBe(true);
      }

      // Every <svg> must either be aria-hidden="true" or have role="img" with a non-empty aria-label
      for (const m of html.matchAll(/<svg\b([^>]*)>/g)) {
        const attrs = m[1];
        if (attrs.includes('role="img"')) {
          expect(attrs, `${sourceRoute} svg[role=img] missing aria-label`).toMatch(/\baria-label="[^"]+"/);
        } else {
          expect(attrs, `${sourceRoute} decorative svg missing aria-hidden="true"`).toContain('aria-hidden="true"');
        }
      }

      // Every <table> must have an accessible label/labelledby and every <th> must declare scope="col"|"row"
      for (const m of html.matchAll(/<table\b([^>]*)>/g)) {
        const attrs = m[1];
        expect(
          /\baria-label="[^"]+"|\baria-labelledby="[^"]+"/.test(attrs),
          `${sourceRoute} <table> missing aria-label or aria-labelledby`
        ).toBe(true);
      }
      for (const m of html.matchAll(/<th\b([^>]*)>/g)) {
        expect(m[1], `${sourceRoute} <th> missing scope="col" or scope="row"`).toMatch(/\bscope="(?:col|row)"/);
      }
      for (const m of html.matchAll(/<button\b([^>]*)>/g)) {
        if (m[1].includes('role="radio"')) {
          expect(m[1], `${sourceRoute} role="radio" missing aria-checked`).toMatch(/\baria-checked="(?:true|false)"/);
        }
      }

      // Accessibility: no positive tabindex values (disrupts natural tab order)
      for (const m of html.matchAll(/\btabindex="([^"]+)"/gi)) {
        const val = Number(m[1]);
        expect(val <= 0, `${sourceRoute} has positive tabindex="${m[1]}"`).toBe(true);
      }

      // Accessibility: every heading tag (h1-h6) has non-empty text content
      for (const m of html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
        const text = m[2].replace(/<[^>]+>/g, "").trim();
        expect(text.length, `${sourceRoute} has empty <h${m[1]}>`).toBeGreaterThan(0);
      }

      // Accessibility: every <summary> inside <details> has an accessible label or non-empty inner text
      for (const m of html.matchAll(/<summary\b([^>]*)>([\s\S]*?)<\/summary>/gi)) {
        const attrs = m[1];
        const innerText = m[2].replace(/<[^>]+>/g, "").trim();
        const hasAriaLabel = /\baria-label="[^"]+"/.test(attrs);
        expect(hasAriaLabel || innerText.length > 0, `${sourceRoute} <summary> lacks accessible name`).toBe(true);
      }

      // Accessibility: every <button> has an accessible label or non-empty inner text
      for (const m of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)) {
        const attrs = m[1];
        const innerText = m[2].replace(/<[^>]+>/g, "").trim();
        const hasAriaLabel = /\baria-label="[^"]+"/.test(attrs);
        expect(hasAriaLabel || innerText.length > 0, `${sourceRoute} <button> lacks accessible text`).toBe(true);
      }

      // Accessibility: every <a href> has non-empty accessible text or aria-label
      for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
        const attrs = m[1];
        const innerText = m[2].replace(/<[^>]+>/g, "").trim();
        const hasAriaLabel = /\baria-label="[^"]+"/.test(attrs);
        const hasRoleHidden = /aria-hidden="true"/.test(attrs);
        expect(hasRoleHidden || hasAriaLabel || innerText.length > 0, `${sourceRoute} <a ${attrs}> lacks accessible text`).toBe(true);
      }

      // Copy honesty guardrails: no unverified certification claims anywhere on the site
      expect(html, `${sourceRoute} certification claim`).not.toMatch(/\b(?:SOC\s*2|ISO\s*27001|FedRAMP|PCI-DSS)\b/i);
      // No empty <ul> or <ol> elements on any page
      expect(html, `${sourceRoute} empty list`).not.toMatch(/<(?:ul|ol)\b[^>]*>\s*<\/(?:ul|ol)>/);

      for (const m of html.matchAll(/<a\b([^>]+)>/g)) {
        const attrs = m[1];
        const hrefMatch = attrs.match(/\bhref="([^"]+)"/);
        if (!hrefMatch) continue;
        const href = hrefMatch[1];
        if (href.startsWith("mailto:")) {
          expect(href.startsWith(`mailto:${BRAND_EMAIL}`), `${sourceRoute} unexpected mailto "${href}"`).toBe(true);
          expect(href, `${sourceRoute} unencoded whitespace in mailto "${href}"`).not.toMatch(/\s/);
        } else if (href.startsWith("http://") || href.startsWith("https://")) {
          expect(href.startsWith("https://"), `${sourceRoute} insecure external href "${href}"`).toBe(true);
          expect(attrs, `${sourceRoute} external link "${href}" missing target="_blank"`).toContain('target="_blank"');
          expect(attrs, `${sourceRoute} external link "${href}" missing rel="noopener noreferrer"`).toContain(
            'rel="noopener noreferrer"'
          );
        }
      }

      for (const m of html.matchAll(/\bhref="([^"]+)"/g)) {
        const href = m[1];
        if (href.startsWith("mailto:") || href.startsWith("https://") || href.startsWith("http://")) {
          continue;
        }
        expect(href.startsWith("/") || href.startsWith("#"), `${sourceRoute} invalid href "${href}"`).toBe(true);

        const [rawPath, hash] = href.split("#");
        expect(rawPath).not.toBe("/_not-found");
        const targetRoute = rawPath === "" ? sourceRoute : rawPath;
        expect(routeHtml.has(targetRoute), `${sourceRoute} links to unknown route "${targetRoute}" (from "${href}")`).toBe(true);

        if (hash) {
          const targetSet = routeIds.get(targetRoute);
          expect(targetSet?.has(hash), `${sourceRoute} links to missing #${hash} on "${targetRoute}" (from "${href}")`).toBe(true);
        }
      }
    }

    // Also verify that every .url returned by API index endpoints resolves to a rendered route and DOM id
    const apiUrls: string[] = [
      ...((await postsApi().json()).posts as { url: string }[]).map((p) => p.url),
      ...((await incidentsApi().json()).incidents as { url: string }[]).map((i) => i.url),
      ...((await scenariosApi().json()).scenarios as { url: string }[]).map((s) => s.url),
      ...((await caseStudiesApi().json()).findings as { url: string }[]).map((f) => f.url),
      ...((await tiersApi().json()).tiers as { url: string }[]).map((t) => t.url),
    ];
    expect(apiUrls.length).toBe(posts.length + incidents.length + scenarios.length + findings.length + tiers.length);
    for (const url of apiUrls) {
      const [targetRoute, hash] = url.split("#");
      expect(routeHtml.has(targetRoute), `API item url "${url}" points to unknown route "${targetRoute}"`).toBe(true);
      if (hash) {
        expect(routeIds.get(targetRoute)?.has(hash), `API item url "${url}" points to missing #${hash}`).toBe(true);
      }
    }
  });
});

describe("App Router page and layout export contracts", () => {
  const APP_DIR = join(__dirname, "..", "app");
  const ALLOWED_SEGMENT_EXPORTS = new Set([
    "default",
    "metadata",
    "generateMetadata",
    "generateStaticParams",
    "viewport",
    "generateViewport",
    "dynamic",
    "dynamicParams",
    "revalidate",
    "fetchCache",
    "runtime",
    "preferredRegion",
    "maxDuration",
  ]);

  function findSegmentFiles(dir: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) out.push(...findSegmentFiles(full));
      else if (name === "page.tsx" || name === "layout.tsx" || name === "not-found.tsx") out.push(full);
    }
    return out;
  }

  it("every page, layout, and not-found module exports a default component and only Next.js allowed segment fields", async () => {
    const files = findSegmentFiles(APP_DIR);
    expect(files.length).toBeGreaterThanOrEqual(8);
    for (const file of files) {
      const mod = (await import(pathToFileURL(file).href)) as Record<string, unknown>;
      expect(typeof mod.default, `${file} default export`).toBe("function");
      for (const key of Object.keys(mod)) {
        expect(ALLOWED_SEGMENT_EXPORTS.has(key), `${file} unexpected export "${key}"`).toBe(true);
      }
    }
  });

  it("sitemap.ts covers every page.tsx route on disk (including expanded generateStaticParams) with zero duplicates", async () => {
    const pageFiles = findSegmentFiles(APP_DIR).filter((f) => f.endsWith(`${sep}page.tsx`));
    const expectedUrls: string[] = [];

    for (const file of pageFiles) {
      const segments = relative(APP_DIR, file).split(sep).slice(0, -1);
      const routePattern = "/" + segments.join("/");
      const dynMatch = routePattern.match(/\[(\w+)\]/);
      if (dynMatch) {
        const paramKey = dynMatch[1];
        const mod = (await import(pathToFileURL(file).href)) as {
          generateStaticParams?: () => Record<string, string>[];
        };
        expect(typeof mod.generateStaticParams, `${file} generateStaticParams`).toBe("function");
        for (const p of mod.generateStaticParams!()) {
          expectedUrls.push(`${SITE_URL}${routePattern.replace(`[${paramKey}]`, p[paramKey])}`);
        }
      } else {
        expectedUrls.push(routePattern === "/" ? SITE_URL : `${SITE_URL}${routePattern}`);
      }
    }

    const sitemapEntries = sitemap();
    const sitemapUrls = sitemapEntries.map((e) => e.url);
    expect(new Set(sitemapUrls).size).toBe(sitemapUrls.length);
    expect([...sitemapUrls].sort()).toEqual([...expectedUrls].sort());
  });
});

describe("WCAG 2.1 AA Accessibility & Landmark Integrity across all routes", () => {
  it("enforces skip-links, interactive element labeling, keyboard navigability, and table/svg accessibility", async () => {
    const routeHtml = new Map<string, string>();
    routeHtml.set("/", renderToStaticMarkup(RootLayout({ children: HomePage() })));
    routeHtml.set("/pricing", renderToStaticMarkup(RootLayout({ children: PricingPage() })));
    routeHtml.set("/blog", renderToStaticMarkup(RootLayout({ children: BlogIndex() })));
    routeHtml.set("/case-studies", renderToStaticMarkup(RootLayout({ children: CaseStudiesPage() })));
    routeHtml.set("/incident-case-studies", renderToStaticMarkup(RootLayout({ children: IncidentCaseStudiesPage() })));
    routeHtml.set("/_not-found", renderToStaticMarkup(RootLayout({ children: NotFound() })));

    for (const post of posts) {
      const postEl = await PostPage({ params: Promise.resolve({ slug: post.slug }) });
      routeHtml.set(`/blog/${post.slug}`, renderToStaticMarkup(RootLayout({ children: postEl })));
    }

    for (const [sourceRoute, html] of routeHtml.entries()) {
      // 1. Skip link targets existing element with substantive content
      expect(html).toContain('href="#main"');
      expect(html).toContain('id="main"');

      // 2. Exact landmark counts: 1 <main>, 1 <h1>, and 1 <nav aria-label="Main">
      expect([...html.matchAll(/<main\b/g)].length, `${sourceRoute} main count`).toBe(1);
      expect([...html.matchAll(/<h1\b/g)].length, `${sourceRoute} h1 count`).toBe(1);
      expect([...html.matchAll(/<nav\b[^>]*aria-label="Main"/g)].length, `${sourceRoute} nav main count`).toBe(1);

      // 3. No empty headings
      for (const m of html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
        const text = m[2].replace(/<[^>]+>/g, "").trim();
        expect(text.length, `${sourceRoute} has empty <h${m[1]}>`).toBeGreaterThan(0);
      }

      // 4. Tabindex: no positive tabindex values anywhere
      for (const m of html.matchAll(/\btabindex="([^"]+)"/gi)) {
        const val = Number(m[1]);
        expect(val <= 0, `${sourceRoute} positive tabindex`).toBe(true);
      }

      // 5. Interactive controls have accessible name
      for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
        const attrs = m[1];
        const innerText = m[2].replace(/<[^>]+>/g, "").trim();
        const hasAriaLabel = /\baria-label="[^"]+"/.test(attrs);
        const isHidden = /aria-hidden="true"/.test(attrs);
        expect(isHidden || hasAriaLabel || innerText.length > 0, `${sourceRoute} <a ${attrs}> lacks accessible text`).toBe(true);
      }
      for (const m of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)) {
        const attrs = m[1];
        const innerText = m[2].replace(/<[^>]+>/g, "").trim();
        const hasAriaLabel = /\baria-label="[^"]+"/.test(attrs);
        expect(hasAriaLabel || innerText.length > 0, `${sourceRoute} <button> lacks accessible text`).toBe(true);
      }
      for (const m of html.matchAll(/<summary\b([^>]*)>([\s\S]*?)<\/summary>/gi)) {
        const attrs = m[1];
        const innerText = m[2].replace(/<[^>]+>/g, "").trim();
        const hasAriaLabel = /\baria-label="[^"]+"/.test(attrs);
        expect(hasAriaLabel || innerText.length > 0, `${sourceRoute} <summary> lacks accessible name`).toBe(true);
      }

      // 6. Visual elements (svg, canvas) have accessibility attributes
      for (const m of html.matchAll(/<svg\b([^>]*)>/gi)) {
        const attrs = m[1];
        if (attrs.includes('role="img"')) {
          expect(attrs, `${sourceRoute} svg[role=img]`).toMatch(/\baria-label="[^"]+"/);
        } else {
          expect(attrs, `${sourceRoute} decorative svg`).toContain('aria-hidden="true"');
        }
      }
      for (const m of html.matchAll(/<canvas\b([^>]*)>/gi)) {
        const attrs = m[1];
        expect(attrs, `${sourceRoute} canvas`).toContain('aria-hidden="true"');
      }

      // 7. Tables have label/labelledby and headers have scope
      for (const m of html.matchAll(/<table\b([^>]*)>/gi)) {
        expect(/\baria-label="[^"]+"|\baria-labelledby="[^"]+"/.test(m[1]), `${sourceRoute} table label`).toBe(true);
      }
      for (const m of html.matchAll(/<th\b([^>]*)>/gi)) {
        expect(m[1], `${sourceRoute} th scope`).toMatch(/\bscope="(?:col|row)"/);
      }
    }
  });
});
