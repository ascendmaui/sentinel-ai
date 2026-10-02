# Seraphim Scan AI — source of truth

Status date: 2026-10-01. This file is the project snapshot for John Matveyev / Ascend Maui. It describes the repository as of the draft scan-product branch. It is not a legal claim, a certificate, or a statement that the intended domain is live.

**Do not merge this branch to `main`, and do not promote a production deploy, until John reviews it.**

## Names

| What | Value | Notes |
| --- | --- | --- |
| Customer-facing name | **Seraphim Scan AI** | Single constant `BRAND_NAME` in `lib/brand.ts`. The wordmark is derived from it. |
| Former public name | **Seraphim AI** | Used on the marketing site that shipped 2026-09-29. `BRAND_FORMER_NAME`. |
| Repo and Vercel project | **sentinel-ai** | https://github.com/ascendmaui/sentinel-ai. The Vercel project was not renamed. |
| Intended domain | **seraphimscanai.com** | Status unknown until DNS is checked. Do not describe it as live. |
| Known live preview | https://sentinel-ai-tawny.vercel.app | Production host from the earlier site. This draft must not be promoted over it until review. |
| Parent | Ascend Maui | `BRAND_PARENT`. Contact mailbox remains `ascendmaui@gmail.com`. |
| Tagline | Passive scans and reports for rogue-AI exposure | The v1 engine is deterministic. It does not call a model to invent findings. |

Logo SVGs (`components/Logo.tsx`, `app/icon.svg`) contain no text, so a rename does not touch them.

Trademark and domain clearance were already flagged as high risk on the Seraphim AI name (SeraphimOS, seraphimai.com / .io, @seraphimai). That clearance is still open. This document does not add a new clearance.

## What shipped on `main` before this draft

Commit `38e4d93` — *Incident Case Studies, blog, four-tier services, Seraphim AI rebrand* (#4).

The site on `main` is a **Next.js 15 marketing site** for human-led security work. It is not a scanner.

- Three phases in the copy: Recon, Scoped Assessment, Remediation and Retest.
- Four **human** service tiers in `lib/tiers.ts`: Seraphim, Cherubim, Thrones, Angels. No dollar prices.
- Pages: `/`, `/pricing`, `/blog`, `/blog/[slug]`, `/case-studies`, `/incident-case-studies`.
- Content: sourced incident studies (`lib/incidents.ts`, `lib/sources.ts`), four blog posts (`lib/posts.ts`), one self-engagement case study of an airport ride platform (`lib/caseStudies.ts`).
- Design: tokens from Ascend Maui / Agent Overlord (`app/tokens.css`, `lib/tokens.json`), dark / light / high-contrast (`lib/theme.ts`), canvas hero, optional code-rain.
- Honesty rule on `main`: no monitoring platform, no sensors, no self-serve scanner, no certifications, no client logos, no invented statistics.

### Prior pull requests

| PR | Branch | Merged | What landed |
| --- | --- | --- | --- |
| #1 | `case-studies-draft` | 2026-09-29 | Case study: airport ride platform self-engagement |
| #2 | `case-study-remediation` | 2026-09-29 | Remediation section, findings F-01..F-08 as of 2026-09-29 |
| #3 | `scoped-assessment-wording` | 2026-09-29 | Reword to Scoped Assessment phases; drop offensive wording |
| #4 | `incident-case-studies-seraphim-ai` | 2026-09-29 | Incidents, blog, four tiers, Seraphim AI rebrand |
| #5 | `cursor/seraphim-scan-product-6e7d` | Draft (Open) | Passive scan product and source of truth |
| #7 | `feat/max-agy6-seraphim-0820` | Draft (Open) | Smoke tests, brand consistency, Next.js security headers, robots/sitemap crawler boundary, and CI/README hardening |
| #8 | `feat/max-agy6-smoke-ci-0413` | Draft (Open) | LLM key redaction (OpenAI/Anthropic/Gemini), container/k8s SSRF guards, DNS/CT preflight checks, COOP/cross-domain headers, and content schema validation (40 smoke tests, 85 total) |
| #9 | `feat/max-agy6-smoke-ci-0807` | Draft (Open) | Non-standard numeric/octal SSRF guards, HuggingFace/SendGrid/Postman redaction, CORP/Origin-Agent-Cluster headers, poweredByHeader suppression, and Cloudflare edge IP extraction (46 smoke tests, 96 total) |

There is no auth, database, payment, or scanner code on `main`.

## What this draft adds

A passive scan product beside the human tiers. The human tiers stay. The scan does not replace them.

- `lib/scanTiers.ts` — Basic / Angels, Standard / Thrones, Advanced / Cherubim, Full / Seraphim.
- `lib/scan/` — SSRF policy, passive observation, report builder, in-memory store, request parser.
- `POST /api/scan` and `GET /api/scan/[id]`.
- `/scan` request flow and `/report/[id]` report view.
- Home and pricing now sell the scan and keep the Scoped Assessment upsell.
- `.env.example` names only. `docs/ARCHITECTURE.md` for the pipeline.
- Unit tests for the SSRF guard, redaction, and report serializer. `npm test`.
- Smoke test suite in `lib/scan/smoke.test.ts` (46 smoke tests, 96 total tests across 24 suites) covering brand consistency, tiers, SSRF, tokens, limits, API routes, report engine invariants, LLM and cloud secret redactions (OpenAI, Anthropic, Gemini, Hugging Face, SendGrid, Postman), security headers, search crawler boundaries, DNS/CT pre-flight guards, non-standard octal/hex hostnames, edge client IP resolution, and editorial schema invariants. `npm run test:smoke`.
- Hardened HTTP security headers in `next.config.mjs` (HSTS, nosniff, DENY frame-ancestors, strict-origin referrer, permissions policy, Cross-Origin-Opener-Policy: same-origin, Cross-Origin-Resource-Policy: same-origin, Origin-Agent-Cluster: ?1, poweredByHeader: false, X-Permitted-Cross-Domain-Policies: none).
- Search engine and privacy perimeter in `app/robots.ts` and `app/sitemap.ts` (protecting private/ephemeral scan and API routes while indexing marketing/blog routes).

## Stack

- Next.js 15 App Router, React 19, TypeScript. No extra runtime dependencies.
- Node built-ins for DNS, HTTP, and TLS. No paid recon APIs.
- Deploy target remains Vercel. Pull requests get preview deployments; production deploys from `main` only. `.vercelignore` excludes markdown, so these docs are not the deployed site.
- Package name in `package.json` is still `seraphim-ai-site`.
- Hardened CI workflow in `.github/workflows/ci.yml` running static type checks (`npm run typecheck`), smoke tests (`npm run test:smoke`), unit tests (`npm test`), and production build checks (`npm run build`).

## File map

| Path | Role |
| --- | --- |
| `lib/brand.ts` | Display name, tagline, badges, intended domain, repo slug |
| `lib/tiers.ts` | Human Scoped Assessment tiers |
| `lib/scanTiers.ts` | Automated scan products |
| `lib/scan/ssrf.ts` | URL and address policy, connect-time lookup guard |
| `lib/scan/observe.ts` | DNS, TLS on 443, one homepage fetch, optional same-host files, CT query |
| `lib/scan/parse.ts` | Headers, cookies, HTML hints, secret redaction |
| `lib/scan/report.ts` | Findings, scores, remediation template |
| `lib/scan/store.ts` | Signed id and in-memory report map |
| `lib/scan/run.ts` | Orchestrates one passive scan |
| `lib/scan/smoke.test.ts` | Comprehensive smoke tests (34 assertions) |
| `lib/posts.ts`, `lib/incidents.ts`, `lib/caseStudies.ts`, `lib/sources.ts` | Editorial content |
| `app/page.tsx`, `app/pricing/page.tsx` | Marketing |
| `app/scan/page.tsx`, `app/report/[id]/page.tsx` | Scan and report UI |
| `app/api/scan/` | Scan API |
| `app/robots.ts`, `app/sitemap.ts` | Search engine & crawler perimeter |
| `app/blog/`, `app/case-studies/`, `app/incident-case-studies/` | Existing content pages |
| `components/` | Nav, footer, hero, tier emblems, scan form, report view |
| `next.config.mjs` | Build configuration and strict security response headers |
| `docs/SOURCE_OF_TRUTH.md`, `docs/ARCHITECTURE.md` | This snapshot and the pipeline sketch |

## Scan tiers

Angel class names match the human ladder (Angels entry, Seraphim fullest) so the mythology stays, but the products are different. A Basic scan is not the Angels human engagement.

| Tier | Class | What the code runs | What it refuses to run |
| --- | --- | --- | --- |
| Basic | Angels | DNS (address, NS, MX, SPF, DMARC), TLS certificate on port 443, response headers, certificate-transparency query | Page mining, score, robots, anything active |
| Standard | Thrones | Basic, plus header score, cookie flags (values discarded), homepage title and forms, `/.well-known/security.txt` | Script inventory, secret scan, robots, sitemap |
| Advanced | Cherubim | Standard, plus third-party script hosts, public AI/chat hints, redacted secret-shaped strings in the fetched HTML, `robots.txt`, same-host sitemap | Live prompt injection, authenticated testing |
| Full | Seraphim | Advanced, plus a remediation-plan template and a retest checklist generated from failed checks | The manual section is listed as `requires-engagement` and is not executed |

Certificate transparency calls `crt.sh` with the hostname only. If that public lookup fails, the row is `pending`. It is not scored as a site defect.

Mail checks drop a single left-hand label (`www.example.com` → `example.com`). That is not a public-suffix list. Multi-part suffixes such as `.co.uk` can be wrong, and the report says so.

## Gap list

Still absent, on purpose:

- **No accounts or auth.** The authorization control is a required checkbox plus server-side `authorization: true`. It is an affirmation, not a verified contract.
- **No database.** Reports sit in process memory (about two hours, capped) and in `sessionStorage` of the browser that submitted. A serverless isolate that did not handle the POST will not have the report. The page says when a link has expired.
- **No real scanner engine beyond passive checks.** No port scan, no login, no exploit payloads, no prompt-injection messages sent to the target, no crawl of a whole site.
- **No payments.** Stripe names exist only in `.env.example`.
- **No report email and no queue worker.** `SCAN_WORKER_SECRET` is unused.
- **No certifications, client logos, or invented metrics.** Badges in `TRUE_BADGES` are limited to statements the product can actually make.
- **Honesty versus the new direction.** Older copy said there was no self-serve scanner. There is now a passive self-serve scan. Human Scoped Assessments are still not self-serve. Monitoring, sensors, and a SOC are still not offered. Blog posts that described the service were adjusted so they do not deny the passive scan or claim a detection product.

## Target architecture

Today: browser → `POST /api/scan` → SSRF gate → passive checks → JSON report → memory + browser → `/report/[id]`.

Next, when John wants it: the API enqueues a job, a worker runs the same passive checks, Postgres (`DATABASE_URL`) stores the report, and email delivers it. Active testing stays outside that pipeline until a written scope exists. The sketch is `docs/ARCHITECTURE.md`.

## Security boundaries in this code

- Schemes other than http and https are rejected. Userinfo is rejected. Ports other than 80 and 443 are rejected.
- Hostnames such as `localhost`, `.local`, `.internal`, and cloud metadata names are rejected, as are decimal and hex IP spellings.
- IPv4 private, loopback, link-local (including `169.254.169.254`), CGNAT, documentation, multicast, and reserved ranges are rejected. IPv6 unique-local, link-local, mapped private IPv4, 6to4-to-private, Teredo, and documentation ranges are rejected. Non-global IPv6 is rejected.
- The HTTP and TLS sockets use a lookup callback that refuses the connect if any resolved address is blocked.
- Redirects are limited and re-checked. `robots.txt`, `sitemap.xml`, and `security.txt` do not follow a redirect onto another host.
- Response bodies are capped. Cookie values are dropped before the report is built. Secret-shaped strings are redacted in evidence.
- The in-memory rate limit is 6 scans per 10 minutes per forwarded address. It is per isolate, not a global control.

Residual risk John should know: the checkbox does not prove ownership. A visitor can still point the passive fetch at a public site they do not own. The fetch is one GET plus DNS and a TLS handshake, which is the same class of request a browser makes, but it is still unsolicited if the affirmation is false. See open decisions.

## Open decisions for John

1. **Prices.** No dollar amounts are published. Scan tiers use positioning words only. Human tiers are unchanged on that point.
2. **Legal authorization.** Is a checkbox enough for a passive public fetch, or do you want a signed scope, an account, and a domain-control check before any request is sent?
3. **What active scanning is allowed.** This draft does not run it. If a future engagement may include authenticated testing or live prompt-injection exercises, that needs a written scope, a window, and a stop condition. It should not be switched on inside `/api/scan`.
4. **Domain.** Confirm whether `seraphimscanai.com` is registered and where DNS should point. Repo and Vercel can stay `sentinel-ai` until you want them renamed.
5. **Brand risk.** The earlier Seraphim AI clearance note is unresolved.
6. **Storage.** Which database, and how long a report is retained.
7. **Abuse.** The memory rate limit will not hold on Vercel. Decide a real limit, a captcha, or an allow-list before this is public.
8. **Email and payments.** When a report should be mailed, and whether Stripe is in scope at all.
9. **Certificate transparency.** `crt.sh` is a best-effort public lookup. Replace or drop it if you do not want a third-party query.
10. **Preview versus production.** This PR is draft-only. Production stays on the current `main` deploy until you say otherwise.

## How to run

```bash
npm install
npm run typecheck
npm run test:smoke
npm test
npm run dev
```

Open `/scan`, use a site you are authorized to check (or `https://example.com` as a harmless public fixture), and affirm the checkbox. `npm run build` must pass before the draft is treated as ready for review.
