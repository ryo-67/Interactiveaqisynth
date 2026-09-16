// HeroCards — the hero as two widgets in the monitor's style (Shoro, 2026-09-16; §5.2 items 2 and 3): the AQI number under "AQI · now" on Live or "AQI · Oct 29" on an archive day, and beside it the tier word over the two-line mood sentence under "Breath". The word is the one full-strength appearance of the tier colour; word and sentence change only at tier boundaries, with a 0.5 s blur (§5.4); the number never animates. Replaces MoodLine (one panel, number at the left of the text) the same day.
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Card } from "./Card";
import { AQINumber } from "./AQINumber";
import { useTheme, themeColors, families, typeScale, motion, aqiScaleColor, MOOD_SPLIT } from "../utils/theme";
import { TIER_NAMES, MOOD_SENTENCES, HERO_AQI_LABEL, HERO_AQI_NOW, HERO_BREATH_LABEL } from "../content";
import { shortDate } from "../utils/time";

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

// The number card. Its label names the day the number is for: "now" on Live (the current AQI, the NowCast composite at the latest hour), the day's date on an archive day (its official daily AQI), both from engine/aqi.ts (D-42).
export function AQICard({ value, date }: { value: number | null; date: string | null }) {
  return (
    <Card label={HERO_AQI_LABEL.replace("{when}", date ? shortDate(date) : HERO_AQI_NOW)} className="scene-card-aqi">
      <div className="scene-card-aqi-body"><AQINumber value={value} /></div>
    </Card>
  );
}

interface BreathProps {
  aqi: number | null; // the AQI the word describes: colours the word on the same scale as the graph (D-27)
  tierIndex: number;
  lift?: number; // the ramp lift for this card (D-36)
  cardRef?: (el: HTMLDivElement | null) => void; // the page samples the sky behind this card for the lift
}

// The breath card: the word and the sentence. The layout is fixed — two lines, the split, the spacing; where the card is narrower than the widest of the five sentences (phones), the type scales down to it, floored at 0.8.
export function BreathCard({ tierIndex, aqi, lift = 0, cardRef }: BreathProps) {
  const c = themeColors(useTheme());
  const pRef = useRef<HTMLParagraphElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const [textScale, setTextScale] = useState(1);
  useLayoutEffect(() => {
    const measure = () => {
      const p = pRef.current, word = wordRef.current;
      if (!p || !word) return;
      const ctx = document.createElement("canvas").getContext("2d");
      if (!ctx) return;
      // The base size comes from the scene's variable, not the element (whose size already carries the last scale); the canvas font is built from its parts.
      const baseSize = (el: Element, v: string, fallback: string) => { const raw = getComputedStyle(el).getPropertyValue(v).trim(); return raw || fallback; };
      const fontOf = (el: Element, size: string) => { const cs = getComputedStyle(el); return `${cs.fontStyle} ${cs.fontWeight} ${size} ${cs.fontFamily}`; };
      ctx.font = fontOf(p, baseSize(p, "--body-size", typeScale.body.size));
      let w = 0;
      for (const s of MOOD_SENTENCES) for (const line of splitTwoLines(s)) w = Math.max(w, ctx.measureText(line).width);
      ctx.font = fontOf(word, baseSize(word, "--heading-size", typeScale.heading.size));
      for (const name of TIER_NAMES) w = Math.max(w, ctx.measureText(name).width);
      // The room the text has: the card's inner width. Where that is less than the widest text, the text scales down to it, floored at 0.8.
      const card = p.closest(".scene-card") as HTMLElement | null;
      const avail = card ? card.clientWidth - parseFloat(getComputedStyle(card).paddingLeft) - parseFloat(getComputedStyle(card).paddingRight) : w;
      setTextScale(avail > 0 && avail < w ? Math.max(0.8, avail / w) : 1);
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
    <Card label={HERO_BREATH_LABEL} className="scene-card-breath" cardRef={cardRef}>
      <div className="scene-card-breath-body">
        <div
          ref={wordRef}
          style={{
            ...blur,
            fontFamily: families.serifItalic,
            fontStyle: "italic",
            fontSize: `calc(var(--heading-size, ${typeScale.heading.size}) * ${textScale.toFixed(3)})`, // the scene scales this per breakpoint; textScale fits it to a narrow card
            lineHeight: "var(--heading-line, 40px)", // in px per breakpoint, so the line box stays on the 4 px grid
            color: aqi == null ? c.textPrimary : aqiScaleColor(aqi, lift), // the one ramp, at this card's lift (D-36)
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
            whiteSpace: "nowrap",
          }}
        >
          {line1}<br />{line2}
        </p>
      </div>
    </Card>
  );
}
