// MoodLine — the hero's content (§5.2 items 2 and 3): the AQI number at the left, and to its right the tier word over the two-line mood sentence, both left-aligned, the number centred on that block (layout of 2026-09-15, from Shoro's mock). The word is the one full-strength appearance of the tier colour. Word and sentence change only at tier boundaries, with a 0.5 s blur (§5.4); the number never animates and is passed in so it stays outside the blur. The sentence's second clause ("At 8 pm, ozone carried the line") was cut on 2026-09-15 with the panel's re-layout: the panel is one thought now.
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTheme, themeColors, families, typeScale, space, motion, aqiScaleColor } from "../utils/theme";
import { TIER_NAMES, MOOD_SENTENCES } from "../content";

interface Props {
  aqi: number | null; // the AQI the word describes: colours the word on the same scale as the graph (D-27)
  tierIndex: number;
  number: React.ReactNode; // the AQINumber
  numberSizer: React.ReactNode; // the AQINumber at its widest (three digits), laid out hidden in the same cell so the number's column has one width whatever the value — the DOM measures it, since a canvas cannot see the tabular digits
  lift?: number; // the ramp lift for the hero panel (D-36)
}

// Two lines, always, with no orphan (2026-09-15): the sentence is split at the word boundary nearest its middle by character count, at least two words a side, and the break is rendered, so the browser never re-wraps it. Left to wrapping, the five sentences (36 to 75 characters) cannot all be two lines at one width.
export function splitTwoLines(sentence: string): [string, string] {
  const words = sentence.split(" ");
  if (words.length < 4) return [sentence, ""];
  let best = 2, bestDiff = Infinity;
  for (let i = 2; i <= words.length - 2; i++) {
    const d = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
    if (d < bestDiff) { bestDiff = d; best = i; }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

export function MoodLine({ tierIndex, aqi, number, numberSizer, lift = 0 }: Props) {
  const c = themeColors(useTheme());
  // Both columns have fixed widths: the number's from a hidden three-digit number in its cell, the text's measured in the elements' own fonts at the widest line of the five sentences or the widest tier word. So the panel's width and height are the same whatever the tier. Re-measured when the type size changes with the breakpoint and once the fonts have loaded.
  const pRef = useRef<HTMLParagraphElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const [rowWidth, setRowWidth] = useState<number | null>(null); // the number's column, the gap and the widest text: the row is fixed at this where the panel fits its content, and the number and text sit centred in it as one group, so a shorter sentence leaves even room at both sides rather than a hole at the right (2026-09-15)
  const [textScale, setTextScale] = useState(1); // < 1 where the two columns are wider than the panel (phones): the text's type scales down to fit; its line heights are fixed pixels, so the height holds
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
      // Where the panel is full width (phones set --hero-flex: 1 on it), the text column may have the row's width less the number's column and the gap, and the text scales to that if it is less. Where the panel fits its content, the row's width is the text's own, so there is nothing to fit to and the scale is 1.
      const hero = row.closest(".scene-hero");
      const flexed = hero ? getComputedStyle(hero).getPropertyValue("--hero-flex").trim() === "1" : false;
      const numberCol = row.firstElementChild as HTMLElement | null;
      const avail = row.clientWidth - (numberCol ? numberCol.getBoundingClientRect().width : 0) - parseFloat(getComputedStyle(row).columnGap || "0");
      // Floored at 0.8: a 375-wide phone lands near 0.86 (12 px); below about 350 wide the longest sentence would need less than that, and the panel clips it rather than shrink the type past reading size.
      const scale = flexed && row.clientWidth > 0 && avail > 0 && avail < w ? Math.max(0.8, avail / w) : 1;
      setTextScale(scale);
      setRowWidth(flexed ? null : Math.ceil((numberCol ? numberCol.getBoundingClientRect().width : 0) + parseFloat(getComputedStyle(row).columnGap || "0") + w));
    };
    measure();
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
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
    <div className="scene-hero-row" ref={rowRef} style={{ maxWidth: "100%", width: rowWidth != null ? `${rowWidth}px` : undefined }}>
      <div style={{ display: "grid", justifyItems: "center", flex: "0 0 auto" }}> {/* the number centred in its three-digit column, so a low number does not sit left with a gap before the text (2026-09-15) */}
        <div style={{ gridArea: "1 / 1" }}>{number}</div>
        <div style={{ gridArea: "1 / 1", visibility: "hidden" }} aria-hidden>{numberSizer}</div>
      </div>
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
