// MoodLine — the hero's content (§5.2 items 2 and 3): the AQI number at the left, and to its right the tier word over the two-line mood sentence, both left-aligned, the number centred on that block (layout of 2026-09-15, from Shoro's mock). The word is the one full-strength appearance of the tier colour. Word and sentence change only at tier boundaries, with a 0.5 s blur (§5.4); the number never animates and is passed in so it stays outside the blur. The sentence's second clause ("At 8 pm, ozone carried the line") was cut on 2026-09-15 with the panel's re-layout: the panel is one thought now.
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTheme, themeColors, families, typeScale, motion, aqiScaleColor } from "../utils/theme";
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
  const [textWidth, setTextWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const p = pRef.current, row = rowRef.current, word = wordRef.current;
      if (!p || !row || !word) return;
      const ctx = document.createElement("canvas").getContext("2d");
      if (!ctx) return;
      // The font for the canvas is built from its parts: the computed `font` shorthand serializes to nothing for an element with font-variant-numeric set (the number), and the measurement then ran at the wrong size.
      const fontOf = (el: Element) => { const cs = getComputedStyle(el); return `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; };
      ctx.font = fontOf(p);
      let w = 0;
      for (const s of MOOD_SENTENCES) for (const line of splitTwoLines(s)) w = Math.max(w, ctx.measureText(line).width);
      ctx.font = fontOf(word);
      for (const name of TIER_NAMES) w = Math.max(w, ctx.measureText(name).width);
      setTextWidth(Math.ceil(w)); // the text column: the widest sentence line or tier word
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
    <div className="scene-hero-row" ref={rowRef} style={{ maxWidth: "100%" }}>
      <div style={{ display: "grid", justifyItems: "center", flex: "0 0 auto" }}> {/* the number centred in its three-digit column, so a low number does not sit left with a gap before the text (2026-09-15) */}
        <div style={{ gridArea: "1 / 1" }}>{number}</div>
        <div style={{ gridArea: "1 / 1", visibility: "hidden" }} aria-hidden>{numberSizer}</div>
      </div>
      <div style={{ width: textWidth != null ? `${textWidth}px` : undefined, flex: "0 0 auto", minWidth: 0 }}>
        <div
          ref={wordRef}
          style={{
            ...blur,
            fontFamily: families.serifItalic,
            fontStyle: "italic",
            fontSize: `var(--heading-size, ${typeScale.heading.size})`, // the scene scales this per breakpoint
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
          fontSize: `var(--body-size, ${typeScale.body.size})`,
          lineHeight: "var(--body-line, 24px)",
          color: c.textSecondary,
          margin: 0,
          whiteSpace: "nowrap",
        }}
      >
        {line1}<br />{line2}
      </p>
      </div>
    </div>
  );
}
