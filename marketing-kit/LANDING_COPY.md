# Landing copy

Lines below are the public site's own wording, or a direct shortening of it. Sources: `app/page.tsx`, `app/pricing/page.tsx`, `app/start/page.tsx`, `lib/brand.ts`, `lib/tiers.ts`, `lib/lead.ts`, `components/HaloIncluded.tsx`, and `lib/pipeline/report.ts`.

The live homepage button joins "Run your Halo Scan" and "$99" with an em dash. Kit artwork uses "Get the $99 Halo Scan", which is the button on the homepage Halo card and on the pricing page, so the artwork follows the no-em-dash rule in `public/partners-kit/docs/brand-guide.md`.

## Hero

Eyebrow: Scoped security assessments

Headline: Rogue AI agents are already probing your sites and systems.

Primary button: Get the $99 Halo Scan

Secondary button: See the phases

Fine print: Always scoped. Built by Ascend Maui.

## Subhead

Seraphim Scan finds the gaps before they do.

Longer subhead, from the homepage lead: Seraphim Scan helps teams that ship AI agents run scoped security work in three clear phases: passive recon, a Scoped Assessment with written client authorization, and remediation with retest, so you learn where the real risk is and how to close it.

Tagline, when a single line is enough: Scoped security assessments for the age of AI agents.

Slogan, for a closing band: In the age of AI, fight rogue agents with Seraphim Scan.

## Features

### Three phases

1. Recon. Passive review of public information: the hosts, apps, and exposures that can be seen from outside, so the next phase is aimed at what matters, not noise.
2. Scoped Assessment. Scenario design with private local models, carried out within an agreed scope. Findings are documented and the work stops at the boundaries you set.
3. Remediation and Retest. Turn findings into ranked fixes, clear owners, and verification steps, then retest so engineering can confirm the gaps are closed.

### How an engagement starts

1. Define scope. Agree on systems, accounts, windows, and hard stop conditions. Nothing starts without a written scope.
2. Run the three phases. Recon, Scoped Assessment, then Remediation and Retest, reported as you go.
3. Verify and hand off. Confirm critical fixes, leave a durable record, and leave the door open for a follow-up pass when the stack changes.

### Who it is for

- Security and AppSec teams. Need clear evidence of risk within an agreed scope, not another unchecked scanner dump.
- Founders and product leads. Shipping fast and want a sober read on real risk before launch or fundraising diligence.
- Compliance and risk owners. Require scoped assessments with audit-friendly notes and remediation trails.

### Halo Scan, the priced product

$99, flat, one time.

A full passive perimeter sweep of the one domain you authorize: DNS and mail authentication, TLS, security headers, and certificate transparency. Every finding is checked a second time. Anything that does not reproduce is dropped. The branded PDF lists severity, evidence, and a fix for each finding.

Timeline on the pricing page: automated passive checks start after payment. The PDF is usually emailed within minutes, and always within 3 business days.

Checks the pipeline actually runs (`components/HaloIncluded.tsx`, `lib/pipeline/scan.ts`):

- TLS certificate on port 443: issuer, subject, expiry, flagged if under 21 days
- HTTP security headers: HSTS, Content-Security-Policy, clickjacking protection, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and software version headers
- Secure and HttpOnly flags on cookies set by the homepage
- DNS and email: A, AAAA, MX, NS, SPF, DMARC, DKIM on 12 common selectors, CAA
- Subdomains in public certificate-transparency logs, security.txt, robots.txt, sitemap.xml

Not included in Halo Scan: active testing or exploitation, application or AI agent review, retest, compliance certification. It is not proof that no other issues exist.

The pricing page also prints an estimated consultant-time breakdown (about $150 an hour) totaling $1,325 against the $99 price. The page labels that table as an estimate of typical consultant time, not a quote from any third party. Do not present $1,325 as measured savings.

### After the scan

Seraphim, Cherubim, Thrones, and Angels are custom quotes after the Halo Scan. No obligation. Tier descriptions are summaries, not contracts. Scope, deliverables, and terms are set in writing before work starts.

| Tier | What it is | Timeline published on the tier |
|---|---|---|
| Seraphim | Full path: passive recon, comprehensive Scoped Assessment, remediation guidance, retest, 90 days of advisory | About 3 to 5 weeks from signed scope to final report, then advisory for 90 days |
| Cherubim | Scheduled passive re-checks, change review, periodic retests | One cycle each quarter, written summary within 5 business days of each check |
| Thrones | One Scoped Assessment of one target, remediation guidance, one retest | About 2 to 3 weeks, with one retest round within 60 days |
| Angels | Lightweight passive-recon report and one walkthrough. No active testing. | Report within 5 business days of kickoff, plus one 30-minute walkthrough |

### Three ways to start

From `app/start/StartForm.tsx`:

- Free preliminary scan. A passive check of the public footprint, reviewed by a person, delivered within 3 business days.
- Halo Scan, $99. The automated passive sweep described above.
- Book a call. 30 minutes. A time is confirmed by email.

The start page says nothing is scanned automatically when the form is submitted. The paid Halo Scan runs after Stripe confirms payment (`app/start/thanks/page.tsx`).

## CTA

Primary: Get the $99 Halo Scan

Path on the site: `/start?path=basic`

Secondary: Request a scoped assessment

Path on the site: `/start?path=call`

Closing line from the homepage: Ready to see what an attacker would see first? Tell us what you need assessed. We'll reply with scope questions and next steps, with no cold scanner spam.

Alternate close, from the report's next-step line: Want these fixed? Reply to the report email and we'll send a custom quote to fix every issue we found. No obligation.

The follow-up mailer sends one note after the report and states that it is the only follow-up.

## FAQ

**What is Seraphim Scan?** Scoped security assessments for teams shipping AI agents, in three phases: Recon, Scoped Assessment, and Remediation and Retest. It is an Ascend Maui initiative.

**What is a Halo Scan?** A $99 one-time passive perimeter sweep of the single domain you authorize. Findings are dual-verified and delivered in a branded PDF, usually within minutes of payment and always within 3 business days.

**What does passive recon cover?** Public DNS, one TLS handshake, ordinary requests for the homepage, security.txt, robots.txt, and sitemap.xml, and a certificate-transparency search. No port scans, fuzzing, login attempts, or path guessing.

**Is this a pentest?** The site does not use that word. The service is a Scoped Assessment. Any active testing happens only inside the agreed scope with written authorization. Halo Scan itself does no active testing.

**What has to be true before work starts?** Written client authorization. For a Scoped Assessment, a written scope and window. The engagement stops at the boundaries you set.

**What does it cost?** Halo Scan is $99 flat. Seraphim, Cherubim, Thrones, and Angels are custom quotes after that scan. There is no obligation to buy the fixes.

**How long does a tier take?** See the timeline column above. Halo Scan is the only one with a minutes-level delivery claim, and that claim is "usually within minutes, always within 3 business days."

**Do you certify us?** No. The service does not issue a compliance certification or an audit opinion. A Seraphim report can be evidence you hand to your own auditor.

**Is there a monitoring product?** No. No sensors, no installed agents, no security operations center, and no round-the-clock response.

**Where do the models run?** Scenario design uses private local models, reviewed by a person. The claim in the trust badges is that this stays on our hardware.

**Can you name customers?** No. The incident page states that Seraphim Scan has no past client engagements to report. The site publishes sourced public-incident analyses, and one self-engagement case study of an application owned by the same principal. Do not add client names, logos, or results.

**Who do I email?** ascendmaui@gmail.com
