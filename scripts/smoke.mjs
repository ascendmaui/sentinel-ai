#!/usr/bin/env node
// Black-box smoke test against a running server: node scripts/smoke.mjs [baseUrl]
// Checks pages, API contracts, error handling, and that every internal link on every page resolves.
const base = (process.argv[2] || process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const failures = [];
const check = (ok, msg) => { if (!ok) { failures.push(msg); console.error(`FAIL ${msg}`); } else console.log(`ok   ${msg}`); };
const get = (path, init) => fetch(base + path, { redirect: "manual", ...init });

const pages = ["/", "/pricing", "/blog", "/case-studies", "/incident-case-studies"];
const seen = new Set(pages);

// 1. Health check
const h = await get("/api/health");
const hBody = await h.json();
check(h.status === 200 && hBody.status === "ok" && typeof hBody.timestamp === "string", "GET /api/health ok with timestamp");
check(h.headers.get("cache-control") === "no-store", "/api/health is not cacheable");
check(h.headers.get("x-content-type-options") === "nosniff", "/api/health nosniff header");

const post = await get("/api/health", { method: "POST" });
check(post.status === 405, "POST /api/health -> 405");

// 2. Posts API
const posts = await (await get("/api/posts")).json();
check(Array.isArray(posts.posts) && posts.count === posts.posts.length && posts.count > 0, "GET /api/posts shape");
for (const p of posts.posts) { pages.push(p.url); seen.add(p.url); }

const filteredPosts = await (await get("/api/posts?tier=seraphim")).json();
check(filteredPosts.count > 0 && filteredPosts.posts.every(p => p.tier === "seraphim"), "GET /api/posts?tier=seraphim filter");

for (const p of posts.posts) {
  const r = await get(`/api/posts/${p.slug}`);
  const b = await r.json();
  check(r.status === 200 && b.slug === p.slug && b.sources.every(Boolean), `GET /api/posts/${p.slug}`);
}
const missingPost = await get("/api/posts/does-not-exist");
check(missingPost.status === 404 && (await missingPost.json()).error === "not_found", "unknown post -> JSON 404");
check((await get("/blog/does-not-exist")).status === 404, "unknown blog page -> 404");

// 3. Incidents API
const incs = await (await get("/api/incidents")).json();
check(Array.isArray(incs.incidents) && incs.count === incs.incidents.length && incs.count > 0, "GET /api/incidents shape");
check(Array.isArray(incs.unverified) && incs.unverified.length > 0, "GET /api/incidents returns unverified claims");
for (const inc of incs.incidents) {
  const r = await get(`/api/incidents/${inc.id}`);
  const b = await r.json();
  check(r.status === 200 && b.id === inc.id && Array.isArray(b.timeline), `GET /api/incidents/${inc.id}`);
}
const missingInc = await get("/api/incidents/does-not-exist");
check(missingInc.status === 404 && (await missingInc.json()).error === "not_found", "unknown incident -> JSON 404");

// 4. Case Studies API
const cs = await (await get("/api/case-studies")).json();
check(Array.isArray(cs.findings) && cs.count === cs.findings.length && cs.count > 0, "GET /api/case-studies shape");
const csCrit = await (await get("/api/case-studies?severity=Critical")).json();
check(Array.isArray(csCrit.findings) && csCrit.findings.every(f => f.severity === "Critical"), "GET /api/case-studies?severity=Critical filter");
const csOne = await get("/api/case-studies/f-01");
const csOneBody = await csOne.json();
check(csOne.status === 200 && csOneBody.id === "F-01" && csOneBody.remediation?.id === "F-01", "GET /api/case-studies/f-01 (case-insensitive with remediation)");
const missingCs = await get("/api/case-studies/f-999");
check(missingCs.status === 404 && (await missingCs.json()).error === "not_found", "unknown case study -> JSON 404");

// 5. Tiers API
const tiersRes = await (await get("/api/tiers")).json();
check(Array.isArray(tiersRes.tiers) && tiersRes.count === 4, "GET /api/tiers shape");
const tierOne = await get("/api/tiers/seraphim");
check(tierOne.status === 200 && (await tierOne.json()).name === "Seraphim", "GET /api/tiers/seraphim");
const missingTier = await get("/api/tiers/does-not-exist");
check(missingTier.status === 404 && (await missingTier.json()).error === "not_found", "unknown tier -> JSON 404");

// 6. Scenarios API
const scRes = await (await get("/api/scenarios")).json();
check(Array.isArray(scRes.scenarios) && scRes.count > 0, "GET /api/scenarios shape");
const scFiltered = await (await get("/api/scenarios?q=domain")).json();
check(scFiltered.count === 1 && scFiltered.scenarios[0].id === "onprem-domain", "GET /api/scenarios?q=domain filter");
const scOne = await get("/api/scenarios/legacy-internal-app");
check(scOne.status === 200 && (await scOne.json()).id === "legacy-internal-app", "GET /api/scenarios/legacy-internal-app");
const missingSc = await get("/api/scenarios/does-not-exist");
check(missingSc.status === 404 && (await missingSc.json()).error === "not_found", "unknown scenario -> JSON 404");

// 7. Sources API
const srcRes = await (await get("/api/sources")).json();
check(Array.isArray(srcRes.sources) && srcRes.count > 0, "GET /api/sources shape");
const srcFiltered = await (await get("/api/sources?year=2026")).json();
check(srcFiltered.count > 0 && srcFiltered.sources.every(s => s.date.includes("2026")), "GET /api/sources?year=2026 filter");
const srcOne = await get("/api/sources/oaiAug");
check(srcOne.status === 200 && (await srcOne.json()).id === "oaiAug", "GET /api/sources/oaiAug");
const missingSrc = await get("/api/sources/does-not-exist");
check(missingSrc.status === 404 && (await missingSrc.json()).error === "not_found", "unknown source -> JSON 404");

// 8. Brand API
const brandRes = await get("/api/brand");
const brandBody = await brandRes.json();
check(brandRes.status === 200 && brandBody.name === "Seraphim AI" && Array.isArray(brandBody.badges) && brandBody.badges.length > 0, "GET /api/brand shape and badges");
check(brandRes.headers.get("x-frame-options") === "DENY", "/api/brand X-Frame-Options DENY");
check(brandRes.headers.get("x-dns-prefetch-control") === "off", "/api/brand X-DNS-Prefetch-Control off");

// 9. Robots and Sitemap
const robotsRes = await get("/robots.txt");
check(robotsRes.status === 200 && (await robotsRes.text()).includes("sitemap.xml"), "GET /robots.txt ok");
const sitemapRes = await get("/sitemap.xml");
check(sitemapRes.status === 200 && (await sitemapRes.text()).includes("urlset"), "GET /sitemap.xml ok");

// 10. Crawl internal page links

const links = new Set();
for (const path of pages) {
  const r = await get(path);
  check(r.status === 200, `GET ${path} -> 200`);
  const html = await r.text();
  for (const m of html.matchAll(/href="(\/[^"#?]*)(?:[#?][^"]*)?"/g)) links.add(m[1]);
}
for (const l of links) {
  if (seen.has(l) || l.startsWith("/_next/")) continue;
  const r = await get(l);
  check(r.status === 200, `internal link ${l} resolves (${r.status})`);
}

if (failures.length) { console.error(`\n${failures.length} smoke check(s) failed`); process.exit(1); }
console.log("\nall smoke checks passed");
