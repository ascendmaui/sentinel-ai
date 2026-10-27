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
  check(r.headers.get("x-powered-by") === null, `${label} omits X-Powered-By`);
};

// 1. Health check & HEAD requests
let h;
try {
  h = await get("/api/health");
} catch (err) {
  console.error(`Cannot connect to server at ${base}: ${err.message}.\nIs the Next.js server running? (Try: npm run build && npm start)`);
  process.exit(1);
}
let hBody;
try {
  hBody = await h.json();
} catch (err) {
  console.error(`Endpoint /api/health at ${base} did not return JSON. Is another service on this port?\nStatus: ${h.status}`);
  process.exit(1);
}
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

const qPostsDate = await (await get("/api/posts?q=2026")).json();
check(qPostsDate.count === posts.posts.length, "GET /api/posts?q=2026 date search");

const yearPosts = await (await get("/api/posts?year=2026")).json();
check(yearPosts.count === posts.posts.length && yearPosts.posts.every(p => p.date.startsWith("2026")), "GET /api/posts?year=2026 filter");

const sourcePosts = await (await get("/api/posts?source=oaiAug")).json();
check(sourcePosts.count > 0, "GET /api/posts?source=oaiAug filter");

const limitedPosts = await (await get("/api/posts?limit=2")).json();
check(limitedPosts.count === 2 && limitedPosts.posts.length === 2 && limitedPosts.totalCount === posts.posts.length, "GET /api/posts?limit=2");

const takePosts = await (await get("/api/posts?take=2")).json();
check(takePosts.count === 2 && takePosts.posts.length === 2 && takePosts.totalCount === posts.posts.length, "GET /api/posts?take=2 (take alias)");

const slugPosts = await (await get("/api/posts?slug=when-the-test-subject-leaves-the-test")).json();
check(slugPosts.count === 1 && slugPosts.posts[0].slug === "when-the-test-subject-leaves-the-test", "GET /api/posts?slug=... filter");

const idPosts = await (await get("/api/posts?id=when-the-test-subject-leaves-the-test")).json();
check(idPosts.count === 1 && idPosts.posts[0].slug === "when-the-test-subject-leaves-the-test", "GET /api/posts?id=... filter");

const offsetPosts = await (await get("/api/posts?offset=1&limit=2")).json();
check(offsetPosts.count === 2 && offsetPosts.posts.length === 2 && offsetPosts.totalCount === posts.posts.length, "GET /api/posts?offset=1&limit=2");

const badLimitPosts = await (await get("/api/posts?limit=0")).json();
check(badLimitPosts.count === posts.posts.length, "GET /api/posts?limit=0 ignores invalid limit");

const pagePosts = await (await get("/api/posts?page=2&limit=2")).json();
check(pagePosts.count === 2 && pagePosts.posts.length === 2, "GET /api/posts?page=2&limit=2 (page pagination)");

const ascPosts = await (await get("/api/posts?order=asc")).json();
check(ascPosts.count === posts.posts.length && ascPosts.posts[0].date <= ascPosts.posts[ascPosts.posts.length - 1].date, "GET /api/posts?order=asc");

const refPosts = await (await get("/api/posts?ref=oaiAug")).json();
check(refPosts.count > 0, "GET /api/posts?ref=oaiAug (ref alias)");

const datePosts = await (await get("/api/posts?date=2026-09-29")).json();
check(datePosts.count > 0, "GET /api/posts?date=2026-09-29 filter");

const minsPosts = await (await get("/api/posts?readMins=8")).json();
check(minsPosts.count > 0 && minsPosts.posts.every(p => p.readMins === 8), "GET /api/posts?readMins=8 filter");

const tierPrefixPosts = await (await get("/api/posts?tier=tier-seraphim")).json();
check(tierPrefixPosts.count > 0, "GET /api/posts?tier=tier-seraphim prefix filter");

const titlePosts = await (await get("/api/posts?title=leaves")).json();
check(titlePosts.count > 0 && titlePosts.posts[0].title.includes("leaves"), "GET /api/posts?title=leaves filter");

const readMinsAlias = await (await get("/api/posts?read_mins=8")).json();
check(readMinsAlias.count > 0 && readMinsAlias.posts.every(p => p.readMins === 8), "GET /api/posts?read_mins=8 filter");

const latestPosts = await (await get("/api/posts?order=latest")).json();
check(latestPosts.count === posts.posts.length && latestPosts.posts[0].date >= latestPosts.posts[latestPosts.posts.length - 1].date, "GET /api/posts?order=latest");

const earliestPosts = await (await get("/api/posts?order=earliest")).json();
check(earliestPosts.count === posts.posts.length && earliestPosts.posts[0].date <= earliestPosts.posts[earliestPosts.posts.length - 1].date, "GET /api/posts?order=earliest");

const sortOrderAlias = await (await get("/api/posts?sortOrder=asc")).json();
check(sortOrderAlias.count === posts.posts.length && sortOrderAlias.posts[0].date <= sortOrderAlias.posts[sortOrderAlias.posts.length - 1].date, "GET /api/posts?sortOrder=asc");

const pageNumberAlias = await (await get("/api/posts?pageNumber=2&limit=2")).json();
check(pageNumberAlias.count === 2 && pageNumberAlias.posts.length === 2, "GET /api/posts?pageNumber=2&limit=2");

const startAtAlias = await (await get("/api/posts?start_at=1&limit=2")).json();
check(startAtAlias.count === 2 && startAtAlias.posts.length === 2, "GET /api/posts?start_at=1&limit=2");

const termQueryAlias = await (await get("/api/posts?term=openai")).json();
check(termQueryAlias.count > 0, "GET /api/posts?term=openai");

const nPosts = await (await get("/api/posts?n=1")).json();
check(nPosts.count === 1 && nPosts.posts[0].slug === posts.posts[0].slug, "GET /api/posts?n=1 filter");

const postAliasPosts = await (await get("/api/posts?post=1")).json();
check(postAliasPosts.count === 1 && postAliasPosts.posts[0].slug === posts.posts[0].slug, "GET /api/posts?post=1 filter");

const postOneByIndex = await get("/api/posts/1");
check(postOneByIndex.status === 200 && (await postOneByIndex.json()).slug === posts.posts[0].slug, "GET /api/posts/1 -> 200");

const postOneByP1 = await get("/api/posts/p-1");
check(postOneByP1.status === 200 && (await postOneByP1.json()).slug === posts.posts[0].slug, "GET /api/posts/p-1 -> 200");

const postOneByJsonIndex = await get("/api/posts/1.json");
check(postOneByJsonIndex.status === 200 && (await postOneByJsonIndex.json()).slug === posts.posts[0].slug, "GET /api/posts/1.json -> 200");

const postOneByP1Json = await get("/api/posts/p-1.json");
check(postOneByP1Json.status === 200 && (await postOneByP1Json.json()).slug === posts.posts[0].slug, "GET /api/posts/p-1.json -> 200");

const postIdAliasPosts = await (await get("/api/posts?postId=1")).json();
check(postIdAliasPosts.count === 1 && postIdAliasPosts.posts[0].slug === posts.posts[0].slug, "GET /api/posts?postId=1 filter");

const readTimeAliasPosts = await (await get("/api/posts?read_time=8")).json();
check(readTimeAliasPosts.count > 0 && readTimeAliasPosts.posts.every(p => p.readMins === 8), "GET /api/posts?read_time=8 filter");

const postArticle1 = await get("/api/posts/article-1");
check(postArticle1.status === 200 && (await postArticle1.json()).slug === posts.posts[0].slug, "GET /api/posts/article-1 -> 200");

const postPlus1 = await get("/api/posts/+1");
check(postPlus1.status === 200 && (await postPlus1.json()).slug === posts.posts[0].slug, "GET /api/posts/+1 -> 200");

const postNumFilter = await (await get("/api/posts?num=1")).json();
check(postNumFilter.count === 1 && postNumFilter.posts[0].slug === posts.posts[0].slug, "GET /api/posts?num=1 filter");

const postSlugFilter = await (await get(`/api/posts?postSlug=${posts.posts[0].slug}`)).json();
check(postSlugFilter.count === 1 && postSlugFilter.posts[0].slug === posts.posts[0].slug, "GET /api/posts?postSlug=... filter");

const postItemsFilter = await (await get("/api/posts?items=2")).json();
check(postItemsFilter.count === 2 && postItemsFilter.posts.length === 2, "GET /api/posts?items=2 filter");

const postOrderingFilter = await (await get("/api/posts?ordering=newer")).json();
check(postOrderingFilter.count === posts.posts.length, "GET /api/posts?ordering=newer filter");

for (const p of posts.posts) {
  const r = await get(`/api/posts/${p.slug}`);
  const b = await r.json();
  check(r.status === 200 && b.slug === p.slug && b.sources.every(Boolean), `GET /api/posts/${p.slug}`);
}
const upperPost = await get(`/api/posts/${posts.posts[0].slug.toUpperCase()}`);
check(upperPost.status === 200, `GET /api/posts/${posts.posts[0].slug.toUpperCase()} (case-insensitive)`);
const jsonPost = await get(`/api/posts/${posts.posts[0].slug}.json`);
check(jsonPost.status === 200, `GET /api/posts/${posts.posts[0].slug}.json -> 200`);
const missingPost = await get("/api/posts/does-not-exist");
check(missingPost.status === 404 && (await missingPost.json()).error === "not_found", "unknown post -> JSON 404");
check(missingPost.headers.get("cache-control") === "no-store", "404 unknown post cache-control is no-store");
checkSecurityHeaders(missingPost, "404 unknown post");
const missingBlogPage = await get("/blog/does-not-exist");
check(missingBlogPage.status === 404, "unknown blog page -> 404");
checkSecurityHeaders(missingBlogPage, "404 unknown blog page");

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

const yearIncs = await (await get("/api/incidents?year=2026")).json();
check(yearIncs.count > 0 && yearIncs.incidents.every(i => i.date.includes("2026")), "GET /api/incidents?year=2026 filter");

const yearIncs2024 = await (await get("/api/incidents?year=2024")).json();
check(yearIncs2024.count > 0 && yearIncs2024.incidents.every(i => i.date.includes("2024")), "GET /api/incidents?year=2024 filter");

const sourceIncs = await (await get("/api/incidents?source=oaiAug")).json();
check(sourceIncs.count > 0, "GET /api/incidents?source=oaiAug filter");

const standingIncs = await (await get("/api/incidents?standing=documented")).json();
check(standingIncs.count > 0, "GET /api/incidents?standing=documented filter");

const kickerIncs = await (await get("/api/incidents?kicker=landmark")).json();
check(kickerIncs.count === 1 && kickerIncs.incidents[0].id === "openai-huggingface-2026", "GET /api/incidents?kicker=landmark filter");

const idIncFilter = await (await get("/api/incidents?id=openai-huggingface-2026")).json();
check(idIncFilter.count === 1 && idIncFilter.incidents[0].id === "openai-huggingface-2026", "GET /api/incidents?id=... filter");

const nIncFilter = await (await get("/api/incidents?n=01")).json();
check(nIncFilter.count === 1 && nIncFilter.incidents[0].id === "openai-huggingface-2026", "GET /api/incidents?n=01 filter");

const caseIdAliasIncs = await (await get("/api/incidents?caseId=01")).json();
check(caseIdAliasIncs.count === 1 && caseIdAliasIncs.incidents[0].id === "openai-huggingface-2026", "GET /api/incidents?caseId=01 (caseId alias)");

const inc1Inc = await get("/api/incidents/incident1");
check(inc1Inc.status === 200 && (await inc1Inc.json()).id === "openai-huggingface-2026", "GET /api/incidents/incident1 (hyphenless)");

const qIncsStatus = await (await get("/api/incidents?q=verified")).json();
check(qIncsStatus.count > 0, "GET /api/incidents?q=verified statusLabel search");

const pageIncs = await (await get("/api/incidents?page=2&limit=2")).json();
check(pageIncs.count === 2, "GET /api/incidents?page=2&limit=2 (page pagination)");

const refIncs = await (await get("/api/incidents?ref=oaiAug")).json();
check(refIncs.count > 0, "GET /api/incidents?ref=oaiAug (ref alias)");

const vulnIncs = await (await get("/api/incidents?vuln=token-refresh")).json();
check(vulnIncs.count > 0, "GET /api/incidents?vuln=token-refresh filter");

const titleIncs = await (await get("/api/incidents?title=OpenAI")).json();
check(titleIncs.count > 0, "GET /api/incidents?title=OpenAI filter");

const cveIncs = await (await get("/api/incidents?cve=token")).json();
check(cveIncs.count > 0, "GET /api/incidents?cve=token filter");

const incEncoded = await get("/api/incidents/openai%2Dhuggingface%2D2026");
check(incEncoded.status === 200, "GET /api/incidents/openai%2Dhuggingface%2D2026 -> 200");

for (const inc of incs.incidents) {
  const r = await get(`/api/incidents/${inc.id}`);
  const b = await r.json();
  check(r.status === 200 && b.id === inc.id && Array.isArray(b.timeline), `GET /api/incidents/${inc.id}`);
}
const upperInc = await get(`/api/incidents/${incs.incidents[0].id.toUpperCase()}`);
check(upperInc.status === 200, `GET /api/incidents/${incs.incidents[0].id.toUpperCase()} (case-insensitive)`);
const numInc = await get("/api/incidents/01");
check(numInc.status === 200 && (await numInc.json()).id === "openai-huggingface-2026", "GET /api/incidents/01 (by number)");
const singleNumInc = await get("/api/incidents/1");
check(singleNumInc.status === 200 && (await singleNumInc.json()).id === "openai-huggingface-2026", "GET /api/incidents/1 (by single digit)");
const casePrefixInc = await get("/api/incidents/case-01");
check(casePrefixInc.status === 200 && (await casePrefixInc.json()).id === "openai-huggingface-2026", "GET /api/incidents/case-01 (case- prefix)");
const incPrefixInc = await get("/api/incidents/inc-1");
check(incPrefixInc.status === 200 && (await incPrefixInc.json()).id === "openai-huggingface-2026", "GET /api/incidents/inc-1 (inc- prefix)");
const iPrefixInc = await get("/api/incidents/i-01");
check(iPrefixInc.status === 200 && (await iPrefixInc.json()).id === "openai-huggingface-2026", "GET /api/incidents/i-01 (i- prefix)");
const iSingleDigitInc = await get("/api/incidents/i-1");
check(iSingleDigitInc.status === 200 && (await iSingleDigitInc.json()).id === "openai-huggingface-2026", "GET /api/incidents/i-1 (i- single digit)");
const inc01Inc = await get("/api/incidents/inc01");
check(inc01Inc.status === 200 && (await inc01Inc.json()).id === "openai-huggingface-2026", "GET /api/incidents/inc01 (inc<N>)");
const incIdFilter = await (await get("/api/incidents?id=i-01")).json();
check(incIdFilter.count === 1 && incIdFilter.incidents[0].id === "openai-huggingface-2026", "GET /api/incidents?id=i-01 filter");
const incIncidentAlias = await (await get("/api/incidents?incident=01")).json();
check(incIncidentAlias.count === 1 && incIncidentAlias.incidents[0].id === "openai-huggingface-2026", "GET /api/incidents?incident=01 alias filter");
const jsonInc = await get(`/api/incidents/${incs.incidents[0].id}.json`);
check(jsonInc.status === 200 && (await jsonInc.json()).id === incs.incidents[0].id, "GET /api/incidents/[id].json -> 200");
const incPlus1 = await get("/api/incidents/+1");
check(incPlus1.status === 200 && (await incPlus1.json()).id === "openai-huggingface-2026", "GET /api/incidents/+1 -> 200");
const incNumFilter = await (await get("/api/incidents?num=01")).json();
check(incNumFilter.count === 1 && incNumFilter.incidents[0].id === "openai-huggingface-2026", "GET /api/incidents?num=01 filter");
const missingInc = await get("/api/incidents/does-not-exist");
check(missingInc.status === 404 && (await missingInc.json()).error === "not_found", "unknown incident -> JSON 404");
check(missingInc.headers.get("cache-control") === "no-store", "404 unknown incident cache-control is no-store");
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

const csSevHigh = await (await get("/api/case-studies?sev=High")).json();
check(Array.isArray(csSevHigh.findings) && csSevHigh.findings.every(f => f.severity === "High"), "GET /api/case-studies?sev=High filter");

const csFindingPrefix = await (await get("/api/case-studies?id=finding-01")).json();
check(csFindingPrefix.count === 1 && csFindingPrefix.findings[0].id === "F-01", "GET /api/case-studies?id=finding-01 filter");

const csEncoded = await get("/api/case-studies/f%2D01");
check(csEncoded.status === 200 && (await csEncoded.json()).id === "F-01", "GET /api/case-studies/f%2D01 -> 200");

const limitedCs = await (await get("/api/case-studies?limit=2")).json();
check(limitedCs.count === 2 && limitedCs.findings.length === 2, "GET /api/case-studies?limit=2");

const qCs = await (await get("/api/case-studies?q=scheduled")).json();
check(qCs.count > 0, "GET /api/case-studies?q=scheduled filter");

const qCsStatus = await (await get("/api/case-studies?q=fixed")).json();
check(qCsStatus.count > 0, "GET /api/case-studies?q=fixed status search");

const csById = await (await get("/api/case-studies?id=F-01")).json();
check(csById.count === 1 && csById.findings[0].id === "F-01", "GET /api/case-studies?id=F-01 filter");

const csByN = await (await get("/api/case-studies?n=F-01")).json();
check(csByN.count === 1 && csByN.findings[0].id === "F-01", "GET /api/case-studies?n=F-01 filter");

const csFindingAlias = await (await get("/api/case-studies?finding=f-01")).json();
check(csFindingAlias.count === 1 && csFindingAlias.findings[0].id === "F-01", "GET /api/case-studies?finding=f-01 alias filter");

const csOne = await get("/api/case-studies/f-01");
const csOneBody = await csOne.json();
check(csOne.status === 200 && csOneBody.id === "F-01" && csOneBody.remediation?.id === "F-01", "GET /api/case-studies/f-01 (case-insensitive with remediation)");
const csOneUpper = await get("/api/case-studies/F-01");
check(csOneUpper.status === 200 && (await csOneUpper.json()).id === "F-01", "GET /api/case-studies/F-01 (uppercase)");
const csHyphenless = await get("/api/case-studies/f01");
check(csHyphenless.status === 200 && (await csHyphenless.json()).id === "F-01", "GET /api/case-studies/f01 (hyphenless)");
const csFixPrefix = await get("/api/case-studies/fix-f-01");
check(csFixPrefix.status === 200 && (await csFixPrefix.json()).id === "F-01", "GET /api/case-studies/fix-f-01 (fix- prefix)");

const csCs1 = await get("/api/case-studies/cs1");
check(csCs1.status === 200 && (await csCs1.json()).id === "F-01", "GET /api/case-studies/cs1 (hyphenless)");

const csFixFilter = await (await get("/api/case-studies?fix=idempotency")).json();
check(csFixFilter.count > 0, "GET /api/case-studies?fix=idempotency filter");

const csF1 = await get("/api/case-studies/f-1");
check(csF1.status === 200 && (await csF1.json()).id === "F-01", "GET /api/case-studies/f-1 (single digit with hyphen)");
const csF1NoHyphen = await get("/api/case-studies/f1");
check(csF1NoHyphen.status === 200 && (await csF1NoHyphen.json()).id === "F-01", "GET /api/case-studies/f1 (single digit no hyphen)");
const csFixF1 = await get("/api/case-studies/fix-f-1");
check(csFixF1.status === 200 && (await csFixF1.json()).id === "F-01", "GET /api/case-studies/fix-f-1 (fix- prefix single digit)");
const csPrefix01 = await get("/api/case-studies/cs-01");
check(csPrefix01.status === 200 && (await csPrefix01.json()).id === "F-01", "GET /api/case-studies/cs-01 (cs- prefix)");
const csCaseStudyPrefix = await get("/api/case-studies/case-study-01");
check(csCaseStudyPrefix.status === 200 && (await csCaseStudyPrefix.json()).id === "F-01", "GET /api/case-studies/case-study-01 (case-study- prefix)");
const csTitleFilter = await (await get("/api/case-studies?title=endpoint")).json();
check(csTitleFilter.count > 0 && csTitleFilter.findings[0].id === "F-01", "GET /api/case-studies?title=endpoint filter");
const csIdFilterCs = await (await get("/api/case-studies?id=cs-01")).json();
check(csIdFilterCs.count === 1 && csIdFilterCs.findings[0].id === "F-01", "GET /api/case-studies?id=cs-01 filter");
const csPage = await (await get("/api/case-studies?page=2&limit=2")).json();
check(csPage.count === 2, "GET /api/case-studies?page=2&limit=2 (page pagination)");
const jsonCs = await get("/api/case-studies/f-01.json");
check(jsonCs.status === 200 && (await jsonCs.json()).id === "F-01", "GET /api/case-studies/f-01.json -> 200");
const csPlus1 = await get("/api/case-studies/+1");
check(csPlus1.status === 200 && (await csPlus1.json()).id === "F-01", "GET /api/case-studies/+1 -> 200");
const csCaseStudy1 = await get("/api/case-studies/casestudy1");
check(csCaseStudy1.status === 200 && (await csCaseStudy1.json()).id === "F-01", "GET /api/case-studies/casestudy1 -> 200");
const csNumFilter = await (await get("/api/case-studies?num=01")).json();
check(csNumFilter.count === 1 && csNumFilter.findings[0].id === "F-01", "GET /api/case-studies?num=01 filter");

const headCsOne = await get("/api/case-studies/f-01", { method: "HEAD" });
check(headCsOne.status === 200, "HEAD /api/case-studies/f-01 -> 200");
checkSecurityHeaders(headCsOne, "HEAD /api/case-studies/f-01");

const missingCs = await get("/api/case-studies/f-999");
check(missingCs.status === 404 && (await missingCs.json()).error === "not_found", "unknown case study -> JSON 404");
check(missingCs.headers.get("cache-control") === "no-store", "404 unknown case study cache-control is no-store");
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

const qTiersCadence = await (await get("/api/tiers?q=advisory")).json();
check(qTiersCadence.count > 0 && qTiersCadence.tiers.some(t => t.cadence.toLowerCase().includes("advisory")), "GET /api/tiers?q=advisory cadence search");

const cadTiers = await (await get("/api/tiers?cadence=recurring")).json();
check(cadTiers.count === 1 && cadTiers.tiers[0].id === "cherubim", "GET /api/tiers?cadence=recurring filter");

const tiersById = await (await get("/api/tiers?id=seraphim")).json();
check(tiersById.count === 1 && tiersById.tiers[0].id === "seraphim", "GET /api/tiers?id=seraphim filter");

const tierAlias = await (await get("/api/tiers?tier=seraphim")).json();
check(tierAlias.count === 1 && tierAlias.tiers[0].id === "seraphim", "GET /api/tiers?tier=seraphim filter");

const tierNameFilter = await (await get("/api/tiers?name=Seraphim")).json();
check(tierNameFilter.count === 1 && tierNameFilter.tiers[0].id === "seraphim", "GET /api/tiers?name=Seraphim filter");

const tierOne = await get("/api/tiers/seraphim");
check(tierOne.status === 200 && (await tierOne.json()).name === "Seraphim", "GET /api/tiers/seraphim");
const tierUpper = await get("/api/tiers/SERAPHIM");
check(tierUpper.status === 200 && (await tierUpper.json()).name === "Seraphim", "GET /api/tiers/SERAPHIM (case-insensitive)");
const tierByRank = await get("/api/tiers/1");
check(tierByRank.status === 200 && (await tierByRank.json()).id === "seraphim", "GET /api/tiers/1 (by rank)");
const tierPrefix = await get("/api/tiers/tier-seraphim");
check(tierPrefix.status === 200 && (await tierPrefix.json()).id === "seraphim", "GET /api/tiers/tier-seraphim (tier- prefix)");
const tierRankPlus = await get("/api/tiers/+1");
check(tierRankPlus.status === 200 && (await tierRankPlus.json()).id === "seraphim", "GET /api/tiers/+1 (+rank)");
const t1Tier = await get("/api/tiers/t1");
check(t1Tier.status === 200 && (await t1Tier.json()).id === "seraphim", "GET /api/tiers/t1 -> 200");
const tierEncoded = await get("/api/tiers/tier%2Dseraphim");
check(tierEncoded.status === 200 && (await tierEncoded.json()).id === "seraphim", "GET /api/tiers/tier%2Dseraphim -> 200");
const tHyphenTier = await get("/api/tiers/t-1");
check(tHyphenTier.status === 200 && (await tHyphenTier.json()).id === "seraphim", "GET /api/tiers/t-1 -> 200");
const tierLeadingZero = await get("/api/tiers/01");
check(tierLeadingZero.status === 200 && (await tierLeadingZero.json()).id === "seraphim", "GET /api/tiers/01 -> 200");
const tierUnderscore = await get("/api/tiers/tier_01");
check(tierUnderscore.status === 200 && (await tierUnderscore.json()).id === "seraphim", "GET /api/tiers/tier_01 -> 200");
const tierRankParam = await (await get("/api/tiers?tier_rank=1")).json();
check(tierRankParam.count === 1 && tierRankParam.tiers[0].id === "seraphim", "GET /api/tiers?tier_rank=1 filter");
const tierIdHyphen = await (await get("/api/tiers?id=t-1")).json();
check(tierIdHyphen.count === 1 && tierIdHyphen.tiers[0].id === "seraphim", "GET /api/tiers?id=t-1 filter");
const tierFilterZero = await (await get("/api/tiers?tier=01")).json();
check(tierFilterZero.count === 1 && tierFilterZero.tiers[0].id === "seraphim", "GET /api/tiers?tier=01 filter");

const tierIdSnake = await (await get("/api/tiers?tier_id=seraphim")).json();
check(tierIdSnake.count === 1 && tierIdSnake.tiers[0].id === "seraphim", "GET /api/tiers?tier_id=seraphim filter");

const tiersPage = await (await get("/api/tiers?page=2&limit=2")).json();
check(tiersPage.count === 2, "GET /api/tiers?page=2&limit=2 (page pagination)");
const jsonTier = await get("/api/tiers/seraphim.json");
check(jsonTier.status === 200 && (await jsonTier.json()).id === "seraphim", "GET /api/tiers/seraphim.json -> 200");
const tierRank1 = await get("/api/tiers/rank-1");
check(tierRank1.status === 200 && (await tierRank1.json()).id === "seraphim", "GET /api/tiers/rank-1 -> 200");
const tierPlus1 = await get("/api/tiers/+1");
check(tierPlus1.status === 200 && (await tierPlus1.json()).id === "seraphim", "GET /api/tiers/+1 -> 200");
const tierRankFilter = await (await get("/api/tiers?rank=1")).json();
check(tierRankFilter.count === 1 && tierRankFilter.tiers[0].id === "seraphim", "GET /api/tiers?rank=1 filter");

const tierRankPrefixFilter = await (await get("/api/tiers?rank=rank-1")).json();
check(tierRankPrefixFilter.count === 1 && tierRankPrefixFilter.tiers[0].id === "seraphim", "GET /api/tiers?rank=rank-1 filter");

const tierRankIdFilter = await (await get("/api/tiers?rank_id=1")).json();
check(tierRankIdFilter.count === 1 && tierRankIdFilter.tiers[0].id === "seraphim", "GET /api/tiers?rank_id=1 filter");

const headTierOne = await get("/api/tiers/seraphim", { method: "HEAD" });
check(headTierOne.status === 200, "HEAD /api/tiers/seraphim -> 200");
checkSecurityHeaders(headTierOne, "HEAD /api/tiers/seraphim");

const missingTier = await get("/api/tiers/does-not-exist");
check(missingTier.status === 404 && (await missingTier.json()).error === "not_found", "unknown tier -> JSON 404");
check(missingTier.headers.get("cache-control") === "no-store", "404 unknown tier cache-control is no-store");
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

const scNumFiltered = await (await get("/api/scenarios?q=h1")).json();
check(scNumFiltered.count === 1 && scNumFiltered.scenarios[0].n === "H1", "GET /api/scenarios?q=h1 number search");

const weakSc = await (await get("/api/scenarios?weakness=credentials")).json();
check(weakSc.count > 0, "GET /api/scenarios?weakness=credentials filter");

const refSc = await (await get("/api/scenarios?ref=cs26")).json();
check(refSc.count > 0, "GET /api/scenarios?ref=cs26 filter");

const limitedSc = await (await get("/api/scenarios?limit=2")).json();
check(limitedSc.count === 2 && limitedSc.scenarios.length === 2, "GET /api/scenarios?limit=2");

const scOne = await get("/api/scenarios/legacy-internal-app");
check(scOne.status === 200 && (await scOne.json()).id === "legacy-internal-app", "GET /api/scenarios/legacy-internal-app");
const scUpper = await get("/api/scenarios/LEGACY-INTERNAL-APP");
check(scUpper.status === 200 && (await scUpper.json()).id === "legacy-internal-app", "GET /api/scenarios/LEGACY-INTERNAL-APP (case-insensitive)");
const scByNum = await get("/api/scenarios/h1");
check(scByNum.status === 200 && (await scByNum.json()).id === "legacy-internal-app", "GET /api/scenarios/h1 (by scenario number)");
const scById = await (await get("/api/scenarios?id=onprem-domain")).json();
check(scById.count === 1 && scById.scenarios[0].id === "onprem-domain", "GET /api/scenarios?id=onprem-domain filter");
const scByN = await (await get("/api/scenarios?n=h1")).json();
check(scByN.count === 1 && scByN.scenarios[0].id === "legacy-internal-app", "GET /api/scenarios?n=h1 filter");
const scPrefix = await get("/api/scenarios/scenario-h1");
check(scPrefix.status === 200 && (await scPrefix.json()).id === "legacy-internal-app", "GET /api/scenarios/scenario-h1 (scenario- prefix)");
const scHyphen = await get("/api/scenarios/h-1");
check(scHyphen.status === 200 && (await scHyphen.json()).id === "legacy-internal-app", "GET /api/scenarios/h-1 (hyphenated code)");

const scSpeed = await (await get("/api/scenarios?speed=minutes")).json();
check(scSpeed.count > 0, "GET /api/scenarios?speed=minutes filter");

const scApproach = await (await get("/api/scenarios?approach=adversary")).json();
check(scApproach.count > 0, "GET /api/scenarios?approach=adversary filter");

const scEncoded = await get("/api/scenarios/legacy%2Dinternal%2Dapp");
check(scEncoded.status === 200 && (await scEncoded.json()).id === "legacy-internal-app", "GET /api/scenarios/legacy%2Dinternal%2Dapp -> 200");

const scSrc = await (await get("/api/scenarios?source=cs26")).json();
check(scSrc.count > 0, "GET /api/scenarios?source=cs26 (source alias for ref)");
const scCtrl = await (await get("/api/scenarios?control=proxy")).json();
check(scCtrl.count > 0, "GET /api/scenarios?control=proxy filter");
const scTitle = await (await get("/api/scenarios?title=legacy")).json();
check(scTitle.count > 0 && scTitle.scenarios[0].title.toLowerCase().includes("legacy"), "GET /api/scenarios?title=legacy filter");
const scWeaknessClass = await (await get("/api/scenarios?weakness_class=credentials")).json();
check(scWeaknessClass.count > 0, "GET /api/scenarios?weakness_class=credentials filter");

const scScenarioAlias = await (await get("/api/scenarios?scenario=sc1")).json();
check(scScenarioAlias.count === 1 && scScenarioAlias.scenarios[0].id === "legacy-internal-app", "GET /api/scenarios?scenario=sc1 filter");
const sc1Res = await get("/api/scenarios/sc1");
check(sc1Res.status === 200 && (await sc1Res.json()).id === "legacy-internal-app", "GET /api/scenarios/sc1 -> 200");

const scScenario1 = await get("/api/scenarios/scenario1");
check(scScenario1.status === 200 && (await scScenario1.json()).id === "legacy-internal-app", "GET /api/scenarios/scenario1 (hyphenless)");

const scSeraphim = await (await get("/api/scenarios?seraphim=recon")).json();
check(scSeraphim.count > 0, "GET /api/scenarios?seraphim=recon filter");
const scPage = await (await get("/api/scenarios?page=2&limit=2")).json();
check(scPage.count === 2, "GET /api/scenarios?page=2&limit=2 (page pagination)");
const jsonSc = await get(`/api/scenarios/legacy-internal-app.json`);
check(jsonSc.status === 200, "GET /api/scenarios/[id].json -> 200");
const scPlus1 = await get("/api/scenarios/+1");
check(scPlus1.status === 200, "GET /api/scenarios/+1 -> 200");
const scNumFilter = await (await get("/api/scenarios?num=01")).json();
check(scNumFilter.count === 1, "GET /api/scenarios?num=01 filter");

const headScOne = await get("/api/scenarios/legacy-internal-app", { method: "HEAD" });
check(headScOne.status === 200, "HEAD /api/scenarios/legacy-internal-app -> 200");
checkSecurityHeaders(headScOne, "HEAD /api/scenarios/legacy-internal-app");

const missingSc = await get("/api/scenarios/does-not-exist");
check(missingSc.status === 404 && (await missingSc.json()).error === "not_found", "unknown scenario -> JSON 404");
check(missingSc.headers.get("cache-control") === "no-store", "404 unknown scenario cache-control is no-store");
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

const dateSrc = await (await get("/api/sources?date=2026")).json();
check(dateSrc.count > 0, "GET /api/sources?date=2026 filter");

const labelSrc = await (await get("/api/sources?label=CrowdStrike")).json();
check(labelSrc.count > 0, "GET /api/sources?label=CrowdStrike filter");

const primSrc = await (await get("/api/sources?type=primary")).json();
check(primSrc.count > 0, "GET /api/sources?type=primary filter");

const limitedSrc = await (await get("/api/sources?limit=2")).json();
check(limitedSrc.count === 2 && limitedSrc.sources.length === 2, "GET /api/sources?limit=2");

const qSrc = await (await get("/api/sources?q=openai")).json();
check(qSrc.count > 0, "GET /api/sources?q=openai filter");

const srcById = await (await get("/api/sources?id=oaiAug")).json();
check(srcById.count === 1 && srcById.sources[0].id === "oaiAug", "GET /api/sources?id=oaiAug filter");

const srcByIdUpper = await (await get("/api/sources?id=OAIAUG")).json();
check(srcByIdUpper.count === 1 && srcByIdUpper.sources[0].id === "oaiAug", "GET /api/sources?id=OAIAUG (case-insensitive filter)");

const srcBySource = await (await get("/api/sources?source=oaiAug")).json();
check(srcBySource.count === 1 && srcBySource.sources[0].id === "oaiAug", "GET /api/sources?source=oaiAug filter");

const srcByRef = await (await get("/api/sources?ref=oaiAug")).json();
check(srcByRef.count === 1 && srcByRef.sources[0].id === "oaiAug", "GET /api/sources?ref=oaiAug filter");

const srcBySlug = await (await get("/api/sources?slug=oaiAug")).json();
check(srcBySlug.count === 1 && srcBySlug.sources[0].id === "oaiAug", "GET /api/sources?slug=oaiAug filter");

const srcByNum = await (await get("/api/sources?n=1")).json();
check(srcByNum.count === 1 && srcByNum.sources[0].id === "oaiAug", "GET /api/sources?n=1 filter");

const srcTitle = await (await get("/api/sources?title=Hugging")).json();
check(srcTitle.count > 0, "GET /api/sources?title=Hugging filter");

const srcOne = await get("/api/sources/oaiAug");
check(srcOne.status === 200 && (await srcOne.json()).id === "oaiAug", "GET /api/sources/oaiAug");
const srcUpper = await get("/api/sources/OAIAUG");
check(srcUpper.status === 200 && (await srcUpper.json()).id === "oaiAug", "GET /api/sources/OAIAUG (case-insensitive)");
const srcPrefix = await get("/api/sources/src-oaiAug");
check(srcPrefix.status === 200 && (await srcPrefix.json()).id === "oaiAug", "GET /api/sources/src-oaiAug (src- prefix)");

const srcByRank = await get("/api/sources/1");
check(srcByRank.status === 200 && (await srcByRank.json()).id === "oaiAug", "GET /api/sources/1 (by 1-based index)");

const srcByS1 = await get("/api/sources/s1");
check(srcByS1.status === 200 && (await srcByS1.json()).id === "oaiAug", "GET /api/sources/s1 (s1 prefix)");

const srcBySrc1 = await get("/api/sources/src1");
check(srcBySrc1.status === 200 && (await srcBySrc1.json()).id === "oaiAug", "GET /api/sources/src1 (src1 prefix)");

const srcBySource1 = await get("/api/sources/source1");
check(srcBySource1.status === 200 && (await srcBySource1.json()).id === "oaiAug", "GET /api/sources/source1 (source1 prefix)");
const sourceRef1 = await get("/api/sources/ref-oaiAug");
check(sourceRef1.status === 200 && (await sourceRef1.json()).id === "oaiAug", "GET /api/sources/ref-oaiAug -> 200");
const sourcePlus1 = await get("/api/sources/+1");
check(sourcePlus1.status === 200 && (await sourcePlus1.json()).id === "oaiAug", "GET /api/sources/+1 -> 200");
const sourceNumFilter = await (await get("/api/sources?num=01")).json();
check(sourceNumFilter.count === 1 && sourceNumFilter.sources[0].id === "oaiAug", "GET /api/sources?num=01 filter");

const srcBySrcAlias = await (await get("/api/sources?src=oaiAug")).json();
check(srcBySrcAlias.count === 1 && srcBySrcAlias.sources[0].id === "oaiAug", "GET /api/sources?src=oaiAug filter");

const srcByUrl = await (await get("/api/sources?url=openai.com")).json();
check(srcByUrl.count > 0 && srcByUrl.sources.every(s => s.url.includes("openai.com")), "GET /api/sources?url=openai.com filter");

const sourcesPage = await (await get("/api/sources?page=2&limit=2")).json();
check(sourcesPage.count === 2, "GET /api/sources?page=2&limit=2 (page pagination)");
const jsonSource = await get("/api/sources/oaiAug.json");
check(jsonSource.status === 200 && (await jsonSource.json()).id === "oaiAug", "GET /api/sources/oaiAug.json -> 200");

const headSrcOne = await get("/api/sources/oaiAug", { method: "HEAD" });
check(headSrcOne.status === 200, "HEAD /api/sources/oaiAug -> 200");
checkSecurityHeaders(headSrcOne, "HEAD /api/sources/oaiAug");

const missingSrc = await get("/api/sources/does-not-exist");
check(missingSrc.status === 404 && (await missingSrc.json()).error === "not_found", "unknown source -> JSON 404");
check(missingSrc.headers.get("cache-control") === "no-store", "404 unknown source cache-control is no-store");
checkSecurityHeaders(missingSrc, "404 unknown source");

// 8. Brand API
const brandRes = await get("/api/brand");
const brandBody = await brandRes.json();
check(brandRes.status === 200 && brandBody.name === "Seraphim AI" && Array.isArray(brandBody.badges) && brandBody.badges.length > 0, "GET /api/brand shape and badges");
check(brandBody.theme?.default === "dark" && Array.isArray(brandBody.theme?.names) && brandBody.theme.names.includes("dark"), "GET /api/brand theme structure");
checkSecurityHeaders(brandRes, "GET /api/brand");

const brandBadge = await (await get("/api/brand?badge=passive")).json();
check(brandBadge.badge?.key === "passive", "GET /api/brand?badge=passive returns badge");

const brandBadgePrefix = await (await get("/api/brand?badge=badge-passive")).json();
check(brandBadgePrefix.badge?.key === "passive", "GET /api/brand?badge=badge-passive returns badge");

const brandBadgeExt = await (await get("/api/brand?badge=passive.json")).json();
check(brandBadgeExt.badge?.key === "passive", "GET /api/brand?badge=passive.json returns badge");

const brandKeyEncoded = await (await get("/api/brand?key=badge%2Dlocal")).json();
check(brandKeyEncoded.badge?.key === "local", "GET /api/brand?key=badge%2Dlocal returns badge");

const brandBadgeKey = await (await get("/api/brand?badge_key=passive")).json();
check(brandBadgeKey.badge?.key === "passive", "GET /api/brand?badge_key=passive returns badge");

const brandBadgeId = await (await get("/api/brand?id=passive")).json();
check(brandBadgeId.badge?.key === "passive", "GET /api/brand?id=passive returns badge");

const brandBadgeNum = await (await get("/api/brand?badge=1")).json();
check(brandBadgeNum.badge?.key === "passive", "GET /api/brand?badge=1 returns badge");

const brandBadgeZero = await (await get("/api/brand?badge=01")).json();
check(brandBadgeZero.badge?.key === "passive", "GET /api/brand?badge=01 returns badge");

const brandBadgeB1 = await (await get("/api/brand?badge=b1")).json();
check(brandBadgeB1.badge?.key === "passive", "GET /api/brand?badge=b1 returns badge");

const brandNameFilter = await (await get("/api/brand?name=passive")).json();
check(brandNameFilter.badge?.key === "passive", "GET /api/brand?name=passive returns badge");

const brandBAlias = await (await get("/api/brand?b=passive")).json();
check(brandBAlias.badge && brandBAlias.badge.key === "passive", "GET /api/brand?b=passive (b alias)");

const brandBadge1 = await (await get("/api/brand?badge=badge1")).json();
check(brandBadge1.badge && brandBadge1.badge.key === "passive", "GET /api/brand?badge=badge1");

const brandBadgePlus1 = await (await get("/api/brand?badge=+1")).json();
check(brandBadgePlus1.badge && brandBadgePlus1.badge.key === "passive", "GET /api/brand?badge=+1");

const brandBIdAlias = await (await get("/api/brand?b_id=passive")).json();
check(brandBIdAlias.badge && brandBIdAlias.badge.key === "passive", "GET /api/brand?b_id=passive (b_id alias)");

const brandBIdCamelAlias = await (await get("/api/brand?bId=passive")).json();
check(brandBIdCamelAlias.badge && brandBIdCamelAlias.badge.key === "passive", "GET /api/brand?bId=passive (bId alias)");

const brandTagAlias = await (await get("/api/brand?tag=passive")).json();
check(brandTagAlias.badge && brandTagAlias.badge.key === "passive", "GET /api/brand?tag=passive (tag alias)");

const brandBadgeNameAlias = await (await get("/api/brand?badge_name=passive")).json();
check(brandBadgeNameAlias.badge && brandBadgeNameAlias.badge.key === "passive", "GET /api/brand?badge_name=passive (badge_name alias)");

const brandBadgeHash = await (await get("/api/brand?badge=%23passive")).json();
check(brandBadgeHash.badge && brandBadgeHash.badge.key === "passive", "GET /api/brand?badge=%23passive (hash resilience)");

const tierRAlias = await (await get("/api/tiers?r=1")).json();
check(tierRAlias.count > 0 && tierRAlias.tiers[0].id === "seraphim", "GET /api/tiers?r=1 (r alias)");

const tierRIdAlias = await (await get("/api/tiers?r_id=1")).json();
check(tierRIdAlias.count > 0 && tierRIdAlias.tiers[0].id === "seraphim", "GET /api/tiers?r_id=1 (r_id alias)");

const tierRankNumAlias = await (await get("/api/tiers?rank_num=1")).json();
check(tierRankNumAlias.count > 0 && tierRankNumAlias.tiers[0].id === "seraphim", "GET /api/tiers?rank_num=1 (rank_num alias)");

const tierHash = await (await get("/api/tiers?tier=%23seraphim")).json();
check(tierHash.count > 0 && tierHash.tiers[0].id === "seraphim", "GET /api/tiers?tier=%23seraphim (hash resilience)");

const csFindingNo = await (await get("/api/case-studies?finding_no=01")).json();
check(csFindingNo.count > 0 && csFindingNo.findings[0].id === "F-01", "GET /api/case-studies?finding_no=01 (finding_no alias)");

const csIdAlias = await (await get("/api/case-studies?case_study_id=f-01")).json();
check(csIdAlias.count > 0 && csIdAlias.findings[0].id === "F-01", "GET /api/case-studies?case_study_id=f-01 (case_study_id alias)");

const csHash = await (await get("/api/case-studies?id=%23f-01")).json();
check(csHash.count > 0 && csHash.findings[0].id === "F-01", "GET /api/case-studies?id=%23f-01 (hash resilience)");

const scHAlias = await (await get("/api/scenarios?h=h1")).json();
check(scHAlias.count > 0 && scHAlias.scenarios[0].id === "legacy-internal-app", "GET /api/scenarios?h=h1 (h alias)");

const scHIdAlias = await (await get("/api/scenarios?h_id=1")).json();
check(scHIdAlias.count > 0 && scHIdAlias.scenarios[0].id === "legacy-internal-app", "GET /api/scenarios?h_id=1 (h_id alias)");

const scScenarioNo = await (await get("/api/scenarios?scenario_no=h1")).json();
check(scScenarioNo.count > 0 && scScenarioNo.scenarios[0].id === "legacy-internal-app", "GET /api/scenarios?scenario_no=h1 (scenario_no alias)");

const scHash = await (await get("/api/scenarios?id=%23h1")).json();
check(scHash.count > 0 && scHash.scenarios[0].id === "legacy-internal-app", "GET /api/scenarios?id=%23h1 (hash resilience)");

const srcRefIdAlias = await (await get("/api/sources?ref_id=oaiAug")).json();
check(srcRefIdAlias.count > 0 && srcRefIdAlias.sources[0].id === "oaiAug", "GET /api/sources?ref_id=oaiAug (ref_id alias)");

const srcReferenceIdAlias = await (await get("/api/sources?reference_id=oaiAug")).json();
check(srcReferenceIdAlias.count > 0 && srcReferenceIdAlias.sources[0].id === "oaiAug", "GET /api/sources?reference_id=oaiAug (reference_id alias)");

const srcHash = await (await get("/api/sources?id=%23oaiAug")).json();
check(srcHash.count > 0 && srcHash.sources[0].id === "oaiAug", "GET /api/sources?id=%23oaiAug (hash resilience)");

const incIncidentNo = await (await get("/api/incidents?incidentNo=01")).json();
check(incIncidentNo.count > 0 && incIncidentNo.incidents[0].id === "openai-huggingface-2026", "GET /api/incidents?incidentNo=01 (incidentNo alias)");

const incCaseNo = await (await get("/api/incidents?caseNo=01")).json();
check(incCaseNo.count > 0 && incCaseNo.incidents[0].id === "openai-huggingface-2026", "GET /api/incidents?caseNo=01 (caseNo alias)");

const incHash = await (await get("/api/incidents?id=%23openai-huggingface-2026")).json();
check(incHash.count > 0 && incHash.incidents[0].id === "openai-huggingface-2026", "GET /api/incidents?id=%23openai-huggingface-2026 (hash resilience)");

const postBlogAlias = await (await get("/api/posts?blog=when-the-test-subject-leaves-the-test")).json();
check(postBlogAlias.count > 0 && postBlogAlias.posts[0].slug === "when-the-test-subject-leaves-the-test", "GET /api/posts?blog=... (blog alias)");

const postBlogIdAlias = await (await get("/api/posts?blogId=1")).json();
check(postBlogIdAlias.count > 0 && postBlogIdAlias.posts[0].slug === "when-the-test-subject-leaves-the-test", "GET /api/posts?blogId=1 (blogId alias)");

const postHash = await (await get("/api/posts?slug=%23when-the-test-subject-leaves-the-test")).json();
check(postHash.count > 0 && postHash.posts[0].slug === "when-the-test-subject-leaves-the-test", "GET /api/posts?slug=%23... (hash resilience)");

const postRecordsAlias = await (await get("/api/posts?records=2")).json();
check(postRecordsAlias.count === 2 && postRecordsAlias.posts.length === 2, "GET /api/posts?records=2 (records alias)");

const postTopAlias = await (await get("/api/posts?top=2")).json();
check(postTopAlias.count === 2 && postTopAlias.posts.length === 2, "GET /api/posts?top=2 (top alias)");

const postChronoSort = await (await get("/api/posts?sort=chrono")).json();
check(postChronoSort.posts[0].date <= postChronoSort.posts[postChronoSort.posts.length - 1].date, "GET /api/posts?sort=chrono (chrono sort)");

const postRevSort = await (await get("/api/posts?sort=rev")).json();
check(postRevSort.posts[0].date >= postRevSort.posts[postRevSort.posts.length - 1].date, "GET /api/posts?sort=rev (rev sort)");

const postQueryTerm = await (await get("/api/posts?query_term=openai")).json();
check(postQueryTerm.count > 0, "GET /api/posts?query_term=openai (query_term alias)");

const postSearchText = await (await get("/api/posts?search_text=openai")).json();
check(postSearchText.count > 0, "GET /api/posts?search_text=openai (search_text alias)");

const postTierHash = await (await get("/api/posts?tier=%23seraphim")).json();
check(postTierHash.count > 0 && postTierHash.posts[0].tier === "seraphim", "GET /api/posts?tier=%23seraphim (tier hash resilience)");

const postSourceHash = await (await get("/api/posts?source=%23oaiAug")).json();
check(postSourceHash.count > 0, "GET /api/posts?source=%23oaiAug (source hash resilience)");

const incSourceHash = await (await get("/api/incidents?source=%23oaiAug")).json();
check(incSourceHash.count > 0, "GET /api/incidents?source=%23oaiAug (source hash resilience)");

const scRefHash = await (await get("/api/scenarios?ref=%23hfTime")).json();
check(scRefHash.count > 0, "GET /api/scenarios?ref=%23hfTime (ref hash resilience)");

const csSevHash = await (await get("/api/case-studies?severity=%23high")).json();
check(csSevHash.count > 0 && csSevHash.findings.every(f => f.severity.toLowerCase() === "high"), "GET /api/case-studies?severity=%23high (severity hash resilience)");

const brandBadgeDoubleHash = await (await get("/api/brand?badge=%23%23passive")).json();
check(brandBadgeDoubleHash.badge && brandBadgeDoubleHash.badge.key === "passive", "GET /api/brand?badge=%23%23passive (double-hash resilience)");

const tierDoubleHash = await (await get("/api/tiers?tier=%23%23seraphim")).json();
check(tierDoubleHash.count > 0 && tierDoubleHash.tiers[0].id === "seraphim", "GET /api/tiers?tier=%23%23seraphim (double-hash resilience)");

const csDoubleHash = await (await get("/api/case-studies?id=%23%23f-01")).json();
check(csDoubleHash.count > 0 && csDoubleHash.findings[0].id === "F-01", "GET /api/case-studies?id=%23%23f-01 (double-hash resilience)");

const scDoubleHash = await (await get("/api/scenarios?id=%23%23h1")).json();
check(scDoubleHash.count > 0 && scDoubleHash.scenarios[0].id === "legacy-internal-app", "GET /api/scenarios?id=%23%23h1 (double-hash resilience)");

const srcDoubleHash = await (await get("/api/sources?id=%23%23oaiAug")).json();
check(srcDoubleHash.count > 0 && srcDoubleHash.sources[0].id === "oaiAug", "GET /api/sources?id=%23%23oaiAug (double-hash resilience)");

const incDoubleHash = await (await get("/api/incidents?id=%23%23openai-huggingface-2026")).json();
check(incDoubleHash.count > 0 && incDoubleHash.incidents[0].id === "openai-huggingface-2026", "GET /api/incidents?id=%23%23openai-huggingface-2026 (double-hash resilience)");

const postDoubleHash = await (await get("/api/posts?slug=%23%23when-the-test-subject-leaves-the-test")).json();
check(postDoubleHash.count > 0 && postDoubleHash.posts[0].slug === "when-the-test-subject-leaves-the-test", "GET /api/posts?slug=%23%23... (double-hash resilience)");

// Pagination continuity and disjointness check across all 6 index endpoints
const pageCheckEndpoints = [
  { path: "/api/posts", field: "posts", idKey: "slug" },
  { path: "/api/incidents", field: "incidents", idKey: "id" },
  { path: "/api/case-studies", field: "findings", idKey: "id" },
  { path: "/api/scenarios", field: "scenarios", idKey: "id" },
  { path: "/api/sources", field: "sources", idKey: "id" },
  { path: "/api/tiers", field: "tiers", idKey: "id" },
];
for (const { path, field, idKey } of pageCheckEndpoints) {
  const p1Res = await (await get(`${path}?page=1&limit=2`)).json();
  const p2Res = await (await get(`${path}?page=2&limit=2`)).json();
  check(p1Res.count <= 2 && p2Res.count <= 2, `${path} page 1 & 2 count bounded`);
  if (p1Res.totalCount > 2) {
    const p1Ids = new Set(p1Res[field].map(item => item[idKey]));
    const overlap = p2Res[field].some(item => p1Ids.has(item[idKey]));
    check(!overlap, `${path} page 1 and page 2 are disjoint sets`);
  }
  const oobRes = await (await get(`${path}?offset=${p1Res.totalCount + 10}&limit=2`)).json();
  check(oobRes.count === 0 && oobRes[field].length === 0 && oobRes.totalCount === p1Res.totalCount, `${path} out-of-bounds offset returns count 0 with preserved totalCount`);
}

// 9. Method Not Allowed on dynamic API endpoints (Next.js dynamic route handlers return 405 for unexported methods)
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
  checkSecurityHeaders(postRes, `POST ${endpoint} 405`);
  const putRes = await get(endpoint, { method: "PUT" });
  check(putRes.status === 405, `PUT ${endpoint} -> 405`);
  const delRes = await get(endpoint, { method: "DELETE" });
  check(delRes.status === 405, `DELETE ${endpoint} -> 405`);
}

// 10. Hostile query string resilience
const hostileQuery = "?q=%00%ff&limit=-1&tier=__proto__&year=" + "x".repeat(2000);
for (const ep of ["/api/posts", "/api/incidents", "/api/case-studies", "/api/scenarios", "/api/sources", "/api/tiers"]) {
  const hostileRes = await get(`${ep}${hostileQuery}`);
  check(hostileRes.status === 200, `hostile query on ${ep} -> 200`);
  checkSecurityHeaders(hostileRes, `hostile query on ${ep}`);
}

// 11. Robots, Sitemap, and Static Assets
const headRobots = await get("/robots.txt", { method: "HEAD" });
check(headRobots.status === 200, "HEAD /robots.txt -> 200");
const robotsRes = await get("/robots.txt");
check(robotsRes.status === 200 && (await robotsRes.text()).includes("sitemap.xml"), "GET /robots.txt ok");
checkSecurityHeaders(robotsRes, "GET /robots.txt");

const headSitemap = await get("/sitemap.xml", { method: "HEAD" });
check(headSitemap.status === 200, "HEAD /sitemap.xml -> 200");
const sitemapRes = await get("/sitemap.xml");
const sitemapXml = await sitemapRes.text();
check(sitemapRes.status === 200 && sitemapXml.includes("urlset"), "GET /sitemap.xml ok");
checkSecurityHeaders(sitemapRes, "GET /sitemap.xml");
const sitemapPaths = [...sitemapXml.matchAll(/<loc>https?:\/\/[^/<]+(\/[^<]*)?<\/loc>/g)].map(m => m[1] || "/");
check(sitemapPaths.length === pages.length && pages.every(p => sitemapPaths.includes(p)), "GET /sitemap.xml paths match all site pages");

const iconRes = await get("/icon.svg");
check(iconRes.status === 200 && (await iconRes.text()).includes("<svg"), "GET /icon.svg returns SVG");
checkSecurityHeaders(iconRes, "GET /icon.svg");

const ogRes = await get("/og.png");
check(ogRes.status === 200 && (ogRes.headers.get("content-type") || "").includes("image/png"), "GET /og.png returns PNG");
checkSecurityHeaders(ogRes, "GET /og.png");

// 12. Crawl internal page links and #anchor fragments
const links = new Set();
const pageIds = new Map();
const hashLinks = [];
for (const path of pages) {
  const r = await get(path);
  check(r.status === 200, `GET ${path} -> 200`);
  checkSecurityHeaders(r, `GET ${path}`);
  const html = await r.text();
  check(html.includes('rel="canonical"'), `GET ${path} includes canonical link`);
  check(html.includes('property="og:image"'), `GET ${path} includes og:image meta tag`);
  check(html.includes('id="main"'), `GET ${path} includes #main skip target`);
  const mains = [...html.matchAll(/<main\b/g)];
  check(mains.length === 1, `GET ${path} has exactly 1 <main>`);
  const h1s = [...html.matchAll(/<h1\b/g)];
  check(h1s.length === 1, `GET ${path} has exactly 1 <h1>`);
  const positiveTabindex = [...html.matchAll(/\btabindex="([1-9]\d*)"/gi)];
  check(positiveTabindex.length === 0, `GET ${path} has zero positive tabindex elements`);
  const emptyHeadings = [...html.matchAll(/<h([1-6])\b[^>]*>\s*<\/h\1>/gi)];
  check(emptyHeadings.length === 0, `GET ${path} has zero empty headings`);
  pageIds.set(path, new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1])));
  for (const m of html.matchAll(/href="(\/[^"#?]*)(?:#([^"?]+))?(?:\?[^"]*)?"/g)) {
    links.add(m[1]);
    if (m[2]) hashLinks.push({ from: path, targetPath: m[1], hash: m[2] });
  }
  for (const m of html.matchAll(/href="#([^"]+)"/g)) {
    hashLinks.push({ from: path, targetPath: path, hash: m[1] });
  }
}
for (const l of links) {
  if (seen.has(l) || l.startsWith("/_next/")) continue;
  const r = await get(l);
  check(r.status === 200, `internal link ${l} resolves (${r.status})`);
}
for (const { from, targetPath, hash } of hashLinks) {
  const ids = pageIds.get(targetPath);
  check(Boolean(ids && ids.has(hash)), `anchor ${targetPath}#${hash} (linked from ${from}) resolves to DOM id`);
}

if (failures.length) { console.error(`\n${failures.length} smoke check(s) failed`); process.exit(1); }
console.log("\nall smoke checks passed");
