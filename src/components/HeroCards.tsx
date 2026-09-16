// HeroCards — the hero as two widgets with the monitor's exact anatomy (Shoro, 2026-09-16; §5.2 items 2 and 3): label, value, gauge. The AQI card: the number under "AQI · now" on Live or "AQI · Oct 29" on an archive day, and beneath it one bar in the number's own colour on the six-category EPA ramp. The Breath card: the tier word in white over the five-step ladder the scale and tone cards carry, its lit step in the tier's colour on the ramp (the ladder is where the colour lives; the word stays white). The word changes only at tier boundaries, with a 0.5 s blur (§5.4); the number never animates. The mood sentence went with this: the gauge says what it said.
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Card } from "./Card";
import { AQINumber } from "./AQINumber";
import { Ladder, AQIBar } from "./Gauges";
import { useTheme, themeColors, families, typeScale, motion } from "../utils/theme";
import { TIER_NAMES, HERO_AQI_LABEL, HERO_AQI_NOW, HERO_BREATH_LABEL } from "../content";
import { shortDate } from "../utils/time";

// Fixed widths (Shoro, 2026-09-16): neither card may change width with what it shows, so each body is sized from the widest thing it could show, measured on a hidden probe inside the card that sets the same variables as the live text: the number card from three of the widest digit and the widest label ("AQI · now" or any month and day), the breath card from the widest tier name. Below laptop the breath card takes the rest of the section anyway.
function useProbeWidth(ref: React.RefObject<HTMLElement>): number {
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const measure = () => { const el = ref.current; if (el) setW(Math.ceil(el.scrollWidth)); };
    measure();
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure);
    return () => window.removeEventListener("resize", measure);
  }, [ref]);
  return w;
}
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const valueStyle: React.CSSProperties = { fontFamily: families.serifItalic, fontStyle: "italic", fontSize: `var(--card-value-size, var(--heading-size, ${typeScale.heading.size}))`, lineHeight: `var(--card-value-line, var(--heading-line, 40px))`, whiteSpace: "nowrap" };

interface AQIProps {
  value: number | null;
  date: string | null;
  lift?: number; // the ramp lift for this card (D-36)
  cardRef?: (el: HTMLDivElement | null) => void; // the page samples the sky behind this card for the lift
}

// The number card. Its label names the day the number is for: "now" on Live (the current AQI, the NowCast composite at the latest hour), the day's date on an archive day (its official daily AQI), both from engine/aqi.ts (D-42). The bar beneath is the number's category colour.
export function AQICard({ value, date, lift = 0, cardRef }: AQIProps) {
  const c = themeColors(useTheme());
  const probe = useRef<HTMLDivElement>(null);
  const width = useProbeWidth(probe);
  return (
    <Card label={HERO_AQI_LABEL.replace("{when}", date ? shortDate(date) : HERO_AQI_NOW)} className="scene-card-aqi" cardRef={cardRef}>
      <div className="scene-card-body" style={{ width: width || undefined }}>
        <AQINumber value={value} />
        {/* The probe: every width the card could need, hidden; the body takes the widest. */}
        <div ref={probe} className="scene-measure" aria-hidden>
          {["000", "888", "500"].map((d) => <div key={d} style={valueStyle}>{d}</div>)}
          {[HERO_AQI_NOW, ...MONTHS.map((m) => `${m} 30`)].map((when) => <div key={when} style={{ fontFamily: families.ui, letterSpacing: "0.04em", fontSize: typeScale.caption.size, color: c.textMuted }}>{HERO_AQI_LABEL.replace("{when}", when)}</div>)}
        </div>
      </div>
      <AQIBar aqi={value} lift={lift} />
    </Card>
  );
}

interface BreathProps {
  aqi: number | null; // the AQI the word describes: colours the word and the lit step on the same scale as the graph (D-27)
  tierIndex: number;
  lift?: number; // the ramp lift for this card (D-36)
  cardRef?: (el: HTMLDivElement | null) => void; // the page samples the sky behind this card for the lift
}

// The breath card: the word over the ladder, the scale and tone cards' anatomy.
export function BreathCard({ tierIndex, aqi, lift = 0, cardRef }: BreathProps) {
  const c = themeColors(useTheme());
  const probe = useRef<HTMLDivElement>(null);
  const width = useProbeWidth(probe);
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
  const transition = `filter ${motion.blurMs / 2}ms ease, opacity ${motion.blurMs / 2}ms ease`;
  return (
    <Card label={HERO_BREATH_LABEL} className="scene-card-breath" cardRef={cardRef}>
      <div className="scene-card-body" style={{ width: width || undefined }}>
        {/* The word in white: the ladder beneath carries the colour (Shoro, 2026-09-16). */}
        <div style={{ ...valueStyle, filter: blurred ? "blur(6px)" : "none", opacity: blurred ? 0.4 : 1, transition, color: c.textPrimary }}>
          {TIER_NAMES[shown]}
        </div>
        {/* The probe: the widest tier name, hidden; the body takes it. */}
        <div ref={probe} className="scene-measure" aria-hidden>
          {TIER_NAMES.map((n) => <div key={n} style={valueStyle}>{n}</div>)}
        </div>
      </div>
      <Ladder step={shown} aqi={aqi} lift={lift} />
    </Card>
  );
}
