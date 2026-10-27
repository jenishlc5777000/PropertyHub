# PropertyHub design system

**Direction: "warm paper, navy ink."** A calm, premium real-estate feel. Warm off-white surfaces and deep navy text, an editorial serif for headlines and prices, and one confident emerald for actions. Photography carries the colour; the UI stays quiet around it. A brass accent is reserved for "Featured".

Both apps use the same tokens:
- **Web:** `web/src/index.css` (`@theme`). The `slate-*` scale is redefined, so every existing `slate` class picks up the warm/navy neutrals.
- **Mobile:** `mobile/src/theme.js`

## Color

| Token | Light | Dark | Role |
|---|---|---|---|
| `slate-50` / paper | `#faf8f4` | — | Page background |
| `white` / surface | `#ffffff` | `slate-900` `#111a2b` | Cards, sheets, inputs |
| `slate-100` | `#f3efe8` | — | Subtle fills (chips, fact tiles) |
| `slate-200` | `#e6e0d6` | `slate-800` `#1a2436` | Borders, dividers |
| `slate-500` | `#6f685e` | `slate-400` `#a39a8c` | Muted text, placeholders (5.5:1 / 6.3:1) |
| `slate-700` | `#3a3631` | `slate-300` `#d2cabd` | Body text on light / dark |
| `slate-900` / ink | `#111a2b` | `slate-100` `#f3efe8` | Headings, primary text (16.4:1) |
| `slate-950` | `#0a1120` | — | Dark-mode page background |
| `brand-900` navy | `#0f2a4a` | `brand-700` | Brand blocks: hero overlay, footer, dark buttons |
| `accent-600` primary | `#047857` | `#047857` | Primary buttons and links (white text 5.48:1) |
| `accent-700` | `#065f46` | — | Primary hover / pressed |
| `accent-400` | `#34d399` | — | Primary text on dark backgrounds (9.8:1) |
| `gold-500` brass | `#b7862f` | — | "Featured" badge and star only |
| warning | `#b45309` | `#f59e0b` | Pending review, expiring credits |
| error | `#b91c1c` | `#f87171` | Errors, destructive actions |

Rules:
- Exactly one action colour (emerald).
- Brass is decoration, never an action.
- No gradients except the photo-darkening overlay on hero images.

## Typography

- **Display: Fraunces** (variable serif, weights 500–600, optical size on). Used for h1–h3, prices and big numbers.
- **Body / UI: Plus Jakarta Sans** (400, 500, 600, 700).
- **Indian scripts:** Noto Sans Devanagari, Tamil, Telugu, Kannada and Malayalam. These fallbacks are loaded per script via `unicode-range`.

| Step | Size / line height | Use |
|---|---|---|
| display | 56 / 1.05 (mobile 38) | Home hero |
| h1 | 40 / 1.1 (mobile 30) | Page titles |
| h2 | 30 / 1.15 | Section titles |
| h3 | 22 / 1.25 | Card titles in detail views, dialog titles |
| lg | 18 / 1.6 | Lead paragraphs |
| base | 16 / 1.6 | Body |
| sm | 14 / 1.5 | Secondary text, form labels |
| xs | 12 / 1.4 | Eyebrows (uppercase, 0.12em tracking), badges, meta |

Headings use −0.02em tracking. Body lines are at most about 70 characters.

## Spacing and layout

- 4-based scale (4, 8, 12, 16, 24, 32, 48, 64, 96).
- Section spacing: 96 px on desktop, 64 px on mobile.
- Content max width 1280 px, with gutters of 16 / 24 / 32 px.
- Card padding: 20 px on web, 16 px on mobile.

## Shape and depth

- **Radius:**
  - inputs: 12 px
  - cards and photos: 20 px (`rounded-[20px]`)
  - photos inset inside cards: 14 px
  - buttons, chips and badges: fully rounded pills
- **Shadows** (navy-tinted, never grey-black):
  - `shadow-card`: `0 1px 2px rgb(15 42 74 / .05), 0 10px 30px -18px rgb(15 42 74 / .25)` (resting)
  - `shadow-lift`: `0 24px 48px -24px rgb(15 42 74 / .45)` (hover, floating search bar, sheets)

## Components

- **Buttons:**
  - Primary: an emerald pill with white text, 600 weight.
  - Secondary: a white pill with a slate-200 border and ink text.
  - Quiet: text only, with a slate-100 hover.
  - Dark: a navy pill.
  - Every button has a visible 2 px emerald focus ring (offset 2), and a disabled state at 50% opacity.
- **Inputs:** 12 px radius, slate-200 border, focus border emerald plus a 4 px emerald/15% ring. The label sits above the field (sm, 600).
- **Property card:**
  - The photo is inset (12 px padding, 14 px radius, 4:3), zooms 4% on hover and has a glass favourite button.
  - Badges sit on the photo: purpose (navy or sky) and Featured (brass).
  - The price is set in Fraunces at 24 px, followed by the title (600), then the locality with a pin icon.
  - Specs are one muted line separated by dots.
  - "Show contact" is a secondary pill, so a grid isn't a wall of green.
  - The card lifts on hover.
- **Section header:** an eyebrow (xs, uppercase, emerald), then a Fraunces h2, with an optional "View all →" link on the right.
- **Navigation:** a sticky white bar with 80% opacity and backdrop blur. Links are 500 weight; the active link is ink with a 2 px emerald underline.
- **Footer:** a navy block with a Fraunces wordmark, link columns, and a hairline divider at white/10%.
- **Chips (filters):** pills; the selected chip is filled ink (navy) with white text, unselected chips are white with a border.

## Imagery and icons

- **Icons:** Lucide on web and Ionicons on mobile, line style at 1.75 stroke, 16–20 px. No emoji as icons.
- **Photos:**
  - Real property photos, always `object-cover` and always inside a rounded frame.
  - The hero photo sits under a navy-to-transparent overlay (bottom-heavy) so white text passes contrast.
  - Map pins are navy price pills; the selected or current pin is emerald.
