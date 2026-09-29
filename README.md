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

## Develop

```bash
npm install
npm run dev
```

## Deploy

Vercel project linked to this repo. Pull requests get preview deployments; production deploys only from `main`.
