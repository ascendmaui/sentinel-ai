# Seraphim Scan AI (site)

**Source of truth:** [docs/SOURCE_OF_TRUTH.md](docs/SOURCE_OF_TRUTH.md). Pipeline sketch: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

Marketing and scan site for **Seraphim Scan AI** (formerly Seraphim AI in the UI). The GitHub repo and the Vercel project are still `sentinel-ai`. Intended domain `seraphimscanai.com` is not confirmed here.

The product is a passive scan with a written report (Basic through Full), plus human Scoped Assessments (Seraphim, Cherubim, Thrones, Angels) when a person and a written scope are required.

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

Automated scans are passive public checks only. A human Scoped Assessment is a separate written engagement. Checks that cannot be run are marked pending. Active testing is not auto-run and is not given fake results. No monitoring platform, sensors, certifications, client logos, or invented statistics.

## Develop

```bash
npm install
npm test
npm run dev
```

`npm test` covers the SSRF guard, secret redaction, and report serializer. `npm run build` is the release check.

## Deploy

Vercel project linked to this repo. Pull requests get preview deployments; production deploys only from `main`.
