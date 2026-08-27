// MoodLine — tier word and mood sentence (§5.2 item 3). The word is the one full-strength appearance of the tier color. The sentence names what you are hearing — {pollutant} is the channel with the highest normalized value at the playhead hour, {hour} is that hour — so the static AQI number (latest reading) and the moving mood never read as a contradiction. Changes only at tier boundaries, 0.5 s blur (§5.4).
import React, { useEffect, useRef, useState } from "react";
import { useTheme, themeColors, families, typeScale, space, motion, tierColorAt } from "../utils/theme";
import { TIER_NAMES, MOOD_SENTENCES, POLLUTANT_NAMES } from "../content";

interface Props {
  tierIndex: number;
  hour: number; // playhead hour (or the latest hour before playback)
  dominant: keyof typeof POLLUTANT_NAMES | null;
}

function hourWord(h: number): string {
  if (h === 0) return "midnight";
  if (h === 12) return "noon";
  return h < 12 ? `${h} am` : `${h - 12} pm`;
}

export function MoodLine({ tierIndex, hour, dominant }: Props) {
  const c = themeColors(useTheme());
  // Hold the displayed tier and swap only when the tier actually changes, with the blur transition.
  const [shown, setShown] = useState({ tierIndex, hour, dominant });
  const [blurred, setBlurred] = useState(false);
  const pending = useRef(shown);
  pending.current = { tierIndex, hour, dominant };

  useEffect(() => {
    if (tierIndex === shown.tierIndex) {
      // same tier: the sentence's hour/pollutant clause updates without ceremony
      setShown((s) => (s.hour === hour && s.dominant === dominant ? s : { ...s, hour, dominant }));
      return;
    }
    setBlurred(true);
    const t = setTimeout(() => {
      setShown(pending.current);
      setBlurred(false);
    }, motion.blurMs / 2);
    return () => clearTimeout(t);
  }, [tierIndex, hour, dominant]); // eslint-disable-line react-hooks/exhaustive-deps

  const sentence = MOOD_SENTENCES[shown.tierIndex]
    .replace("{pollutant}", shown.dominant ? POLLUTANT_NAMES[shown.dominant] : "nothing")
    .replace("{hour}", hourWord(shown.hour));

  const transition = `filter ${motion.blurMs / 2}ms ease, opacity ${motion.blurMs / 2}ms ease`;
  return (
    <div style={{ filter: blurred ? "blur(6px)" : "none", opacity: blurred ? 0.4 : 1, transition }}>
      <div
        style={{
          fontFamily: families.serifItalic,
          fontStyle: "italic",
          fontSize: typeScale.heading.size,
          lineHeight: typeScale.heading.line,
          color: tierColorAt(shown.tierIndex, "full"),
        }}
      >
        {TIER_NAMES[shown.tierIndex]}
      </div>
      <p
        style={{
          fontFamily: families.serifItalic,
          fontStyle: "italic",
          fontSize: typeScale.body.size,
          lineHeight: typeScale.body.line,
          color: c.textSecondary,
          marginTop: space.xs,
          maxWidth: "36em",
        }}
      >
        {sentence}
      </p>
    </div>
  );
}
