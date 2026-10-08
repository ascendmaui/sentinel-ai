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

All endpoints export HTTP/REST JSON contracts with security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, `X-DNS-Prefetch-Control: off`) and short-lived public caching:

- `GET /api/health`: Service liveness, current environment, and commit SHA (zero secrets exposed).
- `GET /api/posts`: Blog post index and metadata (newest first).
- `GET /api/posts/[slug]`: Post detail with resolved primary sources.
- `GET /api/incidents`: Documented incident list with source counts and disclaimer.
- `GET /api/incidents/[id]`: Incident breakdown with timeline and verified references.
- `GET /api/scenarios`: Conceptual threat scenarios with speed and control comparisons.
- `GET /api/scenarios/[id]`: Scenario details with defender controls and related sources.
- `GET /api/case-studies`: Remediation findings and severity distributions.
- `GET /api/case-studies/[id]`: Finding details with before/after fixes and remediation verification notes.
- `GET /api/tiers`: Service tier matrix, comparison details, and engagement terms.
- `GET /api/tiers/[id]`: Single tier deliverables, target audience, and exclusions.
- `GET /api/sources`: Authoritative primary and secondary sources registry.
- `GET /api/sources/[id]`: Single source record with URL and credibility note.
- `GET /api/brand`: Brand identity metadata, contact mailto, trust badges, and theme configuration.

## Metadata & Discovery

- `GET /robots.txt`: Generated dynamically via `app/robots.ts`, referencing the XML sitemap.
- `GET /sitemap.xml`: Generated dynamically via `app/sitemap.ts` including all main pages and blog posts.
- `/_not-found`: Branded custom 404 handler (`app/not-found.tsx`) with helpful navigation links.

## Verification & Testing

- `npm test`: Run 89 unit, content integrity, and API integration test suites via Vitest.
- `npm run typecheck`: Strict TypeScript typecheck across all routes and components (`tsc --noEmit`).
- `npm run smoke`: Black-box smoke test validating running server endpoints, API contracts, 404 responses, and internal link resolution.
- `npm run build`: Production Next.js build generating static HTML and JSON routes with SSG.

## Develop

```bash
npm install
npm run dev
```

## Deploy

Vercel project linked to this repo. Pull requests get preview deployments; production deploys only from `main`.

