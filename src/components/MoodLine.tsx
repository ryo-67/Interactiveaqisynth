// MoodLine — the hero's content (§5.2 items 2 and 3): the AQI number at the left, and to its right the tier word over the two-line mood sentence, both left-aligned, the number centred on that block (layout of 2026-09-15, from Shoro's mock). The word is the one full-strength appearance of the tier colour. Word and sentence change only at tier boundaries, with a 0.5 s blur (§5.4); the number never animates and is passed in so it stays outside the blur. The sentence's second clause ("At 8 pm, ozone carried the line") was cut on 2026-09-15 with the panel's re-layout: the panel is one thought now.
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTheme, themeColors, families, typeScale, space, motion, aqiScaleColor, MOOD_SPLIT } from "../utils/theme";
import { TIER_NAMES, MOOD_SENTENCES } from "../content";

interface Props {
  aqi: number | null; // the AQI the word describes: colours the word on the same scale as the graph (D-27)
  tierIndex: number;
  number: React.ReactNode; // the AQINumber
  value?: number | null; // what the number shows, for its optical centring: Georgia's figures are old-style (a 1 sits at x-height, a 6 rises, a 5 drops), so each value's ink is measured and placed on the stack's centre, then lifted by the optical bias
  lift?: number; // the ramp lift for the hero panel (D-36)
}

// Two lines, always, with no orphan (2026-09-15): the break is chosen and rendered, so the browser never re-wraps it (left to wrapping, the five sentences, 36 to 75 characters, cannot all be two lines at one width). The first line has a floor (MOOD_SPLIT.firstLineMinChars) so a short sentence is not cut into two stubs: among the splits whose first line clears the floor, the most balanced; if none does, the longest first line. Two words a side, always.
export function splitTwoLines(sentence: string, firstLineMin: number = MOOD_SPLIT.firstLineMinChars): [string, string] {
  const words = sentence.split(" ");
  if (words.length < 4) return [sentence, ""];
  let best = -1, bestDiff = Infinity, longest = 2;
  for (let i = 2; i <= words.length - 2; i++) {
    const a = words.slice(0, i).join(" ").length, b = words.slice(i).join(" ").length;
    longest = i; // i rises, so the last feasible split has the longest first line
    if (a < firstLineMin) continue;
    const d = Math.abs(a - b);
    if (d < bestDiff) { bestDiff = d; best = i; }
  }
  const at = best >= 0 ? best : longest;
  return [words.slice(0, at).join(" "), words.slice(at).join(" ")];
}

export function MoodLine({ tierIndex, aqi, number, value = null, lift = 0 }: Props) {
  const c = themeColors(useTheme());
  // The panel fits each tier's content (2026-09-15: a width fixed at the widest tier left holes); what is fixed is the layout — two lines, the split, the spacing — and the height. On a full-width phone panel the text scales to the room left beside the number; the widest text line of the five is measured for that.
  const pRef = useRef<HTMLParagraphElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const [textScale, setTextScale] = useState(1);
  const [numberShift, setNumberShift] = useState(0); // px, applied as translateY: the shown digits' ink centre onto the box centre, then the optical lift // < 1 where the two columns are wider than the panel (phones): the text's type scales down to fit; its line heights are fixed pixels, so the height holds
  useLayoutEffect(() => {
    const measure = () => {
      const p = pRef.current, row = rowRef.current, word = wordRef.current;
      if (!p || !row || !word) return;
      const ctx = document.createElement("canvas").getContext("2d");
      if (!ctx) return;
      // The font for the canvas is built from its parts: the computed `font` shorthand serializes to nothing for an element with font-variant-numeric set (the number), and the measurement then ran at the wrong size.
      // The base size comes from the scene's variable, not the element (whose size already carries the last scale).
      const baseSize = (el: Element, v: string, fallback: string) => { const raw = getComputedStyle(el.closest(".scene-ui") ?? document.documentElement).getPropertyValue(v).trim(); return raw || fallback; };
      const fontOf = (el: Element, size?: string) => { const cs = getComputedStyle(el); return `${cs.fontStyle} ${cs.fontWeight} ${size ?? cs.fontSize} ${cs.fontFamily}`; };
      ctx.font = fontOf(p, baseSize(p, "--body-size", typeScale.body.size));
      let w = 0;
      for (const s of MOOD_SENTENCES) for (const line of splitTwoLines(s)) w = Math.max(w, ctx.measureText(line).width);
      ctx.font = fontOf(word, baseSize(word, "--heading-size", typeScale.heading.size));
      for (const name of TIER_NAMES) w = Math.max(w, ctx.measureText(name).width);
      // The room the text can have: the column the panel sits in, less the panel's padding, the number and the gap. Where that is less than the widest text (narrow phones), the text scales down to it — floored at 0.8, since below about 350 wide the longest sentence would need less and the panel clips it rather than shrink the type past reading size. Everywhere else the scale is 1 and the panel simply fits its content.
      const hero = row.closest(".scene-hero") as HTMLElement | null;
      const column = hero?.parentElement;
      const numberCol = row.firstElementChild as HTMLElement | null;
      const pad = hero ? parseFloat(getComputedStyle(hero).paddingLeft) + parseFloat(getComputedStyle(hero).paddingRight) : 0;
      const avail = column ? column.clientWidth - pad - (numberCol ? numberCol.getBoundingClientRect().width : 0) - parseFloat(getComputedStyle(row).columnGap || "0") : w;
      const scale = avail > 0 && avail < w ? Math.max(0.8, avail / w) : 1;
      // The number's optical centre. The row centres the number's LINE BOX on the text block; where the ink of the shown digits sits in that box depends on the digits (old-style figures), so it is measured: the baseline's place in the box from the font's ascent and descent and the line height, the ink's extent from the string itself. The shift puts the ink centre on the box centre, then lifts it by the optical bias, since the stack's descenders pull its own visual centre up.
      const numberEl = numberCol?.querySelector<HTMLElement>("div") ?? numberCol;
      if (numberEl) {
        const cs = getComputedStyle(numberEl);
        ctx.font = fontOf(numberEl, cs.fontSize);
        const text = numberEl.textContent || "0";
        const m = ctx.measureText(text);
        const size = parseFloat(cs.fontSize), lineH = parseFloat(cs.lineHeight) || size;
        const fontAsc = m.fontBoundingBoxAscent ?? size * 0.9, fontDesc = m.fontBoundingBoxDescent ?? size * 0.2;
        const baselineY = (lineH - (fontAsc + fontDesc)) / 2 + fontAsc;
        const inkCentreY = baselineY + (m.actualBoundingBoxDescent - m.actualBoundingBoxAscent) / 2;
        setNumberShift(Math.round((lineH / 2 - inkCentreY - size * typeScale.display.opticalLiftEm) * 10) / 10);
      }
      setTextScale(scale);
    };
    measure();
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure);
    return () => window.removeEventListener("resize", measure);
  }, [value]); // the digits shown set the number's shift
  // Hold the displayed tier and swap only when the tier actually changes, with the blur transition.
  const [shown, setShown] = useState(tierIndex);
  const [blurred, setBlurred] = useState(false);
  const pending = useRef(tierIndex);
  pending.current = tierIndex;
  useEffect(() => {
    // The tier is back to the one shown before the swap fired (it crossed a boundary and returned, which a day transition does): the timer was cleared by the cleanup, so the blur must be lifted here or it stays for good (2026-09-15).
    if (tierIndex === shown) { setBlurred(false); return; }
    setBlurred(true);
    const t = setTimeout(() => { setShown(pending.current); setBlurred(false); }, motion.blurMs / 2);
    return () => clearTimeout(t);
  }, [tierIndex, shown]);

  const [line1, line2] = splitTwoLines(MOOD_SENTENCES[shown]);
  const transition = `filter ${motion.blurMs / 2}ms ease, opacity ${motion.blurMs / 2}ms ease`;
  const blur: React.CSSProperties = { filter: blurred ? "blur(6px)" : "none", opacity: blurred ? 0.4 : 1, transition };
  return (
    <div className="scene-hero-row" ref={rowRef} style={{ maxWidth: "100%" }}>
      <div style={{ flex: "0 0 auto", transform: `translateY(${numberShift}px)` }}>{number}</div>
      <div style={{ flex: "0 0 auto", minWidth: 0 }}>
        <div
          ref={wordRef}
          style={{
            ...blur,
            fontFamily: families.serifItalic,
            fontStyle: "italic",
            fontSize: `calc(var(--heading-size, ${typeScale.heading.size}) * ${textScale.toFixed(3)})`, // the scene scales this per breakpoint; textScale fits it to a narrow panel
            lineHeight: "var(--heading-line, 40px)", // in px per breakpoint, so the line box stays on the 4 px grid
            color: aqi == null ? c.textPrimary : aqiScaleColor(aqi, lift), // the one ramp, at this panel's lift (D-36)
            whiteSpace: "nowrap",
          }}
        >
          {TIER_NAMES[shown]}
        </div>
      <p
        ref={pRef}
        style={{
          ...blur,
          fontFamily: families.serifItalic,
          fontStyle: "italic",
          fontSize: `calc(var(--body-size, ${typeScale.body.size}) * ${textScale.toFixed(3)})`,
          lineHeight: "var(--body-line, 24px)",
          color: c.textSecondary,
          margin: 0,
          marginTop: space.xs, // air between the word and the sentence (2026-09-15)
          whiteSpace: "nowrap",
        }}
      >
        {line1}<br />{line2}
      </p>
      </div>
    </div>
  );
}
