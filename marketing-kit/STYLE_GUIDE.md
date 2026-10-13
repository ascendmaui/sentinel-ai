# Seraphim Scan style guide

Values below are copied from the code that styles the site. Dark is the default theme (`app/tokens.css`).

## Name

- Product name: **Seraphim Scan** (`BRAND_NAME` in `lib/brand.ts`). Two words, both capitalized.
- Wordmark split: **Seraphim** plus **SCAN**. "SCAN" is uppercase, in the primary gold, smaller than the word, with wide tracking (`app/globals.css`, `.wordmark-suffix`).
- Parent: **Ascend Maui** (`BRAND_PARENT`).
- Contact published on the site: **ascendmaui@gmail.com** (`BRAND_EMAIL`).
- Tagline: "Scoped security assessments for the age of AI agents" (`BRAND_TAGLINE`).
- Slogan: "In the age of AI, fight rogue agents with Seraphim Scan." (`BRAND_SLOGAN`).
- `lib/brand.ts` records the name as a working name, locked 2026-09-29, and not yet cleared for trademark or domains. Do not add a trademark mark.

## Color

Palette names and hex values are the custom properties in `app/tokens.css`.

| Token | Hex | Role on the default dark theme |
|---|---|---|
| `--ao-palette-obsidian` | `#07070C` | Page background (`--ao-bg`) |
| `--ao-palette-onyx` | `#0F1018` | Surfaces (`--ao-surface`) |
| `--ao-palette-graphite` | `#1A1B26` | Raised surfaces (`--ao-surface-raised`) |
| `--ao-palette-ivory` | `#F3EEE3` | Primary text (`--ao-text`) |
| `--ao-palette-ash` | `#9C98A8` | Secondary text (`--ao-muted`) |
| `--ao-palette-sovereign-gold` | `#F2B544` | Primary accent (`--ao-primary`) |
| `--ao-palette-gilded` | `#FFE3A3` | Strong gold (`--ao-primary-strong`). Mark highlight in `components/Logo.tsx` uses `#FFF0C8`. |
| `--ao-palette-bronze` | `#B7791F` | Deep gold (`--ao-primary-deep`). Mark shadow in the logo SVG uses `#A86A14`. |
| `--ao-palette-vault-mint` | `#7CFFCB` | Accent and success (`--ao-accent`, `--ao-success`) |
| `--ao-palette-regal-violet` | `#8B6CFF` | Secondary (`--ao-secondary`) |
| `--ao-palette-danger` | `#FF5D73` | Danger (`--ao-danger`) |
| `--ao-warn` | `#FF9F43` | Warning, dark theme only |

Text and fill on a gold button: `--ao-on-primary` `#1A1206`.

Mark gradient, from `components/Logo.tsx`: linear, 20% 0% to 80% 100%, `#FFF0C8` at 0, `#F2B544` at 42%, `#A86A14` at 100%. Core glow: `#FFFFFF` to `#FFE9B8` at 55% to `#F2B544`. Scan bar: `#FFE3A3`.

Light theme (`[data-theme="light"]`) uses background `#FAF7F0`, text `#0F1018`, and primary text gold `#8A5A0B`. The light lockup in this kit uses that onyx and that gold. High contrast (`[data-theme="high-contrast"]`) uses black `#000000`, white text, and primary `#FFD27A`.

Button fill on the dark theme is `--ao-primary-grad`: 135 degrees, `#FFE3A3` to `#F2B544` at 48% to `#B7791F`.

Radius tokens: large 28 px, medium 20 px, small 14 px, pill 999 px.

`app/glass.css` adds a liquid-glass layer on dark and light themes (high contrast stays solid). Cards, nav, tiers, the Halo checklist, and the call-to-action band use a translucent fill, a 22 px backdrop blur, and a 24 px corner on those surfaces. The nav pill stays fully rounded. Fallback solid fill when blur is unavailable: `#12121C` in dark, `#FFFFFF` in light. Tint stops still use ivory and sovereign gold.

## Type

Loaded in `app/layout.tsx` with `next/font/google`:

| Role | Family | CSS variable |
|---|---|---|
| Headings and wordmark | Bricolage Grotesque | `--font-display`, then `--ao-font-heading` |
| Body and buttons | Inter | `--font-body`, then `--ao-font-body` |
| Eyebrows, labels, phase numbers | JetBrains Mono | `--font-mono`, then `--ao-font-mono` |

Scale from `app/globals.css`:

- Body: 16 px, line-height 1.6
- `h1`: weight 700, line-height 0.98, letter-spacing -0.035 em, size `clamp(40px, 6.4vw, 84px)`. The home hero uses `clamp(42px, 6.6vw, 92px)`.
- `h2`: weight 650, line-height 1.05, letter-spacing -0.03 em, size `clamp(28px, 3.4vw, 44px)`
- `h3`: 19 px, weight 600, letter-spacing -0.015 em
- Eyebrow: JetBrains Mono 12 px, weight 500, letter-spacing 0.14 em, uppercase, color `--ao-primary`
- Lead: ash, `clamp(17px, 1.5vw, 19px)`
- Button: Inter 600, 15 px, pill, min-height 46 px

This kit ships static Bricolage Grotesque faces at weights 600 and 700 (optical size 32, width 100) because those are the heading weights the CSS asks for. Inter and JetBrains Mono files are the OFL families named in the stylesheet. Licenses are in `fonts/`.

## Mark

Six wings in three pairs around a scan aperture. The ring is the lens, the horizontal bar is the scan line, and the bright core is the point of focus. Geometry lives in `components/Logo.tsx` on a 1024 grid: aperture radius 128, pupil radius 80, core radius 36, scan bar 192 by 20. The site comment points at `brand/seraphim-scan/src/mark.py` as the generator. Logo SVGs in this kit trace those paths. They do not redraw the mark.

Do not recolor individual wings, add a stroke, rotate, or stretch the mark. On a dark field use the gold mark. On a light field use the bronze mark.

## Voice

From `public/partners-kit/docs/brand-guide.md` and the report gate in `lib/pipeline/report.ts`:

- Say "Scoped Assessment". Do not say pentest, penetration test, red team, or offensive.
- Recon is passive: public information only. Active work needs written client authorization and an agreed scope.
- No em dashes. Use a period, comma, colon, or parentheses.
- No invented statistics, certifications, testimonials, or client logos.
- The report text gate also rejects guarantee, certification, compliant, and hack.

Trust lines that are allowed, because `TRUE_BADGES` in `lib/brand.ts` marks each one as literally true:

- Passive recon only. Public information, no probing.
- Written client authorization required. Nothing starts without it.
- Scoped Assessment. Inside an agreed scope.
- Remediation and retest. Fixes verified, not assumed.
- Private local models. Scenario design stays on our hardware.

## What the service is not

Stated in `lib/tiers.ts` and on the pricing page: there is no monitoring platform, no sensors, no self-serve scanner, no SLA, and no certification behind any tier. Halo Scan is not a Scoped Assessment and not a compliance audit (`lib/pipeline/report.ts`).
