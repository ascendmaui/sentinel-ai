#!/usr/bin/env node
// Black-box smoke test against a running server: node scripts/smoke.mjs [baseUrl]
// Checks pages, API contracts, error handling, and that every internal link on every page resolves.
const base = (process.argv[2] || process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const failures = [];
const check = (ok, msg) => { if (!ok) { failures.push(msg); console.error(`FAIL ${msg}`); } else console.log(`ok   ${msg}`); };
const get = (path, init) => fetch(base + path, { redirect: "manual", ...init });

const pages = ["/", "/pricing", "/blog", "/case-studies", "/incident-case-studies"];
const seen = new Set(pages);

const posts = await (await get("/api/posts")).json();
check(Array.isArray(posts.posts) && posts.count === posts.posts.length && posts.count > 0, "GET /api/posts shape");
for (const p of posts.posts) { pages.push(p.url); seen.add(p.url); }

const h = await get("/api/health");
check(h.status === 200 && (await h.json()).status === "ok", "GET /api/health ok");
check(h.headers.get("cache-control") === "no-store", "/api/health is not cacheable");

for (const p of posts.posts) {
  const r = await get(`/api/posts/${p.slug}`);
  const b = await r.json();
  check(r.status === 200 && b.slug === p.slug && b.sources.every(Boolean), `GET /api/posts/${p.slug}`);
}
const missing = await get("/api/posts/does-not-exist");
check(missing.status === 404 && (await missing.json()).error === "not_found", "unknown post -> JSON 404");
const post = await get("/api/health", { method: "POST" });
check(post.status === 405, "POST /api/health -> 405");
check((await get("/blog/does-not-exist")).status === 404, "unknown blog page -> 404");

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
