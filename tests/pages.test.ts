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
import { BRAND_EMAIL, BRAND_NAME, SITE_URL } from "../lib/brand";
import { findings, remediation, severityCounts } from "../lib/caseStudies";
import { INCIDENTS_DISCLAIMER, incidents, scenarios, unverified } from "../lib/incidents";
import * as postsModule from "../lib/posts";
import { posts } from "../lib/posts";
import * as sourcesModule from "../lib/sources";
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
    // No published dollar prices on /pricing
    expect(html).not.toMatch(/\$\s*\d/);
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
      expect(html).toContain(`<time dateTime="${post.date}">${post.date}</time>`);
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

      // Copy honesty guardrails: no unverified certification claims anywhere on the site
      expect(html, `${sourceRoute} certification claim`).not.toMatch(/\b(?:SOC\s*2|ISO\s*27001|FedRAMP|PCI-DSS)\b/i);

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
