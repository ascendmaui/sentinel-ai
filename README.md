# Seraphim AI (site)

Marketing site for **Seraphim AI**: scoped security assessments for teams shipping AI agents, in three phases (Recon, Scoped Assessment, Remediation and Retest), plus a four-tier service line (Seraphim, Cherubim, Thrones, Angels).

The brand name is a single constant: `lib/brand.ts` (`BRAND_NAME`). Change it there and the whole site follows. The logo SVGs contain no text.

## Stack

- Next.js 15 App Router, React 19, TypeScript. No extra runtime dependencies.
- Design tokens and globals adapted from Ascend Maui / Agent Overlord (`app/tokens.css`, `app/globals.css`)
- Dark / light / high-contrast themes (dark is the default)
- Hero figure: `components/HeroFigure.tsx` (canvas, respects `prefers-reduced-motion`, static SVG fallback)
- Optional faint background code layer: `components/CodeRain.tsx`, disable with `SHOW_CODE_RAIN = false` in `lib/brand.ts`

## Content

- `app/incident-case-studies/page.tsx` and `lib/incidents.ts`: sourced incident case studies and hypothetical scenarios
- `app/blog/` and `lib/posts.ts`: blog index and posts
- `app/pricing/page.tsx` and `lib/tiers.ts`: tier comparison and tier anchors
- `app/case-studies/page.tsx`: self-engagement case study

## Honesty rules for copy

Everything on the site describes the service as it is today: passive public recon, Scoped Assessments with written client authorization, remediation guidance and retest, private local models for scenario design. No monitoring platform, sensors, certifications, client logos or invented statistics.

## API Routes

All endpoints export HTTP/REST JSON contracts with security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, `X-DNS-Prefetch-Control: off`), ISO timestamps, and short-lived public caching. Index endpoints support query parameter filtering:

- `GET /api/health`: Service liveness, current environment, timestamp, and commit SHA (zero secrets exposed).
- `GET /api/posts`: Blog post index and metadata (newest first by default). Supports `?slug=`, `?id=`, `?title=`, `?tier=`, `?source=`, `?ref=`, `?year=`, `?date=`, `?readMins=`, `?read_mins=`, `?q=`, `?order=`, `?sort=`, `?offset=`, `?limit=`, `?take=`, and `?page=`.
- `GET /api/posts/[slug]`: Post detail with resolved primary sources. Supports flexible slashes, case-insensitivity, URL-encoding, and `.json`/`.html` suffixes.
- `GET /api/incidents`: Documented incident list with source counts, unverified claims, and disclaimer. Supports `?id=`, `?n=`, `?source=`, `?ref=`, `?year=`, `?date=`, `?title=`, `?standing=`, `?kicker=`, `?vuln=`, `?cve=`, `?impact=`, `?q=`, `?order=`, `?sort=`, `?offset=`, `?limit=`, `?take=`, and `?page=`.
- `GET /api/incidents/[id]`: Incident breakdown with timeline and verified references. Supports lookup by ID, incident number (`01`, `1`, `001`), prefix (`case-01`, `incident-01`, `inc-1`, `case_01`, `i-01`, `i-1`, `i1`, `inc01`), URL-encoding, and `.json`/`.html` suffixes.
- `GET /api/scenarios`: Conceptual threat scenarios with speed and control comparisons. Supports `?id=`, `?n=`, `?title=`, `?ref=`, `?source=`, `?weakness=`, `?weakness_class=`, `?target=`, `?control=`, `?speed=`, `?approach=`, `?q=`, `?order=`, `?sort=`, `?offset=`, `?limit=`, `?take=`, and `?page=`.
- `GET /api/scenarios/[id]`: Scenario details with defender controls and related sources. Supports lookup by ID, scenario number (`H1`, `1`, `h01`), prefix (`scenario-h1`, `scenario_h1`, `sc-1`, `h-1`), URL-encoding, and `.json`/`.html` suffixes.
- `GET /api/case-studies`: Remediation findings and severity distributions. Supports `?id=`, `?n=`, `?title=`, `?severity=`, `?sev=`, `?status=`, `?q=`, `?order=`, `?sort=`, `?offset=`, `?limit=`, `?take=`, and `?page=`.
- `GET /api/case-studies/[id]`: Finding details with before/after fixes and remediation verification notes. Supports lookup by ID, single-digit ID (`f-1`, `f1`, `1`, `01`), hyphenless ID (`f01`), prefix (`finding-01`, `finding_01`, `fix-f-01`, `fix-1`, `cs-01`, `cs-1`, `case-study-01`), URL-encoding, and `.json`/`.html` suffixes.
- `GET /api/tiers`: Service tier matrix, comparison details, and engagement terms. Supports `?id=`, `?tier=`, `?name=`, `?cadence=`, `?positioning=`, `?rank=`, `?tier_rank=`, `?q=`, `?order=`, `?sort=`, `?offset=`, `?limit=`, `?take=`, and `?page=`.
- `GET /api/tiers/[id]`: Single tier deliverables, target audience, and exclusions. Supports lookup by ID, rank number (`1`, `01`), prefix (`tier-seraphim`, `tier_seraphim`, `tier-1`, `tier-01`, `tier_01`, `t1`, `t01`, `t-1`, `t_1`, `+1`), URL-encoding, and `.json`/`.html` suffixes.
- `GET /api/sources`: Authoritative primary and secondary sources registry. Supports `?id=`, `?source=`, `?ref=`, `?slug=`, `?n=`, `?title=`, `?label=`, `?q=`, `?year=`, `?date=`, `?note=`, `?type=`, `?order=`, `?sort=`, `?offset=`, `?limit=`, `?take=`, and `?page=`.
- `GET /api/sources/[id]`: Single source record with URL and credibility note. Supports lookup by ID, 1-based index (`1`, `01`), prefix (`src-oaiAug`, `src_oaiAug`, `source-oaiAug`, `s-1`, `s_1`, `s1`), URL-encoding, and `.json`/`.html` suffixes.
- `GET /api/brand`: Brand identity metadata, contact mailto, trust badges, and theme configuration. Supports `?badge=`, `?badge_key=`, `?key=`, `?id=`, `?slug=`, or `?n=` query filter with numeric (`1`, `01`), prefix (`badge-passive`, `b-1`, `b1`), and URL-encoding resilience.

## Metadata & Discovery

- `GET /robots.txt`: Generated dynamically via `app/robots.ts`, referencing the XML sitemap.
- `GET /sitemap.xml`: Generated dynamically via `app/sitemap.ts` including all main pages and blog posts.
- `/_not-found`: Branded custom 404 handler (`app/not-found.tsx`) with helpful navigation links.

## Verification & Testing

- `npm test`: Run 363 unit, component, page, content integrity, route contract, and API integration tests via Vitest across 5 test suites.
- `npm run test:contract`: Run API route contract discovery and security header verification tests.
- `npm run test:integration`: Run API endpoint integration tests.
- `npm run test:components`: Run UI component tests (icons, emblems, logo mark, trust badges, nav, footer).
- `npm run test:pages`: Run React Server Component page tests and metadata tests.
- `npm run test:content`: Run content integrity and relationship verification tests.
- `npm run typecheck`: Strict TypeScript typecheck across all routes, components, and tests (`tsc --noEmit`).
- `npm run smoke`: Black-box smoke test validating running server endpoints, API contracts, query filtering, 404 responses, and internal link resolution.
- `npm run build`: Production Next.js build generating static HTML and JSON routes with SSG.

## Develop

```bash
npm install
npm run dev
```

## Deploy

Vercel project linked to this repo. Pull requests get preview deployments; production deploys only from `main`.

