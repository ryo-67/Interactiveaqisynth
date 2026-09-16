// Monitor — the second scene page (D-43): the synthesizer's state as a bento of frosted cards, each labelled with the measurement that drives it, so a visitor can see that synthesis is happening and which pollutant is doing what. Reads the session's MonitorState (the beat report while playing, the held hour at rest) and re-derives nothing: the tier, the pattern and σ are the engine's own; the meters show the normalized values the engine's mappings take as input (§3.6), not the Hz or the wet they become.
// Every value moves on the beat: meters ease over half a beat like the sky's inputs (Gauges.tsx, useEased), the ladders' lit step and the lane's hits fade over one beat (index.css).
import React from "react";
import { Card } from "./Card";
import { Routing } from "./Routing";
import { Ladder, Meter, DetuneBand, Lane } from "./Gauges";
import { useTheme, themeColors, families, typeScale } from "../utils/theme";
import { MONITOR_LABELS, TONE_WORDS, SCALE_DISPLAY, MONITOR_UNITS, MONITOR_REST } from "../content";
import type { MonitorState, PulseHit } from "../scene/useListenSession";

interface Props {
  m: MonitorState;
  pulse: PulseHit | null;
  lifts: { scale: number; tone: number }; // the ramp lift for the two cards that colour a step (D-36)
  setRef: (key: "scale" | "tone") => (el: HTMLDivElement | null) => void; // the page samples the sky behind these two
  routing: boolean; // the ROUTING card is a trial; the page can drop it
}


// The value line: the editorial serif at the heading size, like the mood word.
function Value({ children }: { children: React.ReactNode }) {
  const c = themeColors(useTheme());
  // The size is the mood word's, unless the breakpoint sets the card's own (phones: index.css --card-value-size, a step smaller so the card keeps its padding).
  return <div style={{ fontFamily: families.serifItalic, fontStyle: "italic", fontSize: `var(--card-value-size, var(--heading-size, ${typeScale.heading.size}))`, lineHeight: `var(--card-value-line, var(--heading-line, 40px))`, color: c.textPrimary, whiteSpace: "nowrap" }}>{children}</div>;
}
// The small line beneath a graphic: the data face, caption size.
function Sub({ children }: { children: React.ReactNode }) {
  const c = themeColors(useTheme());
  return <div style={{ fontFamily: families.data, fontSize: typeScale.caption.size, lineHeight: typeScale.caption.line, color: c.textSecondary, whiteSpace: "nowrap" }}>{children}</div>; // spaced by the card's own gap (2026-09-16: an extra margin pushed the line past the row the section height gives it)
}

export function Monitor({ m, pulse, lifts, setRef, routing }: Props) {
  const tone = TONE_WORDS[m.tierIndex] ?? TONE_WORDS[0];
  return (
    <div className="scene-monitor" data-routing={routing}>
      {routing && (
        <Card label={MONITOR_LABELS.routing} className="scene-card-routing">
          <Routing m={m} />
        </Card>
      )}
      {/* SCALE: PM2.5 → tier → scale (§3.4). The lit step in the category colour of the AQI the tier came from. */}
      <Card label={MONITOR_LABELS.scale} sources={["pm25"]} className="scene-card-scale" cardRef={setRef("scale")}>
        <Value>{SCALE_DISPLAY[m.scaleName] ?? m.scaleName}</Value>
        <Ladder step={m.tierIndex} aqi={m.tierAqi} lift={lifts.scale} />
      </Card>
      {/* TONE: harmonicity and modulation index by tier (§3.5) as one word; NO2 raises the index on pulse and bass (§3.6), so it is named too. */}
      <Card label={MONITOR_LABELS.tone} sources={["pm25", "no2"]} className="scene-card-tone" cardRef={setRef("tone")}>
        <Value>{tone}</Value>
        <Ladder step={m.tierIndex} aqi={m.tierAqi} lift={lifts.tone} />
      </Card>
      {/* BEATS: NO2 → Euclidean k over 16 (§3.2); the lane is the engine's pattern, lit as it fires. */}
      <Card label={MONITOR_LABELS.beats} sources={["no2"]} className="scene-card-beats">
        <Value>{m.k == null ? MONITOR_REST : m.k} <span className="scene-card-unit">{MONITOR_UNITS.beats}</span></Value>
        <Lane steps={m.steps} pulse={pulse} hour={m.hour} />
      </Card>
      {/* BRIGHTNESS: normalized O3 is the lowpass ceiling's input (§3.6, 2500 → 12000 Hz). Read as 1.0 to 10.0 over that input, the meter beneath it; the Hz stays in the engine. */}
      <Card label={MONITOR_LABELS.brightness} sources={["o3"]} className="scene-card-brightness">
        <Value>{m.o3n == null ? MONITOR_REST : (1 + 9 * Math.max(0, Math.min(1, m.o3n))).toFixed(1)}</Value>
        <Meter value={m.o3n} />
        <Sub>{m.o3 == null ? MONITOR_REST : `${Math.round(m.o3)} ${MONITOR_UNITS.o3}`}</Sub>
      </Card>
      {/* DETUNE: σ of the melody's per-note detune (§3.6), in semitones. */}
      <Card label={MONITOR_LABELS.detune} sources={["pm25"]} className="scene-card-detune">
        <Value>±{(m.detuneCents / 100).toFixed(2)}</Value>
        <DetuneBand cents={m.detuneCents} />
        <Sub>{MONITOR_UNITS.detune}</Sub>
      </Card>
      {/* REVERB: normalized PM2.5 is the wet's input (§3.6, wet = 0.15 + 0.6·pm25n). Read as 0 to 100% of that input, the meter beneath it. */}
      <Card label={MONITOR_LABELS.reverb} sources={["pm25"]} className="scene-card-reverb">
        <Value>{m.pm25n == null ? MONITOR_REST : `${Math.round(100 * Math.max(0, Math.min(1, m.pm25n)))}%`}</Value>
        <Meter value={m.pm25n} />
        <Sub>{m.pm25 == null ? MONITOR_REST : `${m.pm25.toFixed(1)} ${MONITOR_UNITS.pm25}`}</Sub>
      </Card>
    </div>
  );
}

