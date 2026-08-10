# Design

<!-- impeccable:design-schema 1 -->

## World

A modern Book of Hours. The site reads as a liturgical page: rubricated labels, versal initials, hairline rules, a kalendarium of dates — executed entirely in Futura on an airy near-white ground, with real photography set as plates. The old Google Sites look (teal banners, magenta/orange wordmark, stock imagery) is retired and is anti-reference.

## Palette (binding — from Palette.txt)

| Token | Value | Role |
|---|---|---|
| `--paper` | `#FDFDFC` | page ground |
| `--ink` | `#2D373C` | body text |
| `--heading` | `#35596D` | headings, dark blue fields |
| `--primary` | `#6089A9` | links, buttons, the "O" of the wordmark |
| `--field-blue` | `#B0C4D4` | large colored sections |
| `--field-warm` | `#DADBC5` | alternating warm sections |
| `--sage` | `#869B92` | secondary text, captions; `#668583` darker variant where contrast requires |
| `--rubric` | `#A65A38` | rust: rubrication only — eyebrows, dates, deadline marks, versal accents, small rules |
| `--gold` | `#C1AA5B` | gold: hairline rules, ornament, tiny badges |

Gold and rust are scarce by rule: never backgrounds, never large text blocks. On tinted fields (`--field-blue`, `--field-warm`) all text is `--ink` or `--heading` — rust and sage fail contrast there and are reserved for the paper ground. Small sage text on paper uses `--sage-deep` (`#566A66`); `#869B92` is decorative/large only.

## Typography (binding — Futura, self-hosted)

- Family: **Futura PT** (ParaType), self-hosted from `fonts/` as woff2/otf. Weights: Light (300), Book (400), Medium (500), Demi (600), Bold (700) + italics as needed. Tw Cen MT and Futura LT Pro remain in `Futura-Font-main/` as alternates but are not used on the site.
- Display: Futura PT Bold/Demi, tight leading (0.95–1.05), used monumentally (wordmark, section numerals, versal initials).
- Rubricated labels: Futura PT Medium/Demi, uppercase, letter-spacing 0.14–0.2em, `--rubric` or `--sage`.
- Body: Futura PT Book 400, 1.06–1.19rem, line-height 1.6–1.7, max measure ~65ch.
- Versal initials: first letter of a lead paragraph set as an oversized floated Futura capital in `--rubric`, Book-of-Hours style (`.versal` — used sparingly, not on every section).

## Page grammar

- **Threshold promenade:** one axial column; the page descends inward (town → monastery → the hours/components → people → practicalities → apply). Each threshold is marked by a numbered rubric line (e.g. `II · THE MONASTERY`) over a gold hairline rule.
- Hairline rules: 1px `--gold` at ~55% opacity for major thresholds and ruled lists; the gold cross-flory ✣ marks list items, kalendarium rows, excursion separators, and the apply-section ornament.
- Photography as plates: images carry thin ruled frames and small sage captions; no rounded corners larger than 2px, no drop-shadow theatrics (a single soft ambient shadow ≤ 24px blur allowed on lifted plates).
- Kalendarium: dates/deadlines set as a ruled table-calendar; TBA values marked visually (rubric) and in HTML comments for maintainers.
- Buttons: rectangular, Futura Demi uppercase tracked; primary = solid `--heading` with `--paper` text (solid `--primary` fails text contrast); secondary = 1px `--heading` outline, fills on hover. Hover darkens to `#2A4757`; 150–200ms ease.
- Links in prose: `--heading` with a 1px `--primary` underline (offset 3px); hover `--rubric` on paper, `--ink` on tinted fields. Small heading-colored text on `--field-blue` uses `--heading-deep` `#2A4757`.
- Motion: quiet. Scroll-reveal limited to plates and threshold rubrics (opacity/translate ≤ 16px, 500–700ms, once). `prefers-reduced-motion` renders everything static.

## Layout

- Container: max 1120px; text measure inside ~720px. Generous margins — the ground stays airy (Principle 5).
- Spacing rhythm: 8px base; sections breathe 96–160px desktop, 64–96px mobile; more space above headings than below.
- Full-bleed tinted fields (`--field-blue`, `--field-warm`) own whole sections, not stripes.
- Breakpoints: single column under 720px; two-column plate/text pairs collapse image-first.

## Identity

- Wordmark: "ART" monumental Futura Bold caps in `--heading`, "in Orvieto" following; the terminal "O" of Orvieto rendered in `--primary` (echoing the poster's blue O). No reuse of the old magenta/teal mark.
- ICS attribution: red-dove ICS logo (`assets/ics-logo.png`) in footer with Toronto contact block.
- Favicon/social: blue "O" mark on paper ground.
