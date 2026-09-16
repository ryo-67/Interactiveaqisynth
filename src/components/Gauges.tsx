// Gauges — the small readouts the widgets share (D-43, 2026-09-16): the five-step ladder, the meter, the detune band, the sixteen-step lane, and a single bar in one colour. All 4 px tracks (the slider's hairline; theme.ts MONITOR), lit steps and fills fading over one beat (index.css). The monitor's cards and the hero's two cards draw from the same set, so the pages are one family.
import React from "react";
import { useEased } from "../scene/useEased";
import { useTheme, themeColors, motion, aqiScaleColor } from "../utils/theme";
import { MONITOR_REST } from "../content";
import type { PulseHit } from "../scene/useListenSession";
import { DETUNE_MAX_CENTS } from "../engine/scales";

const TAU = motion.beatMs * 0.5; // the sky's easing constant: settled within about a beat

// A six-step ladder, one step per EPA grade (D-44), with one step lit, in the ramp's colour for the AQI the step was chosen from (the same rule as the mood word), white when there is none.
export function Ladder({ step, aqi, lift }: { step: number; aqi: number | null; lift: number }) {
  const c = themeColors(useTheme());
  const lit = aqi == null ? c.textPrimary : aqiScaleColor(aqi, lift);
  return (
    <div className="scene-ladder" role="img" aria-label={`step ${step + 1} of 6`}>
      {[0, 1, 2, 3, 4, 5].map((i) => <span key={i} className="scene-ladder-step" style={{ background: i === step ? lit : undefined }} />)}
    </div>
  );
}

// One full bar in the ramp's colour for an AQI (the hero's number card): the six EPA categories as one continuous scale, at this panel's lift (D-36). Unlit when there is no number.
export function AQIBar({ aqi, lift }: { aqi: number | null; lift: number }) {
  return (
    <div className="scene-meter" role="img" aria-label={aqi == null ? MONITOR_REST : `AQI ${aqi}`}>
      <span className="scene-meter-fill scene-aqi-bar" style={{ width: "100%", background: aqi == null ? undefined : aqiScaleColor(aqi, lift), opacity: aqi == null ? 0 : 1 }} />
    </div>
  );
}

// A horizontal meter: a 4 px track with the filled share, eased.
export function Meter({ value }: { value: number | null }) {
  const v = useEased(Math.max(0, Math.min(1, value ?? 0)), TAU, "monitor meter");
  return (
    <div className="scene-meter" role="img" aria-label={value == null ? MONITOR_REST : `${Math.round(v * 100)}%`}>
      <span className="scene-meter-fill" style={{ width: `${(v * 100).toFixed(2)}%`, opacity: value == null ? 0 : 1 }} />
    </div>
  );
}

// The detune band: symmetric about the centre, its half-width σ over the full semitone the anchors reach at AQI 400 (DETUNE_MAX_CENTS, §3.6, D-44), eased.
export function DetuneBand({ cents }: { cents: number }) {
  const w = useEased(Math.min(1, cents / DETUNE_MAX_CENTS), TAU, "detune band");
  return (
    <div className="scene-meter scene-detune" role="img" aria-label={`±${(cents / 100).toFixed(2)} semitones`}>
      <span className="scene-detune-centre" />
      <span className="scene-meter-fill scene-detune-band" style={{ left: `${(50 - w * 50).toFixed(2)}%`, width: `${(w * 100).toFixed(2)}%` }} />
    </div>
  );
}

// The 16-step lane: the bar's pattern as steps, a hit lit when the engine fires it and fading over a beat. Keyed on the hit's time so a repeated step restarts its fade.
export function Lane({ steps, pulse, hour }: { steps: boolean[] | null; pulse: PulseHit | null; hour: number | null }) {
  const sameBar = pulse != null && hour != null && Math.floor(pulse.hour / 4) === Math.floor(hour / 4);
  return (
    <div className="scene-lane" role="img" aria-label={steps ? `${steps.filter(Boolean).length} of 16` : MONITOR_REST}>
      {Array.from({ length: 16 }, (_, i) => {
        const hit = steps?.[i] ?? false;
        const lit = sameBar && pulse!.step === i;
        return <span key={lit ? `${i}-${pulse!.t}` : i} className="scene-lane-step" data-hit={hit} data-lit={lit} />;
      })}
    </div>
  );
}
