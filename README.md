# Seraphim Scan AI (site)

[![CI](https://github.com/ascendmaui/sentinel-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/ascendmaui/sentinel-ai/actions/workflows/ci.yml)

**Source of truth:** [docs/SOURCE_OF_TRUTH.md](docs/SOURCE_OF_TRUTH.md). Pipeline sketch: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

Marketing and scan site for **Seraphim Scan AI** (formerly Seraphim AI in the UI). The GitHub repo and the Vercel project remain `sentinel-ai`. Intended domain `seraphimscanai.com` is pending confirmation.

The product is a passive public scan with a written report (Basic through Full), plus human Scoped Assessments (Seraphim, Cherubim, Thrones, Angels) when an assessor and a written scope are required.

The brand name is a single constant: `lib/brand.ts` (`BRAND_NAME`). Change it there and all pages, metadata, nav, footer, and wordmarks follow. Logo SVGs (`components/Logo.tsx`, `app/icon.svg`) contain no text.

## Stack

- Next.js 15 App Router, React 19, TypeScript. No extra runtime dependencies.
- Design tokens and globals adapted from Ascend Maui / Agent Overlord (`app/tokens.css`, `app/globals.css`, `lib/tokens.json`)
- Dark / light / high-contrast themes (dark is the default)
- Hero figure: `components/HeroFigure.tsx` (canvas, respects `prefers-reduced-motion`, static SVG fallback)
- Optional faint background code layer: `components/CodeRain.tsx`, disable with `SHOW_CODE_RAIN = false` in `lib/brand.ts`

## Security Boundaries & Honesty Rules

- **Strict SSRF Boundary:** Only public `http` and `https` schemes on ports `80` and `443` are permitted. All loopback, RFC 1918 private, link-local / cloud metadata (`169.254.169.254`), CGNAT (`100.64.0.0/10`), anycast 6to4 relay (`192.88.99.0/24`), AMT (`192.52.193.0/24`), AS112 (`192.175.48.0/24`), multicast, documentation (`2001:db8::/32`), benchmarking, overlay, and non-global IPv6 ranges are blocked at parse time and connection lookup time (`lib/scan/ssrf.ts`). Dotted-octal addresses with leading zeros (`0177.0.0.1`, `127.000.000.001`), hex representations (`0x7f000001`, `0x7f.0.0.1`), truncated numeric quads (`127.1`, `127.0.1`), integer IPs (`2130706433`), special-use domains and TLDs (RFC 2606, RFC 6761, RFC 7686, RFC 8375, RFC 9476: `.test`, `.invalid`, `.localhost`, `.local`, `.internal`, `.onion`, `.home.arpa`, `.lan`, `.corp`, `.home`, `.alt`, `.example`), container/orchestration hostnames (`docker.internal`, `.cluster.local`, `.svc`), loopback wildcard resolvers (`*.nip.io`, `*.sslip.io`, `*.localtest.me`, `*.lvh.me`, `*.vcap.me`), and cloud metadata hostnames (`instance-data`, `metadata.google.internal`) are rejected unconditionally. Both `observeDns` and `observeCt` perform pre-flight checks to prevent DNS queries or network requests to blocked hostnames.
- **Passive Only & Evidence Redaction:** Automated scans are strictly passive public checks (DNS, TLS on port 443, public headers, and basic homepage heuristics). No active probing, port scanning, prompt injection attacks, authenticated testing, or crawler swarms are ever executed. Checks that cannot be completed remain marked as `pending`. Any secret-shaped token discovered in evidence (AWS keys, private keys, live Stripe secrets, OpenAI project/admin keys, Anthropic keys, Google Gemini keys, Hugging Face user tokens, SendGrid API keys, Postman API keys, GitHub tokens, Slack tokens) is automatically redacted (`[redacted]`), cookie session values are completely discarded, and company names are sanitized against control characters and tag smuggling.
- **HTTP Security Headers & Tracing Boundary:** Native Next.js response headers (`next.config.mjs`) enforce `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`, `Origin-Agent-Cluster: ?1`, `X-Permitted-Cross-Domain-Policies: none`, suppress technology disclosure (`poweredByHeader: false`), and disable DNS prefetch.
- **Search Engine & Crawler Perimeter:** Search engine routes (`app/robots.ts`, `app/sitemap.ts`) index canonical marketing and technical blog pages while explicitly disallowing automated crawling of `/api/` and ephemeral report sessions `/report/`.
- **Human Scoped Assessments:** Deep technical review (tool permissions, secret sprawl, agent sandboxes, prompt injection defenses) is delivered exclusively by people through written client engagements.
- **No Deceptive Claims:** No monitoring platform, no persistent background sensors, no unverified certifications (SOC 2, ISO), no fictitious client logos, and no invented statistics.
- **Zero Secrets & Ephemeral Store:** In-memory store uses HMAC-SHA256 signed tokens (`id~mac`) with a 2-hour TTL and LRU pruning (`lib/scan/store.ts`). Edge-aware rate limiter resolves `cf-connecting-ip`, `x-forwarded-for`, and `x-real-ip` to protect serverless resources. `.env.example` contains variable names only without values.

## Content Map

- `app/scan/page.tsx` and `app/report/[id]/page.tsx`: Passive scan intake and report viewer
- `app/incident-case-studies/page.tsx` and `lib/incidents.ts`: Sourced incident case studies and hypothetical scenarios
- `app/blog/` and `lib/posts.ts`: Technical blog index and posts
- `app/pricing/page.tsx`, `lib/scanTiers.ts`, and `lib/tiers.ts`: Automated scan tiers and human assessment comparisons
- `app/case-studies/page.tsx`: Self-engagement case study
- `app/robots.ts` and `app/sitemap.ts`: Dynamic metadata route generation

## Develop & Verify

```bash
# Clean install of dependencies
npm ci

# Run TypeScript static type check
npm run typecheck

# Run smoke tests (46 smoke tests: brand invariants, tiers, SSRF boundaries, store tokens, rate limiters, API routes, report engine, LLM & cloud key redactions, security headers, robots/sitemap, DNS/CT preflight guards, octal/hex SSRF defenses, edge IP precedence, editorial schemas)
npm run test:smoke

# Run complete test suite (unit + smoke tests)
npm test

# Run release build and type check
npm run build

# Start local development server
npm run dev
```

## CI/CD & Deploy Guardrails

- **GitHub Actions CI:** Configured in `.github/workflows/ci.yml`. Enforces clean install (`npm ci`), smoke tests (`npm run test:smoke`), full test suite (`npm test`), and production build verification (`npm run build`) on every push and pull request.
- **Draft PR Policy:** Pull requests are created as drafts until reviewed. Do not merge directly to `main`.
- **Deployments:** Vercel project is linked to `ascendmaui/sentinel-ai`. Pull requests generate preview deployments; production deploys only from `main` (`sentinel-ai-tawny.vercel.app`). Never promote production builds or apply infrastructure migrations without authorization.
