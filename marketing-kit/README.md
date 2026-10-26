# Seraphim Scan marketing kit

Artwork and copy for **Seraphim Scan**, taken from this repo. The brand name, prices, checks, and limits below are the ones the site and scan pipeline already publish. Nothing here adds a customer count, a testimonial, a certification, or a client logo.

The working name is recorded in `lib/brand.ts` as not yet cleared for trademark or domains. Do not add a trademark symbol, and do not invent a public domain.

## Index

| File | What it is |
|---|---|
| [STYLE_GUIDE.md](STYLE_GUIDE.md) | Colors, type, mark, and wording, with the source file for each value |
| [LANDING_COPY.md](LANDING_COPY.md) | Hero, subhead, features, calls to action, and FAQ |
| [SOCIAL_COPY.md](SOCIAL_COPY.md) | Profile text and posts for X and LinkedIn |
| [PRESS_BLURB.md](PRESS_BLURB.md) | Short blurb, standard blurb, boilerplate, and a fact sheet |
| [logo/](logo/) | Symbol and horizontal lockup, SVG and PNG |
| [banners/](banners/) | X header, LinkedIn cover, and Open Graph image |
| [screenshots/](screenshots/) | Store-frame templates at iPhone and Mac sizes |
| [fonts/](fonts/) | OFL font files used by the SVG and HTML |

## Logo

Derived from the six-wing mark in `components/Logo.tsx` (the same geometry as `public/partners-kit/logos/symbol-dark.svg`). The mark has no text. Wordmarks set "Seraphim" in ivory or onyx and "SCAN" in gold, matching the nav wordmark in `app/globals.css`.

| File | Use |
|---|---|
| `logo/symbol.svg`, `logo/symbol.png` | Gold mark, 1024 px square, transparent. Pupil is Obsidian `#07070C`. |
| `logo/symbol-light.svg`, `logo/symbol-light.png` | Bronze mark for light backgrounds. The pupil is a hole, as in `symbol-light.svg`. |
| `logo/lockup.svg`, `logo/lockup.png` | Horizontal lockup for dark backgrounds. Transparent PNG, 850 by 240. |
| `logo/lockup-light.svg`, `logo/lockup-light.png` | Same lockup with onyx word and bronze "SCAN", for light backgrounds. |

Clear space: keep the aperture-ring diameter free on every side. Below 120 px wide, use the symbol alone.

## Banners

Each banner is an SVG, an HTML document with the same SVG inlined, and a PNG rendered from that SVG at the exact pixel size.

| File | Size | Notes |
|---|---|---|
| `banners/x-header-1500x500.svg` | 1500 by 500 | X header. Type sits in the upper area. A profile photo covers the lower left of a live header. |
| `banners/linkedin-1584x396.svg` | 1584 by 396 | LinkedIn cover. Type starts inset from the left so a page logo or profile photo can overlap the lower left. |
| `banners/og-1200x630.svg` | 1200 by 630 | Open Graph / link preview. |

HTML twins use the same basename (`.html`). PNG twins use the same basename (`.png`).

## Screenshot templates

These are layout templates of the public site, at the pixel sizes used for store frames. They are not captures of a shipped iPhone or Mac app, and they are not a customer session. The window title is the product name only. This repo does not publish a production domain.

| File | Size |
|---|---|
| `screenshots/iphone-1290x2796.svg` | 1290 by 2796 |
| `screenshots/mac-2880x1800.svg` | 2880 by 1800 |

Each has an HTML twin and a PNG export at the same size.

## Fonts

SVG and HTML load faces from `fonts/` with relative URLs, so they render without a network connection.

- Bricolage Grotesque SemiBold (600) and Bold (700), static instances of the OFL variable font
- Inter Regular, Medium, and SemiBold
- JetBrains Mono Medium

License texts: `fonts/OFL-BricolageGrotesque.txt`, `fonts/OFL-Inter.txt`, `fonts/OFL-JetBrainsMono.txt`.
