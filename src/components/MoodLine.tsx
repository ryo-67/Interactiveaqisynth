// MoodLine — the hero's content (§5.2 items 2 and 3): the AQI number and the tier word on one row, on one baseline, the number left and the word right; a hairline; the mood sentence beneath. The word is the one full-strength appearance of the tier colour. Word and sentence change only at tier boundaries, with a 0.5 s blur (§5.4); the number never animates and is passed in so it stays outside the blur. The sentence's second clause ("At 8 pm, ozone carried the line") was cut on 2026-09-15 with the panel's re-layout: the panel is one thought now.
import React, { useEffect, useRef, useState } from "react";
import { useTheme, themeColors, families, typeScale, motion, aqiScaleColor } from "../utils/theme";
import { TIER_NAMES, MOOD_SENTENCES } from "../content";

interface Props {
  aqi: number | null; // the AQI the word describes: colours the word on the same scale as the graph (D-27)
  tierIndex: number;
  number: React.ReactNode; // the AQINumber, laid out on the word's row
  lift?: number; // the ramp lift for the hero panel (D-36)
}

export function MoodLine({ tierIndex, aqi, number, lift = 0 }: Props) {
  const c = themeColors(useTheme());
  // Hold the displayed tier and swap only when the tier actually changes, with the blur transition.
  const [shown, setShown] = useState(tierIndex);
  const [blurred, setBlurred] = useState(false);
  const pending = useRef(tierIndex);
  pending.current = tierIndex;
  useEffect(() => {
    if (tierIndex === shown) return;
    setBlurred(true);
    const t = setTimeout(() => { setShown(pending.current); setBlurred(false); }, motion.blurMs / 2);
    return () => clearTimeout(t);
  }, [tierIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const transition = `filter ${motion.blurMs / 2}ms ease, opacity ${motion.blurMs / 2}ms ease`;
  const blur: React.CSSProperties = { filter: blurred ? "blur(6px)" : "none", opacity: blurred ? 0.4 : 1, transition };
  return (
    <>
      <div className="scene-hero-row">
        {number}
        <div
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
      </div>
      <div className="scene-hero-rule" style={{ borderTop: `1px solid ${c.textFaint}` }} />
      <p
        style={{
          ...blur,
          fontFamily: families.serifItalic,
          fontStyle: "italic",
          fontSize: `var(--body-size, ${typeScale.body.size})`,
          lineHeight: "var(--body-line, 24px)",
          color: c.textSecondary,
          margin: 0,
          maxWidth: "30ch", // two lines at the longest sentence; the panel's width follows it
        }}
      >
        {MOOD_SENTENCES[shown]}
      </p>
    </>
  );
}
