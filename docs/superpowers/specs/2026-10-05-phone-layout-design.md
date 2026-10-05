# Phone layout A: touch-sized, one screen, portrait and landscape

Date: 2026-10-05. Status: approved in conversation section by section (Shoro), written up here. Backlog: UX-14. Decisions: D-63, D-64, D-65 (STRATEGY §8, added with the implementation).

## Intent

On a phone the page is cramped and its controls are mostly 24 px targets: borough codes, graph tabs, page icons, the play button inside its 32 px pill, and below 768 wide the DayNav arrows, pins and calendar days. Apple's floor is 44 pt and Material's 48 dp; only the About links reach it. Landscape phones (844–932 wide) fall into the tablet layout, because no rule looks at height, and their bars and cards overlap. The JS and the CSS disagree on what a phone is (575 vs 767).

Success: every control on a phone or tablet has a hit area of at least 44 × 44 pt; nothing overlaps in portrait or landscape; the page still fits one screen with nothing scrolling (D-26 stands); it reads as designed for a thumb. Unchanged: the laptop layout, the sonification, the sky, BUG-57's handling of Safari's bars, the copy.

Shoro's choices on the way (mockups in `.superpowers/brainstorm/`): direction A (one screen, show less) over a scrolling column (B) and a sky-first bottom sheet (C, C2, C3); both hero cards kept; landscape L1; no ⋯ menu, Patch notes as an icon beside the day pill and the credit in the About overlay only; the page icons in the transport row (not a labelled segment, not swipe-only); tablets keep their layout with 44 pt targets; the day picker on phones is a bottom sheet (not a two-step popover).

## 1. Which layout applies where

One rule, in one place (`src/utils/layout.ts`, a pure function plus a hook):

| Layout | Condition | What it is |
|---|---|---|
| `phone-landscape` | height < 500 and width > height | Layout L1 |
| `laptop` | width ≥ 1024 | Unchanged, header states included |
| `tablet` | 768 ≤ width < 1024 | Today's tablet layout, every control 44 pt, pills 52 |
| `phone` | width < 768 | Layout A |

The rows are tested in this order and the first match wins. Width and height are the viewport's (`innerWidth`, `innerHeight`). A short, wide window on a laptop (under 500 tall) gets `phone-landscape`, which is the layout that fits it. A narrow window that happens to be wider than tall but at least 500 tall (700 × 600) gets `phone`.

ScenePage sets the result as `data-layout` on `.scene-root`; the CSS targets `.scene-root[data-layout="…"]` instead of repeating pixel widths in media queries. `usePhone` (575) and `useLaptop` (1024) are replaced by the hook. The phone layouts drop the width steps (359, 389, 408, 575, 839); card container queries (D-52) stay, since they answer to the card's own size. Height steps inside the phone layouts stay as height media queries on the window between Safari's bars.

## 2. Phone portrait (A)

Inside the window between Safari's bars (`--win-*`, BUG-57), 16 pt side margins, 8–12 pt gaps, top to bottom:

1. Borough: a segmented control, six equal segments (codes), 44 pt tall, the selected one filled.
2. Day and Patch notes: the day pill (calendar glyph, label, chevron, 44 pt) fills the row; the Patch notes notebook button (44 × 44) beside it.
3. The band, the remaining height. Scene page: the two hero cards side by side (AQI flex 1, Breath flex 1.7, about 110 pt), then the graph card with 44 pt tabs and the plot taking the rest. Synth page: the six synth cards, 2 × 3, filling the same band. Swipe as today (D-45, D-62) or the page icons.
4. LiveStatus toast, only when shown: directly above the transport; its actions 44 pt tall; its height comes out of the graph.
5. Transport: play, a 56 pt circle; the volume pill, 44 pt tall, flexible width; the page pill, two 44 pt icon buttons (cloud-sun, audio-lines).

Every control's hit area is ≥ 44 × 44 even where the drawing is smaller (the slider's track stays a thin line in a 44 pt input). The notebook button becomes a close (×) in place, same spot, while About is open; About covers the full screen under the bars and its reading starts below the top rows.

Height steps, on the window height:

| Step | Window height | Hero cards |
|---|---|---|
| standard | ≥ 700 | ≈110, bars shown |
| short | 600–699 | ≈92, bars dropped, type a step down |
| shortest | < 600 | ≈80, label and value tighter |

Worked case, an SE in Safari (window ≈ 560): top rows and margins 128, transport 56, gaps 24, band 352, of which hero 80 and graph ≈ 264, plot ≈ 200.

## 3. Phone landscape (L1)

Window on an iPhone 15 on its side ≈ 780 × 283. Side margins are the larger of 16 pt and the safe-area inset (nothing under the island).

1. Top row, 44: the borough control at a fixed width (≈ 340) left; the day pill filling the right, then the Patch notes button.
2. Middle, the rest (≈ 170). Scene page: the hero cards stacked in a left column (≈ 210 wide), the graph card beside them (44 pt tabs, plot ≈ 110). Synth page: the six cards, 3 × 2, the full width.
3. Bottom row: play (a 48 pt circle in landscape), the volume pill, the page icons.

About: the same overlay, its reading in a centred column, the close where the notebook was.

## 4. Components

- Layout: `src/utils/layout.ts` exports `layoutFor(width, height)` (pure) and `useLayout()` (listens to resize and orientation). Breakpoint numbers live there and nowhere else in JS.
- Tokens: `CONTROL.touch = 44` in `theme.ts`. Phones: `--ctl-pill` and `--ctl-inner` both 44. Tablets: pills 52 with 44 inside. Hit areas padded to 44 where the glyph is smaller.
- BoroughToggle: on phones, six equal segments filling the row.
- DayPicker: trigger 44 pt with the calendar glyph. On phones its content opens in a new `Sheet` (below); laptop and tablet keep the popover. Calendar cells 44 on touch layouts. The six days (Last 24h and the five pins) as a 3 × 2 grid of 44 pt chips in the sheet.
- Sheet (new, `src/components/Sheet.tsx`): a modal bottom sheet with a scrim, in the page's frosted material. Closes on a drag down past a threshold, a tap on the scrim, Escape, or a choice made. Focus moves into it on open and back to the trigger on close, and stays inside while open. Portrait: chips above the month. Landscape: the window's full height, chips (2 × 3) left and the month right; a six-week month scrolls inside the sheet by about a row. Reduced motion: no slide, a fade.
- AboutButton: on phones, the notebook icon button beside the day pill, morphing to × in place while About is open. The credit pill leaves the phone footer; Credit stays on laptop and tablet.
- PageIndicator: on phones, in the transport row, horizontal, 44 pt buttons.
- Transport: play 56 (48 in landscape); volume input 44 tall.
- Graph: tabs 44.
- LiveStatus: action buttons 44.
- Hero cards: the height steps above.
- Monitor: 2 × 3 in portrait, 3 × 2 in landscape.
- Tablet: tokens only. Every control 44, pills 52. Layout as today.

Edge cases: rotating with the sheet open re-lays it out; the sheet and About are never both open (opening one closes the other); picking a day closes the sheet, as the popover does.

Copy: no visitor-facing prose changes. Two placeholders for Shoro in `content.ts`: the sheet's accessible name and its dismiss label (both default to the existing calendar strings).

## 5. Decisions and docs

- D-63: the four layouts by width and height, one rule (`layout.ts`). Supersedes D-30's header states for phones; amends CLAUDE.md's "two breakpoints" line.
- D-64: layout A on phones, L1 in landscape; 44 pt minimum targets on phones and tablets; Patch notes as an icon by the day pill and the credit in About only, on phones (amends D-55); the page icons in the transport row on phones (amends D-43).
- D-65: the day picker on phones is a bottom sheet (amends D-34).
- STRATEGY §5.7 rewritten to match. BACKLOG UX-14 (this work). CHANGELOG entry.

## 6. Testing

- Unit: `layoutFor` against every edge in §1's table (vitest).
- Touch-target audit, in the preview at each size: a script lists every button, link, input and tab whose hit area is under 44 × 44. Pass: zero on phone and tablet layouts.
- Breakpoint review: screenshots of the built page at 320, 375, 390, 430 portrait; 667×375, 844×390, 932×430 landscape; 768 and 1023 tablet; 1024 and 1440 laptop; for each phone size the scene, the synth, the day sheet open and About open, side by side for Shoro.
- Shoro's iPhone, portrait and landscape, before anything is committed.
- Not testable here: real touch feel, Safari's own landscape layout, Android Chrome unless Shoro has a device.

## 7. Build order

Each stage verified before the next: (1) the layout rule, hook and tokens; (2) phone portrait; (3) phone landscape; (4) the day sheet; (5) tablet targets.
