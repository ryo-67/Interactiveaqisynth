# Phone Layout A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the page touch-sized on phones (portrait A, landscape L1) and tablets (44 pt targets), one screen with nothing scrolling, with the phone day picker as a bottom sheet.

**Architecture:** One pure rule (`layoutFor`) picks `laptop | tablet | phone | phone-landscape` from the viewport; ScenePage writes it to `.scene-root[data-layout]`, and the phone and tablet CSS lives under that attribute (its specificity beats the existing width media queries, which stay for laptop and tablet). The phone's old width-step blocks are deleted. New pieces: an `icon` form of the About button in the top bar, and a `Sheet` component hosted inside the scaffold so its scrim can reach under Safari's bars like the About scrim.

**Tech Stack:** React 18 + TypeScript (strict), Vite, plain CSS in `src/index.css`, vitest.

**Spec:** `docs/superpowers/specs/2026-10-05-phone-layout-design.md`

## Global Constraints

- Every control on `phone`, `phone-landscape` and `tablet` has a hit area ≥ 44 × 44 CSS px.
- Nothing scrolls (D-26) at any size; the graph is the one panel that gives up height.
- Laptop (≥ 1024 wide, ≥ 500 tall) renders exactly as before.
- Tokens from `theme.ts` only; all prose from `content.ts`; no new visitor-facing copy (two placeholders only, Task 4).
- Every mapping or sizing choice gets a comment saying why, in the file's existing comment style (long, mechanism-level, dated).
- `npx tsc --noEmit -p .`, `npm run lint`, `npm test`, `npm run build` clean after every task.
- No commit is pushed. Commit messages in Shoro's voice: short, plain, no colons in the body, no em dashes, no third person, no AI attribution.

## Review Focus

- A phone rotated while the day sheet or About is open: the sheet re-lays out to the landscape grid; nothing is stranded off screen. (Task 4, step "rotation")
- A laptop window resized below 500 tall (1280 × 480): it becomes `phone-landscape`; the laptop width media queries also still match, and nothing from them may break the L1 layout. (Task 3, step "short laptop window")
- About open on a phone: the close button in the top bar stays above the scrim and tappable, while the borough and day controls under the scrim are inert. (Task 2, step "About on phone")
- The day sheet opened while playing and a day chosen: the sheet closes and the day changes exactly as the popover did (`onChange` then close), focus returns to the trigger. (Task 4, step "choice closes")
- A 320 pt-wide phone: six borough segments at ≥ 44 each (320 − 32 = 288, 48 each) and four graph tabs at ≥ 44 (288 − pad, ≥ 66 each). (Task 6 audit at 320)

---

### Task 1: The layout rule, the hook, and the touch token

**Files:**
- Create: `src/utils/layout.ts`
- Create: `src/utils/layout.test.ts`
- Modify: `src/utils/theme.ts` (CONTROL)
- Modify: `src/scene/ScenePage.tsx` (replace `usePhone`, `useLaptop`; set `data-layout`)

**Interfaces:**
- Produces: `type Layout = "laptop" | "tablet" | "phone" | "phone-landscape"`, `layoutFor(width: number, height: number): Layout`, `useLayout(): Layout`, `isPhoneLayout(l: Layout): boolean`, `LAYOUT = { laptopMin: 1024, tabletMin: 768, landscapeMaxH: 500 }`, `CONTROL.touch = 44`.

- [ ] **Step 1: Write the failing test** (`src/utils/layout.test.ts`)

```ts
import { describe, it, expect } from "vitest";
import { layoutFor, isPhoneLayout } from "./layout";

describe("layoutFor", () => {
  it("laptop at 1024 wide and up when at least 500 tall", () => {
    expect(layoutFor(1024, 768)).toBe("laptop");
    expect(layoutFor(1440, 900)).toBe("laptop");
    expect(layoutFor(1440, 500)).toBe("laptop");
  });
  it("tablet from 768 to 1023 wide", () => {
    expect(layoutFor(768, 1024)).toBe("tablet");
    expect(layoutFor(1023, 700)).toBe("tablet");
  });
  it("phone below 768 wide", () => {
    expect(layoutFor(320, 568)).toBe("phone");
    expect(layoutFor(390, 844)).toBe("phone");
    expect(layoutFor(767, 900)).toBe("phone");
    expect(layoutFor(700, 600)).toBe("phone"); // wider than tall but at least 500 tall
  });
  it("phone-landscape below 500 tall and wider than tall, whatever the width", () => {
    expect(layoutFor(667, 375)).toBe("phone-landscape");
    expect(layoutFor(844, 390)).toBe("phone-landscape");
    expect(layoutFor(932, 430)).toBe("phone-landscape");
    expect(layoutFor(1280, 480)).toBe("phone-landscape"); // a short laptop window
    expect(layoutFor(1280, 499)).toBe("phone-landscape");
  });
  it("a short narrow window that is taller than wide stays phone", () => {
    expect(layoutFor(400, 450)).toBe("phone");
  });
  it("isPhoneLayout", () => {
    expect(isPhoneLayout("phone")).toBe(true);
    expect(isPhoneLayout("phone-landscape")).toBe(true);
    expect(isPhoneLayout("tablet")).toBe(false);
    expect(isPhoneLayout("laptop")).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/utils/layout.test.ts`
Expected: FAIL, cannot resolve `./layout`.

- [ ] **Step 3: Write `src/utils/layout.ts`**

```ts
// layout — which of the page's four layouts applies (D-63, 2026-10-05; spec docs/superpowers/specs/2026-10-05-phone-layout-design.md). One rule, here and nowhere else in JS: the JS had said a phone was 575 wide and the CSS 767, and landscape phones (844–932 wide) fell into the tablet layout because nothing looked at height, which is where they overlapped. The rows are tested in order and the first match wins.
//   phone-landscape  under 500 tall and wider than tall, at any width: a phone on its side, or a laptop window dragged short — the layout that fits a short screen
//   laptop           1024 wide and up
//   tablet           768–1023 wide
//   phone            under 768 wide
// ScenePage writes the result to .scene-root[data-layout]; the phone and tablet CSS lives under that attribute (index.css), whose specificity beats the width media queries that still serve the laptop and tablet.
import { useEffect, useState } from "react";

export type Layout = "laptop" | "tablet" | "phone" | "phone-landscape";
export const LAYOUT = { laptopMin: 1024, tabletMin: 768, landscapeMaxH: 500 } as const;

export function layoutFor(width: number, height: number): Layout {
  if (height < LAYOUT.landscapeMaxH && width > height) return "phone-landscape";
  if (width >= LAYOUT.laptopMin) return "laptop";
  if (width >= LAYOUT.tabletMin) return "tablet";
  return "phone";
}

export const isPhoneLayout = (l: Layout): boolean => l === "phone" || l === "phone-landscape";

export function useLayout(): Layout {
  const read = () => (typeof window === "undefined" ? "laptop" : layoutFor(window.innerWidth, window.innerHeight));
  const [layout, setLayout] = useState<Layout>(read);
  useEffect(() => {
    const on = () => setLayout(read());
    window.addEventListener("resize", on);
    window.addEventListener("orientationchange", on);
    return () => { window.removeEventListener("resize", on); window.removeEventListener("orientationchange", on); };
  }, []);
  return layout;
}
```

- [ ] **Step 4: Run the test to see it pass**

Run: `npx vitest run src/utils/layout.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Add the touch token** in `src/utils/theme.ts`, inside `CONTROL` after `inner: 32,`:

```ts
  touch: 44,          // the least hit area on a touch layout, phone and tablet (D-64, 2026-10-05): Apple's 44 pt; the phone's 24 px targets were the complaint
```

- [ ] **Step 6: Replace the two hooks in ScenePage.** Delete `function usePhone()` and `function useLaptop()` (and their comments, lines ≈62–82). Add `import { useLayout, isPhoneLayout } from "../utils/layout";`. Where the component calls them, write:

```ts
  const layout = useLayout(); // D-63: one rule for every layout decision on the page (utils/layout.ts)
  const phone = isPhoneLayout(layout); // the phone's controls: the day sheet, no sky tap-to-play, no page cursor
  const laptop = layout === "laptop"; // the vertical page axis and the side transport
```

Find the existing call sites with `grep -n "usePhone()\|useLaptop()" src/scene/ScenePage.tsx` and replace each `const x = useX();` line; keep every later use of `phone` and `laptop` unchanged.

- [ ] **Step 7: Write the attribute.** On the root element (`<div ref={rootRef} className="scene-root" …`), add `data-layout={layout}`.

- [ ] **Step 8: Verify nothing moved on laptop.** `npx tsc --noEmit -p . && npm run lint && npm test && npm run build`. In the preview at 1440 × 900 and 1024 × 768, check `document.querySelector(".scene-root").dataset.layout` is `laptop` and the page looks as before (screenshot). At 390 × 844 it reads `phone`; at 844 × 390 `phone-landscape`. Note: at 576–767 wide the phone now gets the DayPicker instead of DayNav + pins; that is intended (spec §1).

- [ ] **Step 9: Commit**

```bash
git add src/utils/layout.ts src/utils/layout.test.ts src/utils/theme.ts src/scene/ScenePage.tsx
git commit -m "feat(layout): one layout rule for laptop, tablet, phone and landscape" -m "Phones were 575 wide in JS and 767 in CSS, and landscape phones got the tablet layout. The root now carries data-layout."
```

---

### Task 2: Phone portrait (A)

**Files:**
- Modify: `src/index.css` (new phone block; delete the old phone width blocks)
- Modify: `src/scene/ScenePage.tsx` (top bar children, About button placement, no phone credit row)
- Modify: `src/components/Transport.tsx` (`AboutButton` form `"icon"`)
- Modify: `src/components/About.tsx` (top band for the icon form)
- Modify: `src/components/LiveStatus.tsx` (44 pt actions on touch layouts)

**Interfaces:**
- Consumes: `data-layout` on `.scene-root` (Task 1).
- Produces: `AboutButton` accepts `form: "exhale" | "dismiss" | "icon"`; CSS custom property `--about-top` on `.scene-about` (px, the top bar's bottom edge within the overlay; 0 unless the icon form is in use).

- [ ] **Step 1: Delete the old phone CSS.** Remove these blocks from `src/index.css` (each starts with the selector shown; delete the rule and its comment): `@media (max-width: 575px) { .scene-live-status …}`, `@media (max-width: 575px) { .scene-top { flex-direction: column …}`, `@media (max-width: 575px) and (min-width: 408px) { .scene-top …}`, the phone block `@media (max-width: 767px) { .scene-ui { --ctl-pill: 32px …} … }`, `@media (max-width: 575px) and (min-width: 408px) { .scene-top .scene-borough …}`, `@container (min-width: 476px) { .scene-borough .borough-long …}`, `@media (max-width: 767px) and (max-height: 720px) {…}`, `@media (max-width: 767px) and (max-height: 660px) {…}`. Keep the 359 and 389 rules (they fit card content at those widths, not the layout). Keep `@media (max-width: 839px)` (tablet state C2) but it must not reach phones: the new block overrides it by attribute.

- [ ] **Step 2: Add the phone block** after the tablet `@media (max-width: 1023px)` block:

```css
/* ——— Phone portrait, layout A (D-64, 2026-10-05; spec docs/superpowers/specs/2026-10-05-phone-layout-design.md). One screen, nothing scrolls, every control 44 at least: the 24 px targets were the complaint. Top to bottom inside the window between Safari's bars (--win-*, BUG-57): the borough as six equal segments; the day pill with the Patch notes notebook beside it; the band (the hero pair and the graph, or the synth's six cards); the transport (play 56, the volume, the page icons). Keyed on data-layout (utils/layout.ts), whose specificity beats the width media queries that still serve the tablet and laptop. ——— */
.scene-root[data-layout="phone"] .scene-ui {
  --ctl-pill: 44px; --ctl-inner: 44px; --ctl-gap-wide: 0px;
  --ui-pad: 16px; --ui-gap: 12px; --grid-gap: 8px;
  --display-size: 48px; --heading-size: 24px; --heading-line: 28px; --body-size: 14px; --body-line: 20px;
  --panel-radius: 16px; --chip-radius: 10px;
  --graph-faint-alpha: 0;
  --hero-h: 110px;
}
.scene-root[data-layout="phone"] .scene-top { display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "borough borough" "day patch"; gap: 8px; align-items: stretch; z-index: auto; } /* a grid of three DIRECT children, so the notebook's slot is one of them: the bar has no stacking context of its own on a phone and the notebook's pill (z 31) stands above the About scrim (z 30), as the footer's did */
.scene-root[data-layout="phone"] .scene-top > :not(.scene-patch-slot) { position: relative; z-index: 1; } /* the borough and the day keep the bar's old lift over the band, each for itself */
.scene-root[data-layout="phone"] .scene-top .scene-borough { grid-area: borough; width: auto; padding: 0; }
.scene-root[data-layout="phone"] .scene-top .scene-day { grid-area: day; display: flex; min-width: 0; margin: 0; }
.scene-root[data-layout="phone"] .scene-top .scene-day > .glass { flex: 1 1 auto; width: auto; }
.scene-root[data-layout="phone"] .scene-top > .scene-patch-slot { grid-area: patch; }
.scene-root[data-layout="phone"] .scene-borough .scene-strip { width: 100%; --strip-gap: 0px; }
.scene-root[data-layout="phone"] .scene-borough-btn { flex: 1 1 0 !important; } /* six equal segments: 288 / 6 = 48 at the narrowest phone (320 − 32), over the 44 floor; important over the button's inline flex */
.scene-root[data-layout="phone"] .scene-borough .borough-long { display: none; }
.scene-root[data-layout="phone"] .scene-borough .borough-short { display: block; }
.scene-root[data-layout="phone"] .scene-page-inner { height: 100%; flex: 1 1 auto; --card-pad: 14px; --card-value-size: 20px; --card-value-line: 24px; }
.scene-root[data-layout="phone"] .scene-page-scene .scene-page-inner { justify-content: flex-start; }
.scene-root[data-layout="phone"] .scene-hero-pair { flex: 0 0 var(--hero-h); grid-template-columns: minmax(0, 1fr) minmax(0, 1.7fr); } /* both cards, side by side, the breath card the wider (spec §2) */
.scene-root[data-layout="phone"] .scene-panel.scene-graph { --graph-pad: 12px; --graph-pad-x: 8px; flex: 1 1 auto; min-height: 0; --graph-fill: 1; }
.scene-root[data-layout="phone"] .scene-graph-unit, .scene-root[data-layout="phone"] .scene-graph-suffix { display: none; }
.scene-root[data-layout="phone"] .scene-panel.scene-graph [role="tablist"] > button { flex: 1 1 0 !important; min-width: 0; }
.scene-root[data-layout="phone"] .scene-monitor { grid-template-rows: repeat(3, minmax(0, 1fr)); } /* six cards, 2 × 3 (spec §2): beats and reverb no longer span the row */
.scene-root[data-layout="phone"] .scene-monitor .scene-card-beats, .scene-root[data-layout="phone"] .scene-monitor .scene-card-reverb { grid-column: auto; }
.scene-root[data-layout="phone"] .scene-transport { gap: 8px; }
.scene-root[data-layout="phone"] .scene-transport > .scene-icon-pill { width: 56px; height: 56px; border-radius: 28px; } /* play is the page's first act: a 56 circle, the one control a size above the floor */
.scene-root[data-layout="phone"] .scene-transport > .scene-pill:nth-child(2) { flex: 1 1 auto; max-width: none; padding: 0 12px; }
.scene-root[data-layout="phone"] .scene-pill.scene-views-pill { padding: 0; }
.scene-root[data-layout="phone"] .scene-views { gap: 0; }
.scene-root[data-layout="phone"] .scene-bottom { gap: 8px; }
.scene-root[data-layout="phone"] .scene-live-status > .glass { flex-direction: column; width: fit-content; padding: 8px; border-radius: 20px; }
.scene-root[data-layout="phone"] .scene-live-actions { grid-template-rows: 1fr; margin-left: 0; margin-top: 4px; }
.scene-root[data-layout="phone"] .scene-live-pill[data-tone="loading"] .scene-live-actions { grid-template-rows: 0fr; margin-top: 0; }
/* Height steps on the phone (spec §2), measured on the viewport: standard 700 and up; short 600–699 drops the hero cards' bars and steps the type; shortest under 600 (an SE in Safari is about 560) tightens the cards again. The graph is what gives up the rest. */
@media (max-height: 699px) {
  .scene-root[data-layout="phone"] .scene-ui { --hero-h: 92px; --display-size: 40px; --ui-gap: 8px; }
  .scene-root[data-layout="phone"] .scene-hero-pair .scene-meter, .scene-root[data-layout="phone"] .scene-hero-pair .scene-ladder { display: none; }
}
@media (max-height: 599px) {
  .scene-root[data-layout="phone"] .scene-ui { --hero-h: 80px; --display-size: 34px; }
  .scene-root[data-layout="phone"] .scene-page-inner { --card-pad: 10px; }
}
```

- [ ] **Step 3: The `icon` form of the About button** (`src/components/Transport.tsx`). Change `type AboutForm = "exhale" | "dismiss";` to `type AboutForm = "exhale" | "dismiss" | "icon";` and add, at the top of the `AboutButton` render, before the existing `return`:

```tsx
  // The icon form (D-64, 2026-10-05): on a phone the Patch notes button is the notebook alone, a 44 square beside the day pill, and it turns into the close mark in place while About is open (no slide, no label: the slide to the footer's centre and the label belonged to the footer, which a phone no longer has).
  if (form === "icon") {
    const side = `var(--ctl-pill, ${CONTROL.pillHeight}px)`;
    return (
      <div className="scene-patch-slot" style={{ width: side, height: side }}>
        <Glass ref={glassRef} material="frosted" className="scene-about-pill scene-patch" data-open={open} style={{ width: side }}>
          <button ref={ref} className="scene-play scene-about-btn" onClick={onPress} aria-label={open ? ABOUT.dismiss : ABOUT_LABEL} aria-expanded={open} style={{ width: side, height: side, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", borderRadius: 999, color: c.textSecondary }}>
            <span style={{ position: "relative", width: 18, height: 18, display: "inline-block" }}>
              <span aria-hidden style={{ position: "absolute", inset: 0, opacity: open ? 0 : 1, transition: "opacity var(--about-ms, 667ms) ease" }}><NotebookTextIcon size={18} /></span>
              <span aria-hidden style={{ position: "absolute", inset: 0, opacity: open ? 1 : 0, transition: "opacity var(--about-ms, 667ms) ease" }}><XIcon size={18} /></span>
            </span>
          </button>
        </Glass>
      </div>
    );
  }
```

The hooks above the `return` stay where they are (they run for every form; rules of hooks).

- [ ] **Step 4: Move the button and the inert in ScenePage.** On the top bar, remove `inert={about ? "" : undefined}` from `<div className="scene-top" …>` and add it to its two children instead (`<Glass … className="scene-pill scene-borough" inert={about ? "" : undefined}>` and `<div className="scene-day" inert={about ? "" : undefined}>`). As the top bar's last child add:

```tsx
            {/* On a phone the Patch notes button is the notebook beside the day pill (D-64); it stands above the About scrim from here, so it is not inert while About is open. */}
            {phone && <AboutButton ref={aboutBtnRef} onPress={about ? closeAbout : openAbout} open={about} form="icon" />}
```

In the bottom bar, change the non-laptop branch so the Patch notes and credit row renders only on tablets:

```tsx
            ) : !phone ? (
              <div className="scene-bottom-row">
                <AboutButton ref={aboutBtnRef} onPress={about ? closeAbout : openAbout} open={about} form="dismiss" />
                <Glass material="frosted" className="scene-credit" inert={about ? "" : undefined}>
                  <Credit />
                </Glass>
              </div>
            ) : null}
```

(On a phone the credit lives only in the About overlay, which already credits Shoro and links the site; spec §4.)

- [ ] **Step 5: About's top band** (`src/components/About.tsx`). Add `const [top, setTop] = useState(0);` beside `band`. In `measure`, replace the `setBand(...)` line with:

```tsx
      // A slot in the upper half of the overlay is the phone's notebook in the top bar (D-64): the reading starts below the bar and fades under it, and nothing sits at the bottom to fade under. A slot in the lower half is the footer's pill, as before.
      const rootTop = rootRef.current?.getBoundingClientRect().top ?? 0;
      const upper = !!slot && slot.top - rootTop < (bottom - rootTop) / 2;
      setTop(upper && slot ? Math.max(0, slot.bottom - rootTop) : 0);
      setBand(slot && !upper ? Math.max(0, bottom - slot.top) : 0);
```

and add `"--about-top": \`${top}px\`,` to `vars`. In `src/index.css`, after the About rules:

```css
/* The phone's About (D-64): the close is the notebook in the top bar, so the reading starts under the bar and fades out beneath it, and the bottom keeps only its padding. */
.scene-root[data-layout^="phone"] .scene-about-scroll { padding-top: calc(var(--about-top, 0px) + 24px); padding-bottom: 32px; -webkit-mask-image: linear-gradient(to bottom, transparent 0, transparent var(--about-top, 0px), #000 calc(var(--about-top, 0px) + 20px)); mask-image: linear-gradient(to bottom, transparent 0, transparent var(--about-top, 0px), #000 calc(var(--about-top, 0px) + 20px)); }
```

- [ ] **Step 6: LiveStatus actions at 44.** In `src/components/LiveStatus.tsx` the `button` style: add `minHeight: \`var(--ctl-inner, ${CONTROL.inner}px)\`` (import `CONTROL` if absent). On a phone `--ctl-inner` is 44, so the actions are 44 tall; on the laptop they stay as today (32).

- [ ] **Step 7: Verify in the preview** at 390 × 844, 375 × 667, 320 × 568 and 430 × 932 (`resize_window`, then reload):
  - scene and synth pages fit with nothing scrolling (`document.scrollingElement.scrollHeight === innerHeight` and no element of `.scene-ui` overflows the window);
  - the borough row is six equal segments; the day pill fills the row beside a 44 × 44 notebook;
  - play is 56, the volume 44 tall, the page pill two 44 buttons;
  - **About on phone:** open it from the notebook; the × is in the same place, above the scrim, and closes it; the borough and day buttons are inert (`document.querySelector(".scene-borough").inert === true`);
  - the hero pair is ≈110 / 92 / 80 tall at the three heights;
  - `npx tsc --noEmit -p . && npm run lint && npm test && npm run build`. Screenshot each size.

- [ ] **Step 8: Commit**

```bash
git add src/index.css src/scene/ScenePage.tsx src/components/Transport.tsx src/components/About.tsx src/components/LiveStatus.tsx
git commit -m "feat(phone): layout A with 44 pt controls" -m "Borough as six segments, Patch notes as a notebook by the day pill, play at 56, page icons in the transport. The phone footer and its credit row go, the credit stays in About."
```

---

### Task 3: Phone landscape (L1)

**Files:**
- Modify: `src/index.css`

**Interfaces:**
- Consumes: `data-layout="phone-landscape"` (Task 1), the phone rules' structure (Task 2).

- [ ] **Step 1: Add the landscape block** after the phone block:

```css
/* ——— Phone landscape, layout L1 (D-64, 2026-10-05). A phone on its side leaves about 780 × 283 between Safari's bars. One row of controls (the borough at a fixed width, the day pill filling the rest, the notebook); the middle with the hero cards stacked in a left column beside the graph, or the synth's six cards 3 × 2; the transport along the bottom with play at 48, still over the 44 floor, so the plot keeps another 8. The sides keep clear of the island: the larger of 16 and the safe-area inset. ——— */
.scene-root[data-layout="phone-landscape"] .scene-ui {
  --ctl-pill: 44px; --ctl-inner: 44px; --ctl-gap-wide: 0px;
  --ui-pad: 12px; --ui-gap: 8px; --grid-gap: 8px;
  --display-size: 34px; --heading-size: 22px; --heading-line: 26px; --body-size: 13px; --body-line: 18px;
  --panel-radius: 14px; --chip-radius: 10px;
  --graph-faint-alpha: 0;
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px));
}
.scene-root[data-layout="phone-landscape"] .scene-top { display: grid; grid-template-columns: 340px minmax(0, 1fr) auto; grid-template-areas: "borough day patch"; gap: 8px; align-items: stretch; z-index: auto; }
.scene-root[data-layout="phone-landscape"] .scene-top > :not(.scene-patch-slot) { position: relative; z-index: 1; }
.scene-root[data-layout="phone-landscape"] .scene-top .scene-borough { grid-area: borough; width: auto; padding: 0; }
.scene-root[data-layout="phone-landscape"] .scene-top .scene-day { grid-area: day; display: flex; min-width: 0; margin: 0; }
.scene-root[data-layout="phone-landscape"] .scene-top .scene-day > .glass { flex: 1 1 auto; width: auto; }
.scene-root[data-layout="phone-landscape"] .scene-top > .scene-patch-slot { grid-area: patch; }
.scene-root[data-layout="phone-landscape"] .scene-borough .scene-strip { width: 100%; --strip-gap: 0px; }
.scene-root[data-layout="phone-landscape"] .scene-borough-btn { flex: 1 1 0 !important; }
.scene-root[data-layout="phone-landscape"] .scene-borough .borough-long { display: none; }
.scene-root[data-layout="phone-landscape"] .scene-borough .borough-short { display: block; }
.scene-root[data-layout="phone-landscape"] .scene-page-inner { height: 100%; flex: 1 1 auto; --card-pad: 10px; --card-value-size: 18px; --card-value-line: 22px; }
.scene-root[data-layout="phone-landscape"] .scene-page-scene .scene-page-inner { flex-direction: row; align-items: stretch; justify-content: flex-start; }
.scene-root[data-layout="phone-landscape"] .scene-hero-pair { flex: 0 0 210px; width: 210px; height: auto; grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) minmax(0, 1fr); align-self: stretch; }
.scene-root[data-layout="phone-landscape"] .scene-hero-pair .scene-meter, .scene-root[data-layout="phone-landscape"] .scene-hero-pair .scene-ladder { display: none; }
.scene-root[data-layout="phone-landscape"] .scene-panel.scene-graph { --graph-pad: 8px; --graph-pad-x: 8px; flex: 1 1 auto; min-height: 0; min-width: 0; width: auto; --graph-fill: 1; }
.scene-root[data-layout="phone-landscape"] .scene-graph-unit, .scene-root[data-layout="phone-landscape"] .scene-graph-suffix { display: none; }
.scene-root[data-layout="phone-landscape"] .scene-panel.scene-graph [role="tablist"] > button { flex: 1 1 0 !important; min-width: 0; }
.scene-root[data-layout="phone-landscape"] .scene-monitor { grid-template-columns: repeat(3, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr)); }
.scene-root[data-layout="phone-landscape"] .scene-monitor .scene-card-beats, .scene-root[data-layout="phone-landscape"] .scene-monitor .scene-card-reverb { grid-column: auto; }
.scene-root[data-layout="phone-landscape"] .scene-transport { gap: 8px; }
.scene-root[data-layout="phone-landscape"] .scene-transport > .scene-icon-pill { width: 48px; height: 48px; border-radius: 24px; }
.scene-root[data-layout="phone-landscape"] .scene-transport > .scene-pill:nth-child(2) { flex: 1 1 auto; max-width: none; padding: 0 12px; }
.scene-root[data-layout="phone-landscape"] .scene-pill.scene-views-pill { padding: 0; }
.scene-root[data-layout="phone-landscape"] .scene-views { gap: 0; }
.scene-root[data-layout="phone-landscape"] .scene-bottom { gap: 8px; display: flex; flex-direction: column; } /* over the laptop's three-column grid, which still matches a short laptop window by width */
```

- [ ] **Step 2: Verify** at 844 × 390, 932 × 430 and 667 × 375: one top row, the hero column beside the graph (plot ≥ 100 tall), the transport along the bottom, nothing overflows; the synth page is 3 × 2. **Short laptop window:** at 1280 × 480 the layout reads `phone-landscape`; confirm no laptop-width rule breaks it (the side transport and page pill are not rendered, since `laptop` is false; the bottom bar is a column; the band's pages sit side by side, since `vertical = laptop`). Screenshot each.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(phone): landscape layout L1" -m "Phones on their side got the tablet layout and overlapped. Controls in one row, hero cards beside the graph, transport at the bottom."
```

---

### Task 4: The day sheet

**Files:**
- Create: `src/components/Sheet.tsx`
- Modify: `src/components/DayNav.tsx` (`DayPicker` opens the sheet on phones)
- Modify: `src/scene/ScenePage.tsx` (the sheet host; close About on open and the reverse)
- Modify: `src/content.ts` (two placeholders)
- Modify: `src/index.css` (sheet styles)

**Interfaces:**
- Consumes: `isPhoneLayout`, `Layout` (Task 1).
- Produces: `Sheet({ open, onClose, label, host, children }: { open: boolean; onClose: () => void; label: string; host: HTMLElement | null; children: React.ReactNode })`; `DayPicker` gains `sheetHost?: HTMLElement | null` and `onOpenChange?: (open: boolean) => void`; `content.ts` exports `DAY_SHEET = { label: NAV_CALENDAR, close: "Close" }` (placeholders, Shoro's).

- [ ] **Step 1: Placeholders** in `src/content.ts`, after `NAV_CALENDAR`:

```ts
export const DAY_SHEET = { label: NAV_CALENDAR, close: "Close" } as const; // the phone's day sheet (D-65): its accessible name and the scrim's dismiss label. PLACEHOLDERS — Shoro's.
```

- [ ] **Step 2: Write `src/components/Sheet.tsx`**

```tsx
// Sheet (D-65, 2026-10-05) — the phone's bottom sheet, for the day picker. A popover could not hold the day list and the month at 44 pt (about 680 tall, more than a phone has), so on a phone the choice comes up from the bottom, in thumb reach, everything at once. It is portaled into a host inside the scaffold rather than into the body, so its scrim can reach past the window to the screen's edges under Safari's bars like the About scrim (BUG-57), and so it takes the scaffold's tokens. Modal: focus moves in on open, stays in, and returns to the opener on close; Escape, a tap on the scrim, a drag down past DRAG_CLOSE or a choice made close it. Under reduced motion it fades instead of sliding.
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DAY_SHEET } from "../content";

const DRAG_CLOSE = 80; // px down before a release closes the sheet: a deliberate pull, more than a thumb's wobble
const REDUCED = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function Sheet({ open, onClose, label, host, children }: { open: boolean; onClose: () => void; label: string; host: HTMLElement | null; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [drag, setDrag] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  const start = useRef<number | null>(null);
  // Mount, then show a frame later so the slide runs from the closed state; on close, leave once the slide is over.
  useEffect(() => {
    if (open) {
      opener.current = document.activeElement;
      setMounted(true);
      let inner = 0;
      const outer = requestAnimationFrame(() => { inner = requestAnimationFrame(() => setVisible(true)); });
      return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner); };
    }
    setVisible(false);
    setDrag(0);
    const t = setTimeout(() => setMounted(false), 300);
    (opener.current as HTMLElement | null)?.focus?.({ preventScroll: true });
    return () => clearTimeout(t);
  }, [open]);
  // Focus in on open; Tab and Shift+Tab cycle inside; Escape closes.
  useEffect(() => {
    if (!visible) return;
    const panel = panelRef.current;
    const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input, [tabindex]:not([tabindex='-1'])") ?? []);
    focusables()[0]?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key !== "Tab") return;
      const f = focusables(); if (f.length === 0) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, onClose]);
  if (!mounted || !host) return null;
  const onDown = (e: React.PointerEvent) => { start.current = e.clientY; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); };
  const onMove = (e: React.PointerEvent) => { if (start.current != null) setDrag(Math.max(0, e.clientY - start.current)); };
  const onUp = () => { if (start.current == null) return; start.current = null; if (drag > DRAG_CLOSE) onClose(); else setDrag(0); };
  return createPortal(
    <div className="scene-sheet-layer" data-visible={visible} data-reduced={REDUCED}>
      <button className="scene-sheet-scrim" aria-label={DAY_SHEET.close} tabIndex={-1} onClick={onClose} />
      <div ref={panelRef} className="glass frosted scene-sheet" role="dialog" aria-modal="true" aria-label={label} style={drag ? { transform: `translateY(${drag}px)`, transition: "none" } : undefined}>
        <div className="scene-sheet-grab" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} aria-hidden><span /></div>
        <div className="scene-sheet-body">{children}</div>
      </div>
    </div>,
    host,
  );
}
```

- [ ] **Step 3: Sheet CSS** in `src/index.css`, after the About rules:

```css
/* ——— The day sheet (D-65; Sheet.tsx). Hosted in the scaffold above everything but the entry: its scrim reaches past the window to the screen's edges like the About scrim (BUG-57), and the panel rises from the window's bottom edge with its fill carried on under the toolbar. Portrait: the six days as a 3 × 2 grid of chips above the month. Landscape: the window's full height, the days beside the month; a six-week month scrolls inside by about a row. ——— */
.scene-sheet-host { position: absolute; inset: 0; z-index: 35; pointer-events: none; }
.scene-sheet-layer { position: absolute; inset: 0; pointer-events: auto; }
.scene-sheet-scrim { position: absolute; top: calc(-1 * var(--win-t, 0px)); right: calc(-1 * var(--win-r, 0px)); bottom: calc(-1 * var(--win-b, 0px)); left: calc(-1 * var(--win-l, 0px)); border: none; padding: 0; background: rgba(var(--about-tint, 5, 6, 14), 0.45); opacity: 0; transition: opacity 240ms ease; }
.scene-sheet-layer[data-visible="true"] .scene-sheet-scrim { opacity: 1; }
.scene-sheet { position: absolute; left: 0; right: 0; bottom: calc(-1 * var(--win-b, 0px)); max-height: calc(100% + var(--win-b, 0px)); padding: 0 16px calc(16px + var(--win-b, 0px)); border-radius: 24px 24px 0 0; display: flex; flex-direction: column; transform: translateY(100%); transition: transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1); box-sizing: border-box; }
.scene-sheet-layer[data-visible="true"] .scene-sheet { transform: translateY(0); }
.scene-sheet-layer[data-reduced="true"] .scene-sheet { transform: none; opacity: 0; transition: opacity 200ms ease; }
.scene-sheet-layer[data-reduced="true"][data-visible="true"] .scene-sheet { opacity: 1; }
.scene-sheet-grab { height: 28px; display: flex; align-items: center; justify-content: center; touch-action: none; cursor: grab; flex: 0 0 auto; }
.scene-sheet-grab > span { width: 40px; height: 4px; border-radius: 2px; background: rgba(255, 255, 255, 0.4); }
.scene-sheet-body { overflow-y: auto; overscroll-behavior: contain; min-height: 0; }
.scene-sheet-days { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-bottom: 12px; }
.scene-sheet-days > button { width: 100%; height: 44px; }
.scene-root[data-layout="phone-landscape"] .scene-sheet { left: auto; width: min(640px, 100%); right: 0; top: 0; bottom: 0; max-height: none; padding-bottom: 12px; border-radius: 24px 0 0 24px; transform: translateX(100%); }
.scene-root[data-layout="phone-landscape"] .scene-sheet-layer[data-visible="true"] .scene-sheet { transform: translateX(0); }
.scene-root[data-layout="phone-landscape"] .scene-sheet-body { display: grid; grid-template-columns: 200px minmax(0, 1fr); gap: 12px; align-items: start; }
.scene-root[data-layout="phone-landscape"] .scene-sheet-days { grid-template-columns: repeat(2, minmax(0, 1fr)); margin-bottom: 0; }
```

- [ ] **Step 4: DayPicker opens the sheet on phones** (`src/components/DayNav.tsx`). Add to `Props` (used by `DayPicker`): `sheetHost?: HTMLElement | null; onOpenChange?: (open: boolean) => void;`. Import `Sheet` and `DAY_SHEET`. In `DayPicker`:
  - after `const [open, setOpen] = useState(false);` add `useEffect(() => { onOpenChange?.(open); }, [open, onOpenChange]);`
  - wrap the existing popover: `{presence.mounted && !sheetHost && createPortal(…)}` (the popover is what tablet and laptop would use; DayPicker is only mounted on phones today, so with a host it is always the sheet);
  - after it add:

```tsx
      {/* On a phone the day comes up from the bottom (D-65): the six days as 44 chips, three across, and the month beneath at 44 (its cells are --ctl-inner, 44 on a phone). Picking either closes the sheet, as the popover did. */}
      {sheetHost && (
        <Sheet open={open} onClose={close} label={DAY_SHEET.label} host={sheetHost}>
          <div className="scene-sheet-days" role="listbox" aria-label="Day">
            {options.map((o) => {
              const active = o.date === date;
              return (
                <button key={o.name} className="scene-chip" data-active={active} role="option" aria-selected={active} onClick={() => { onChange(o.date); setOpen(false); }} style={{ ...chip(active), width: "100%", height: 44 }}>
                  {o.name}
                </button>
              );
            })}
          </div>
          <CalendarGrid date={date} latestDate={latestDate} onPick={(iso) => { onChange(iso); setOpen(false); }} />
        </Sheet>
      )}
```

  - `useDismiss` closes on an outside press; with the sheet the scrim does that, so guard it: change `useDismiss(open, close, anchorRef);` to `useDismiss(open && !sheetHost, close, anchorRef);`.

- [ ] **Step 5: Host and exclusivity in ScenePage.** Add `const [sheetHost, setSheetHost] = useState<HTMLDivElement | null>(null);` and `const [daySheetOpen, setDaySheetOpen] = useState(false);`. Inside `.scene-ui`, right after `<About … />`, add `<div ref={setSheetHost} className="scene-sheet-host" />`. Pass `sheetHost={sheetHost} onOpenChange={setDaySheetOpen}` to `<DayPicker …>`. Make the two exclusive: in `openAbout`, nothing to do (the sheet is modal and its scrim covers the notebook); in the effect that reacts to `daySheetOpen`, if it becomes true and `about` is true, call `closeAbout()`:

```tsx
  useEffect(() => { if (daySheetOpen && about) closeAbout(); }, [daySheetOpen]); // eslint-disable-line react-hooks/exhaustive-deps -- the sheet and About are never both open (D-65): opening the day sheet closes About; the reverse cannot happen, since the sheet's scrim covers the notebook
```

(If `npm run lint` rejects the disable for want of a reason format, write the dependency list out instead: `[daySheetOpen, about, closeAbout]`.)

- [ ] **Step 6: Verify** at 390 × 844 and 844 × 390:
  - the day pill opens the sheet; its scrim reaches the screen's edges; days are 44 tall in a 3 × 2 grid (2 × 3 in landscape) and calendar cells 44;
  - **choice closes:** while playing, tap Wildfire: the day changes and the sheet closes, focus returns to the day pill (`document.activeElement` is the trigger);
  - Escape, a tap on the scrim and a drag of the grab handle past 80 close it;
  - **rotation:** open it at 390 × 844, resize to 844 × 390: the sheet becomes the right-hand panel with days beside the month; resize back;
  - with About open, the sheet cannot be reached (the scrim covers the pill); after closing About it opens normally.
  - `npx tsc --noEmit -p . && npm run lint && npm test && npm run build`.

- [ ] **Step 7: Commit**

```bash
git add src/components/Sheet.tsx src/components/DayNav.tsx src/scene/ScenePage.tsx src/content.ts src/index.css
git commit -m "feat(phone): day picker as a bottom sheet" -m "The list and the month at 44 pt do not fit a popover. Days as a 3 by 2 grid above the month, in thumb reach. Sheet label and close label are placeholders."
```

---

### Task 5: Tablet targets

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add the tablet block** after the landscape block:

```css
/* ——— Tablet targets (D-64, 2026-10-05). The tablet keeps its layout; every control grows to 44 inside a 52 pill, the touch floor on a screen that is almost always touched. ——— */
.scene-root[data-layout="tablet"] .scene-ui { --ctl-pill: 52px; --ctl-inner: 44px; }
.scene-root[data-layout="tablet"] .scene-pill.scene-views-pill { padding: 0 4px; }
.scene-root[data-layout="tablet"] .scene-views { gap: 4px; }
```

- [ ] **Step 2: Verify** at 768 × 1024 and 1023 × 768: the top bar's pills (borough, day nav, pins) still fit their rows per D-30's states without clipping; if a row now overflows at 768–839 (state C2) or 840–1023 (state B), let the pins pill wrap (it already wraps its chips) and note the measured widths in the comment; the band fits; nothing scrolls.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(tablet): 44 pt controls in 52 pt pills"
```

---

### Task 6: The audit, the review, the docs

**Files:**
- Create: `scripts/touch-audit.js` (run in the page, prints offenders)
- Modify: `docs/STRATEGY.md` (§8 rows D-63, D-64, D-65; §5.7), `docs/BACKLOG.md` (UX-14), `docs/CHANGELOG.md`, `CLAUDE.md` (the breakpoints line)

- [ ] **Step 1: Write `scripts/touch-audit.js`**

```js
// touch-audit — paste into the page (or run through the preview's javascript tool) at a phone or tablet size. Lists every control whose hit area is under 44 × 44 CSS px (D-64). Hidden and inert controls are skipped: they cannot be touched.
(() => {
  const MIN = 44;
  const sel = "button, a[href], input, select, [role='tab'], [role='option']";
  const out = [];
  for (const el of document.querySelectorAll(sel)) {
    if (el.closest("[inert]") || el.closest("[aria-hidden='true']")) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || cs.pointerEvents === "none") continue;
    if (r.width < MIN - 0.5 || r.height < MIN - 0.5) out.push({ el: (el.getAttribute("aria-label") || el.textContent || el.className || el.tagName).trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) });
  }
  return { layout: document.querySelector(".scene-root")?.dataset.layout, offenders: out };
})();
```

- [ ] **Step 2: Run the audit** at 320 × 568, 375 × 667, 390 × 844, 430 × 932, 667 × 375, 844 × 390, 932 × 430, 768 × 1024 and 1023 × 768, on the scene page, the synth page, with the day sheet open and with About open. Pass: `offenders` empty at every size. Fix any offender in the task that owns it and re-run.

- [ ] **Step 3: The breakpoint review.** Screenshot the page at every size in step 2, plus 1024 × 768, 1440 × 900 and 1280 × 480, for the scene, the synth, the sheet open and About open; put them in front of Shoro side by side (an Artifact page or the companion). Wait for Shoro's device check, portrait and landscape.

- [ ] **Step 4: Docs.**
  - STRATEGY §8, three rows, dated 2026-10-05, each with what, the alternative rejected and why:
    - D-63: the four layouts.
    - D-64: layout A and L1, the 44 pt floor on phones and tablets, the notebook by the day pill and the credit in About only, the page icons in the transport row. Amends D-30 for phones, D-55 and D-43.
    - D-65: the day sheet. Amends D-34.
  - Rewrite §5.7 to describe the four layouts.
  - BACKLOG: add `| UX-14 | P0 | DONE 2026-10-05 | Phone layout A, landscape L1, day sheet, 44 pt targets | spec docs/superpowers/specs/2026-10-05-phone-layout-design.md |`.
  - CHANGELOG: a dated entry saying why (24 px targets, landscape overlap, the 575/767 split) and what the choices were.
  - CLAUDE.md: replace "Mobile-first layout, two breakpoints (laptop 1024+, phone <768)." with "Four layouts by width and height, one rule in `src/utils/layout.ts` (D-63): laptop, tablet, phone, phone-landscape. Touch layouts keep every control at 44 pt or more."

- [ ] **Step 5: Commit**

```bash
git add scripts/touch-audit.js docs/STRATEGY.md docs/BACKLOG.md docs/CHANGELOG.md CLAUDE.md
git commit -m "docs: phone layout decisions D-63 to D-65, touch audit script"
```
