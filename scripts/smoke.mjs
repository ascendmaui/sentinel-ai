#!/usr/bin/env node
// Black-box smoke test against a running server: node scripts/smoke.mjs [baseUrl]
// Checks pages, API contracts, error handling, and that every internal link on every page resolves.
const base = (process.argv[2] || process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const failures = [];
const check = (ok, msg) => { if (!ok) { failures.push(msg); console.error(`FAIL ${msg}`); } else console.log(`ok   ${msg}`); };
const get = (path, init) => fetch(base + path, { redirect: "manual", ...init });

const pages = ["/", "/pricing", "/blog", "/case-studies", "/incident-case-studies"];
const seen = new Set(pages);

const checkSecurityHeaders = (r, label) => {
  check(r.headers.get("x-content-type-options") === "nosniff", `${label} nosniff header`);
  check(r.headers.get("x-frame-options") === "DENY", `${label} X-Frame-Options DENY`);
  check(r.headers.get("referrer-policy") === "no-referrer", `${label} Referrer-Policy no-referrer`);
  check(r.headers.get("x-dns-prefetch-control") === "off", `${label} X-DNS-Prefetch-Control off`);
  check(Boolean(r.headers.get("permissions-policy")?.includes("camera=()")), `${label} Permissions-Policy camera=()`);
};

// 1. Health check & HEAD requests
const h = await get("/api/health");
const hBody = await h.json();
check(h.status === 200 && hBody.status === "ok" && typeof hBody.timestamp === "string", "GET /api/health ok with timestamp");
check(h.headers.get("cache-control") === "no-store", "/api/health is not cacheable");
checkSecurityHeaders(h, "GET /api/health");

const headHealth = await get("/api/health", { method: "HEAD" });
check(headHealth.status === 200, "HEAD /api/health -> 200");
checkSecurityHeaders(headHealth, "HEAD /api/health");

const headBrand = await get("/api/brand", { method: "HEAD" });
check(headBrand.status === 200, "HEAD /api/brand -> 200");
checkSecurityHeaders(headBrand, "HEAD /api/brand");

const headPosts = await get("/api/posts", { method: "HEAD" });
check(headPosts.status === 200, "HEAD /api/posts -> 200");
checkSecurityHeaders(headPosts, "HEAD /api/posts");

// 2. Posts API
const postsRes = await get("/api/posts");
checkSecurityHeaders(postsRes, "GET /api/posts");
const posts = await postsRes.json();
check(Array.isArray(posts.posts) && posts.count === posts.posts.length && posts.count > 0, "GET /api/posts shape");
for (const p of posts.posts) { pages.push(p.url); seen.add(p.url); }

const headPostOne = await get(`/api/posts/${posts.posts[0].slug}`, { method: "HEAD" });
check(headPostOne.status === 200, `HEAD /api/posts/${posts.posts[0].slug} -> 200`);
checkSecurityHeaders(headPostOne, `HEAD /api/posts/${posts.posts[0].slug}`);

const filteredPosts = await (await get("/api/posts?tier=seraphim")).json();
check(filteredPosts.count > 0 && filteredPosts.posts.every(p => p.tier === "seraphim"), "GET /api/posts?tier=seraphim filter");

const qPosts = await (await get("/api/posts?q=openai")).json();
check(qPosts.count > 0 && qPosts.posts.every(p => p.title.toLowerCase().includes("openai") || p.description.toLowerCase().includes("openai") || p.slug.includes("openai")), "GET /api/posts?q=openai filter");

const limitedPosts = await (await get("/api/posts?limit=2")).json();
check(limitedPosts.count === 2 && limitedPosts.posts.length === 2 && limitedPosts.totalCount === posts.posts.length, "GET /api/posts?limit=2");

const badLimitPosts = await (await get("/api/posts?limit=0")).json();
check(badLimitPosts.count === posts.posts.length, "GET /api/posts?limit=0 ignores invalid limit");

for (const p of posts.posts) {
  const r = await get(`/api/posts/${p.slug}`);
  const b = await r.json();
  check(r.status === 200 && b.slug === p.slug && b.sources.every(Boolean), `GET /api/posts/${p.slug}`);
}
const upperPost = await get(`/api/posts/${posts.posts[0].slug.toUpperCase()}`);
check(upperPost.status === 200, `GET /api/posts/${posts.posts[0].slug.toUpperCase()} (case-insensitive)`);
const missingPost = await get("/api/posts/does-not-exist");
check(missingPost.status === 404 && (await missingPost.json()).error === "not_found", "unknown post -> JSON 404");
checkSecurityHeaders(missingPost, "404 unknown post");
check((await get("/blog/does-not-exist")).status === 404, "unknown blog page -> 404");

// 3. Incidents API
const headIncs = await get("/api/incidents", { method: "HEAD" });
check(headIncs.status === 200, "HEAD /api/incidents -> 200");
checkSecurityHeaders(headIncs, "HEAD /api/incidents");
const incsRes = await get("/api/incidents");
checkSecurityHeaders(incsRes, "GET /api/incidents");
const incs = await incsRes.json();
check(Array.isArray(incs.incidents) && incs.count === incs.incidents.length && incs.count > 0, "GET /api/incidents shape");
check(Array.isArray(incs.unverified) && incs.unverified.length > 0, "GET /api/incidents returns unverified claims");

const headIncOne = await get(`/api/incidents/${incs.incidents[0].id}`, { method: "HEAD" });
check(headIncOne.status === 200, `HEAD /api/incidents/${incs.incidents[0].id} -> 200`);
checkSecurityHeaders(headIncOne, `HEAD /api/incidents/${incs.incidents[0].id}`);

const limitedIncs = await (await get("/api/incidents?limit=2")).json();
check(limitedIncs.count === 2 && limitedIncs.incidents.length === 2, "GET /api/incidents?limit=2");

const qIncs = await (await get("/api/incidents?q=artifactory")).json();
check(qIncs.count > 0, "GET /api/incidents?q=artifactory filter");

for (const inc of incs.incidents) {
  const r = await get(`/api/incidents/${inc.id}`);
  const b = await r.json();
  check(r.status === 200 && b.id === inc.id && Array.isArray(b.timeline), `GET /api/incidents/${inc.id}`);
}
const upperInc = await get(`/api/incidents/${incs.incidents[0].id.toUpperCase()}`);
check(upperInc.status === 200, `GET /api/incidents/${incs.incidents[0].id.toUpperCase()} (case-insensitive)`);
const missingInc = await get("/api/incidents/does-not-exist");
check(missingInc.status === 404 && (await missingInc.json()).error === "not_found", "unknown incident -> JSON 404");
checkSecurityHeaders(missingInc, "404 unknown incident");

// 4. Case Studies API
const headCs = await get("/api/case-studies", { method: "HEAD" });
check(headCs.status === 200, "HEAD /api/case-studies -> 200");
checkSecurityHeaders(headCs, "HEAD /api/case-studies");
const csRes = await get("/api/case-studies");
checkSecurityHeaders(csRes, "GET /api/case-studies");
const cs = await csRes.json();
check(Array.isArray(cs.findings) && cs.count === cs.findings.length && cs.count > 0, "GET /api/case-studies shape");
const csCrit = await (await get("/api/case-studies?severity=Critical")).json();
check(Array.isArray(csCrit.findings) && csCrit.findings.every(f => f.severity === "Critical"), "GET /api/case-studies?severity=Critical filter");

const limitedCs = await (await get("/api/case-studies?limit=2")).json();
check(limitedCs.count === 2 && limitedCs.findings.length === 2, "GET /api/case-studies?limit=2");

const qCs = await (await get("/api/case-studies?q=scheduled")).json();
check(qCs.count > 0, "GET /api/case-studies?q=scheduled filter");

const csOne = await get("/api/case-studies/f-01");
const csOneBody = await csOne.json();
check(csOne.status === 200 && csOneBody.id === "F-01" && csOneBody.remediation?.id === "F-01", "GET /api/case-studies/f-01 (case-insensitive with remediation)");
const csOneUpper = await get("/api/case-studies/F-01");
check(csOneUpper.status === 200 && (await csOneUpper.json()).id === "F-01", "GET /api/case-studies/F-01 (uppercase)");

const headCsOne = await get("/api/case-studies/f-01", { method: "HEAD" });
check(headCsOne.status === 200, "HEAD /api/case-studies/f-01 -> 200");
checkSecurityHeaders(headCsOne, "HEAD /api/case-studies/f-01");

const missingCs = await get("/api/case-studies/f-999");
check(missingCs.status === 404 && (await missingCs.json()).error === "not_found", "unknown case study -> JSON 404");
checkSecurityHeaders(missingCs, "404 unknown case study");

// 5. Tiers API
const headTiers = await get("/api/tiers", { method: "HEAD" });
check(headTiers.status === 200, "HEAD /api/tiers -> 200");
checkSecurityHeaders(headTiers, "HEAD /api/tiers");
const tiersHttpRes = await get("/api/tiers");
checkSecurityHeaders(tiersHttpRes, "GET /api/tiers");
const tiersRes = await tiersHttpRes.json();
check(Array.isArray(tiersRes.tiers) && tiersRes.count === 4, "GET /api/tiers shape");

const limitedTiers = await (await get("/api/tiers?limit=2")).json();
check(limitedTiers.count === 2 && limitedTiers.tiers.length === 2, "GET /api/tiers?limit=2");

const qTiers = await (await get("/api/tiers?q=cherubim")).json();
check(qTiers.count === 1 && qTiers.tiers[0].id === "cherubim", "GET /api/tiers?q=cherubim filter");

const tierOne = await get("/api/tiers/seraphim");
check(tierOne.status === 200 && (await tierOne.json()).name === "Seraphim", "GET /api/tiers/seraphim");
const tierUpper = await get("/api/tiers/SERAPHIM");
check(tierUpper.status === 200 && (await tierUpper.json()).name === "Seraphim", "GET /api/tiers/SERAPHIM (case-insensitive)");

const headTierOne = await get("/api/tiers/seraphim", { method: "HEAD" });
check(headTierOne.status === 200, "HEAD /api/tiers/seraphim -> 200");
checkSecurityHeaders(headTierOne, "HEAD /api/tiers/seraphim");

const missingTier = await get("/api/tiers/does-not-exist");
check(missingTier.status === 404 && (await missingTier.json()).error === "not_found", "unknown tier -> JSON 404");
checkSecurityHeaders(missingTier, "404 unknown tier");

// 6. Scenarios API
const headSc = await get("/api/scenarios", { method: "HEAD" });
check(headSc.status === 200, "HEAD /api/scenarios -> 200");
checkSecurityHeaders(headSc, "HEAD /api/scenarios");
const scHttpRes = await get("/api/scenarios");
checkSecurityHeaders(scHttpRes, "GET /api/scenarios");
const scRes = await scHttpRes.json();
check(Array.isArray(scRes.scenarios) && scRes.count > 0, "GET /api/scenarios shape");
const scFiltered = await (await get("/api/scenarios?q=domain")).json();
check(scFiltered.count === 1 && scFiltered.scenarios[0].id === "onprem-domain", "GET /api/scenarios?q=domain filter");

const limitedSc = await (await get("/api/scenarios?limit=2")).json();
check(limitedSc.count === 2 && limitedSc.scenarios.length === 2, "GET /api/scenarios?limit=2");

const scOne = await get("/api/scenarios/legacy-internal-app");
check(scOne.status === 200 && (await scOne.json()).id === "legacy-internal-app", "GET /api/scenarios/legacy-internal-app");
const scUpper = await get("/api/scenarios/LEGACY-INTERNAL-APP");
check(scUpper.status === 200 && (await scUpper.json()).id === "legacy-internal-app", "GET /api/scenarios/LEGACY-INTERNAL-APP (case-insensitive)");

const headScOne = await get("/api/scenarios/legacy-internal-app", { method: "HEAD" });
check(headScOne.status === 200, "HEAD /api/scenarios/legacy-internal-app -> 200");
checkSecurityHeaders(headScOne, "HEAD /api/scenarios/legacy-internal-app");

const missingSc = await get("/api/scenarios/does-not-exist");
check(missingSc.status === 404 && (await missingSc.json()).error === "not_found", "unknown scenario -> JSON 404");
checkSecurityHeaders(missingSc, "404 unknown scenario");

// 7. Sources API
const headSrc = await get("/api/sources", { method: "HEAD" });
check(headSrc.status === 200, "HEAD /api/sources -> 200");
checkSecurityHeaders(headSrc, "HEAD /api/sources");
const srcHttpRes = await get("/api/sources");
checkSecurityHeaders(srcHttpRes, "GET /api/sources");
const srcRes = await srcHttpRes.json();
check(Array.isArray(srcRes.sources) && srcRes.count > 0, "GET /api/sources shape");
const srcFiltered = await (await get("/api/sources?year=2026")).json();
check(srcFiltered.count > 0 && srcFiltered.sources.every(s => s.date.includes("2026")), "GET /api/sources?year=2026 filter");

const limitedSrc = await (await get("/api/sources?limit=2")).json();
check(limitedSrc.count === 2 && limitedSrc.sources.length === 2, "GET /api/sources?limit=2");

const qSrc = await (await get("/api/sources?q=openai")).json();
check(qSrc.count > 0, "GET /api/sources?q=openai filter");

const srcOne = await get("/api/sources/oaiAug");
check(srcOne.status === 200 && (await srcOne.json()).id === "oaiAug", "GET /api/sources/oaiAug");
const srcUpper = await get("/api/sources/OAIAUG");
check(srcUpper.status === 200 && (await srcUpper.json()).id === "oaiAug", "GET /api/sources/OAIAUG (case-insensitive)");

const headSrcOne = await get("/api/sources/oaiAug", { method: "HEAD" });
check(headSrcOne.status === 200, "HEAD /api/sources/oaiAug -> 200");
checkSecurityHeaders(headSrcOne, "HEAD /api/sources/oaiAug");

const missingSrc = await get("/api/sources/does-not-exist");
check(missingSrc.status === 404 && (await missingSrc.json()).error === "not_found", "unknown source -> JSON 404");
checkSecurityHeaders(missingSrc, "404 unknown source");

// 8. Brand API
const brandRes = await get("/api/brand");
const brandBody = await brandRes.json();
check(brandRes.status === 200 && brandBody.name === "Seraphim AI" && Array.isArray(brandBody.badges) && brandBody.badges.length > 0, "GET /api/brand shape and badges");
check(brandBody.theme?.default === "dark" && Array.isArray(brandBody.theme?.names) && brandBody.theme.names.includes("dark"), "GET /api/brand theme structure");
checkSecurityHeaders(brandRes, "GET /api/brand");

// 9. Method Not Allowed on API endpoints (Next.js route handlers return 405 for unexported methods)
const endpoints405 = [
  "/api/health",
  "/api/brand",
  "/api/posts",
  "/api/incidents",
  "/api/case-studies",
  "/api/scenarios",
  "/api/sources",
  "/api/tiers",
];
for (const endpoint of endpoints405) {
  const postRes = await get(endpoint, { method: "POST" });
  check(postRes.status === 405, `POST ${endpoint} -> 405`);
  const putRes = await get(endpoint, { method: "PUT" });
  check(putRes.status === 405, `PUT ${endpoint} -> 405`);
  const delRes = await get(endpoint, { method: "DELETE" });
  check(delRes.status === 405, `DELETE ${endpoint} -> 405`);
}

// 10. Robots, Sitemap, and Static Assets
const headRobots = await get("/robots.txt", { method: "HEAD" });
check(headRobots.status === 200, "HEAD /robots.txt -> 200");
const robotsRes = await get("/robots.txt");
check(robotsRes.status === 200 && (await robotsRes.text()).includes("sitemap.xml"), "GET /robots.txt ok");

const headSitemap = await get("/sitemap.xml", { method: "HEAD" });
check(headSitemap.status === 200, "HEAD /sitemap.xml -> 200");
const sitemapRes = await get("/sitemap.xml");
check(sitemapRes.status === 200 && (await sitemapRes.text()).includes("urlset"), "GET /sitemap.xml ok");

const iconRes = await get("/icon.svg");
check(iconRes.status === 200 && (await iconRes.text()).includes("<svg"), "GET /icon.svg returns SVG");

// 11. Crawl internal page links

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
