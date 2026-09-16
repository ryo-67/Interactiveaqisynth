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

// Fixed widths (Shoro, 2026-09-16): neither card may change width with what it shows, so each body is sized from the widest thing it could show, measured on hidden probes inside the card that set the same variables as the live text (a canvas measurement under-read Georgia by a tenth): the number card from three of the widest digit and the widest label ("AQI · now" or any month and day), the breath card from the longest of the five sentences and the widest tier name. From the tablet width up the sentence runs on one line (--hero-one-line, index.css); on phones it is two lines and, where the card is narrower than the widest text, the type scales down to it, floored at 0.8.
function useProbeWidth(ref: React.RefObject<HTMLElement>, deps: unknown[] = []): number {
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const measure = () => { const el = ref.current; if (el) setW(Math.ceil(el.scrollWidth)); };
    measure();
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return w;
}
function useOneLine(): boolean {
  const [one, setOne] = useState(false);
  useLayoutEffect(() => {
    const read = () => { const pair = document.querySelector(".scene-hero-pair"); setOne(!!pair && getComputedStyle(pair).getPropertyValue("--hero-one-line").trim() === "1"); };
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  return one;
}
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// The number card. Its label names the day the number is for: "now" on Live (the current AQI, the NowCast composite at the latest hour), the day's date on an archive day (its official daily AQI), both from engine/aqi.ts (D-42).
export function AQICard({ value, date }: { value: number | null; date: string | null }) {
  const c = themeColors(useTheme());
  const probe = useRef<HTMLDivElement>(null);
  const width = useProbeWidth(probe);
  return (
    <Card label={HERO_AQI_LABEL.replace("{when}", date ? shortDate(date) : HERO_AQI_NOW)} className="scene-card-aqi">
      <div className="scene-card-aqi-body" style={{ width: width || undefined }}>
        <AQINumber value={value} />
        {/* The probe: every width the card could need, hidden; the body takes the widest. */}
        <div ref={probe} className="scene-measure" aria-hidden>
          {["000", "888", "500"].map((d) => <div key={d} style={{ fontFamily: families.serifItalic, fontSize: `var(--card-value-size, var(--heading-size, ${typeScale.heading.size}))` }}>{d}</div>)}
          {[HERO_AQI_NOW, ...MONTHS.map((m) => `${m} 30`)].map((when) => <div key={when} style={{ fontFamily: families.ui, letterSpacing: "0.04em", fontSize: typeScale.caption.size, color: c.textMuted }}>{HERO_AQI_LABEL.replace("{when}", when)}</div>)}
        </div>
      </div>
    </Card>
  );
}

interface BreathProps {
  aqi: number | null; // the AQI the word describes: colours the word on the same scale as the graph (D-27)
  tierIndex: number;
  lift?: number; // the ramp lift for this card (D-36)
  cardRef?: (el: HTMLDivElement | null) => void; // the page samples the sky behind this card for the lift
}

// The breath card: the word and the sentence. From the tablet width up the sentence is one line and the body is as wide as the longest of the five (the card never changes width with the tier); on phones the sentence is two lines and, where the card is narrower than the widest text, the type scales down to it, floored at 0.8.
export function BreathCard({ tierIndex, aqi, lift = 0, cardRef }: BreathProps) {
  const c = themeColors(useTheme());
  const oneLine = useOneLine();
  const probe = useRef<HTMLDivElement>(null);
  const textW = useProbeWidth(probe, [oneLine]);
  const pRef = useRef<HTMLParagraphElement>(null);
  const [textScale, setTextScale] = useState(1);
  useLayoutEffect(() => {
    const measure = () => {
      const p = pRef.current;
      if (!p || !textW) return;
      const card = p.closest(".scene-card") as HTMLElement | null;
      const avail = card ? card.clientWidth - parseFloat(getComputedStyle(card).paddingLeft) - parseFloat(getComputedStyle(card).paddingRight) : textW;
      setTextScale(!oneLine && avail > 0 && avail < textW ? Math.max(0.8, avail / textW) : 1);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [textW, oneLine]);
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

  const sentence = MOOD_SENTENCES[shown];
  const [line1, line2] = oneLine ? [sentence, ""] : splitTwoLines(sentence);
  const transition = `filter ${motion.blurMs / 2}ms ease, opacity ${motion.blurMs / 2}ms ease`;
  const blur: React.CSSProperties = { filter: blurred ? "blur(6px)" : "none", opacity: blurred ? 0.4 : 1, transition };
  return (
    <Card label={HERO_BREATH_LABEL} className="scene-card-breath" cardRef={cardRef}>
      <div className="scene-card-breath-body" style={{ width: oneLine && textW ? textW : undefined }}>
        <div
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
          {line1}{line2 ? <><br />{line2}</> : null}
        </p>
        {/* The probe: every line the card could show, at the base sizes, hidden; the body (one-line mode) or the scale (two-line mode) follows the widest. */}
        <div ref={probe} className="scene-measure" aria-hidden>
          {TIER_NAMES.map((n) => <div key={n} style={{ fontFamily: families.serifItalic, fontStyle: "italic", fontSize: `var(--heading-size, ${typeScale.heading.size})` }}>{n}</div>)}
          {MOOD_SENTENCES.flatMap((sent) => (oneLine ? [sent] : splitTwoLines(sent)).filter(Boolean)).map((line, i) => <div key={i} style={{ fontFamily: families.serifItalic, fontStyle: "italic", fontSize: `var(--body-size, ${typeScale.body.size})` }}>{line}</div>)}
        </div>
      </div>
    </Card>
  );
}
