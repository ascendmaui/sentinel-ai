# Seraphim Scan brand guide

## Concept
Seraphim Scan runs Scoped Assessments for teams shipping AI agents. The mark is a seraph reduced to geometry: six wings (three pairs: upper, middle, lower) around a scan aperture. The ring is the lens, the horizontal bar is the scan line, the bright core is the point of focus. It says watchful, precise and calm, never aggressive.

Voice: confident, exact, quiet. Short sentences. Facts over hype.

## Palette
| Name | Hex | Use |
|---|---|---|
| Obsidian | #07070C | Primary background |
| Onyx | #0F1018 | Surfaces, icon field |
| Graphite | #1A1B26 | Raised surfaces, borders |
| Night Violet | #26223F | Icon/background light source |
| Ivory | #F3EEE3 | Primary text on dark, light background |
| Ash | #9C98A8 | Secondary text |
| Sovereign Gold | #F2B544 | Brand accent, mark |
| Gilded | #FFF0C8 | Gradient highlight |
| Bronze | #A86A14 | Gradient shadow; gold on light uses #B7791F to #7A4A0C |
| Core White | #FFE9B8 | Aperture core glow |
| Regal Violet | #8B6CFF | Sparing secondary accent in imagery |

Mark gradient: linear, top left to bottom right, #FFF0C8 0%, #F2B544 42%, #A86A14 100%. No green as a brand accent.

## Typography (Google Fonts, OFL)
- Display: Bricolage Grotesque 600 to 700. The wordmark is Bricolage Grotesque 620, outlined to paths.
- Body: Inter 400 to 600.
- Mono / data: JetBrains Mono.
- "SCAN" in the wordmark: Bricolage Grotesque, all caps, tracking +340, in Sovereign Gold.

## Logo system (one geometry everywhere)
Built on a 1024 grid with a 32 px module: aperture ring r=128, pupil r=80, core r=36, scan bar 192 x 20. Wings (angle, length, root width): upper -46 deg 272/128, middle -8 deg 240/104, lower 28 deg 176/84, starting 140 from center. Source: `src/mark.py`.
- `logos/svg/symbol-*`, `wordmark-*`, `lockup-*` (horizontal), `lockup-stacked-*`; each in `dark`, `light`, `mono-black`, `mono-white`.
- PNG exports in `logos/png/` (symbol 64 to 1024, lockups 480 to 3840).
- Clear space: the aperture ring diameter on every side.
- Minimum size: symbol 16 px (use `app-icon-small` / favicon variant), horizontal lockup 120 px wide; below 200 px drop "SCAN" tracking legibility by using the symbol alone.
- Don't: recolor wings individually, add outlines or drop shadows, rotate, stretch, or place gold mark on mid-tone gold or busy imagery without a dark scrim.

## Icons
- App icon: `logos/svg/app-icon.svg`; iOS set `icons/ios/AppIcon.appiconset`; Android adaptive `icons/android/mipmap-*` (foreground in 66 dp safe zone, background gradient, monochrome themed layer); web `icons/web` (favicon.ico, favicon.svg, apple-touch-icon, 192/512).
- UI icons `icons/ui/*.svg`: 24 px grid, 1.75 stroke, round caps and joins, `currentColor`.

## Imagery
Abstract and cinematic: luminous wing geometry, scan light, dark glass. No text, no people, no real brands. `imagery/`.

## Wording rules
- Say "Scoped Assessment". Never "pentest", "attack", "red team", "offensive" in marketing.
- Recon is passive only: public information, no probing without written client authorization and an agreed scope.
- No em dashes. Use a period, comma, colon or parentheses.
- No invented statistics, certifications, testimonials or client logos.
- Brand name is "Seraphim Scan" (two words, both capitalized). Email signature: "Best, John, Seraphim Scan".
