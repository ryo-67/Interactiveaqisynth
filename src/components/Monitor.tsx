// Monitor — the second scene page (D-43): the synthesizer's state as a bento of frosted cards, each labelled with the measurement that drives it, so a visitor can see that synthesis is happening and which pollutant is doing what. Reads the session's MonitorState (the beat report while playing, the held hour at rest) and re-derives nothing: the tier, the pattern and σ are the engine's own; the meters show the normalized values the engine's mappings take as input (§3.6), not the Hz or the wet they become.
// Every value moves on the beat: meters ease over half a beat like the sky's inputs (useEased), the ladders' lit step and the lane's hits fade over one beat (index.css).
import React from "react";
import { Glass } from "./Glass";
import { chipStyle } from "./chip";
import { Routing } from "./Routing";
import { useEased } from "../scene/useEased";
import { useTheme, themeColors, families, typeScale, space, motion, MONITOR, aqiScaleColor } from "../utils/theme";
import { MONITOR_LABELS, SOURCE_LABELS, SOURCE_JOIN, TONE_WORDS, SCALE_DISPLAY, MONITOR_UNITS, MONITOR_REST } from "../content";
import type { MonitorState, PulseHit } from "../scene/useListenSession";
import type { Channel } from "../scene/useListenSession";

interface Props {
  m: MonitorState;
  pulse: PulseHit | null;
  lifts: { scale: number; tone: number }; // the ramp lift for the two cards that colour a step (D-36)
  setRef: (key: "scale" | "tone") => (el: HTMLDivElement | null) => void; // the page samples the sky behind these two
  routing: boolean; // the ROUTING card is a trial; the page can drop it
}

const TAU = motion.beatMs * 0.5; // the sky's easing constant: settled within about a beat

// One card: label top-left in the UI face, the source pill top-right (the routing), the readout beneath.
function Card({ label, sources, className, children, cardRef }: { label: string; sources: Channel[]; className: string; children: React.ReactNode; cardRef?: (el: HTMLDivElement | null) => void }) {
  const c = themeColors(useTheme());
  return (
    <Glass ref={cardRef} material="frosted" className={`scene-card ${className}`}>
      <div className="scene-card-head">
        <span style={{ fontFamily: families.ui, letterSpacing: "0.04em", fontSize: typeScale.caption.size, lineHeight: 1, color: c.textMuted }}>{label}</span>
        {/* The source pill: the chip style in its inactive state at the small (phone) chip height, whatever the breakpoint. */}
        <span style={chipStyle(c, false, { height: 24, padding: "0 8px", borderRadius: 12 })}>{sources.map((s) => SOURCE_LABELS[s]).join(SOURCE_JOIN)}</span>
      </div>
      {children}
    </Glass>
  );
}

// The value line: the editorial serif at the heading size, like the mood word.
function Value({ children }: { children: React.ReactNode }) {
  const c = themeColors(useTheme());
  return <div style={{ fontFamily: families.serifItalic, fontStyle: "italic", fontSize: `var(--heading-size, ${typeScale.heading.size})`, lineHeight: `var(--heading-line, 40px)`, color: c.textPrimary, whiteSpace: "nowrap" }}>{children}</div>;
}
// The small line beneath a graphic: the data face, caption size.
function Sub({ children }: { children: React.ReactNode }) {
  const c = themeColors(useTheme());
  return <div style={{ fontFamily: families.data, fontSize: typeScale.caption.size, lineHeight: typeScale.caption.line, color: c.textSecondary, marginTop: space.xs, whiteSpace: "nowrap" }}>{children}</div>;
}

// A five-step ladder with one step lit, in the ramp's colour for the AQI the step was chosen from (the same rule as the mood word), white when there is none.
function Ladder({ step, aqi, lift }: { step: number; aqi: number | null; lift: number }) {
  const c = themeColors(useTheme());
  const lit = aqi == null ? c.textPrimary : aqiScaleColor(aqi, lift);
  return (
    <div className="scene-ladder" role="img" aria-label={`step ${step + 1} of 5`}>
      {[0, 1, 2, 3, 4].map((i) => <span key={i} className="scene-ladder-step" style={{ background: i === step ? lit : undefined }} />)}
    </div>
  );
}

// A horizontal meter: a 4 px track with the filled share, eased.
function Meter({ value }: { value: number | null }) {
  const v = useEased(Math.max(0, Math.min(1, value ?? 0)), TAU, "monitor meter");
  return (
    <div className="scene-meter" role="img" aria-label={value == null ? MONITOR_REST : `${Math.round(v * 100)}%`}>
      <span className="scene-meter-fill" style={{ width: `${(v * 100).toFixed(2)}%`, opacity: value == null ? 0 : 1 }} />
    </div>
  );
}

// The detune band: symmetric about the centre, its half-width σ over the 60-cent maximum (σ = 40 · 1.5, §3.6), eased.
function DetuneBand({ cents }: { cents: number }) {
  const w = useEased(Math.min(1, cents / 60), TAU, "detune band");
  return (
    <div className="scene-meter scene-detune" role="img" aria-label={`±${(cents / 100).toFixed(2)} semitones`}>
      <span className="scene-detune-centre" />
      <span className="scene-meter-fill scene-detune-band" style={{ left: `${(50 - w * 50).toFixed(2)}%`, width: `${(w * 100).toFixed(2)}%` }} />
    </div>
  );
}

// The 16-step lane: the bar's pattern as steps, a hit lit when the engine fires it and fading over a beat. Keyed on the hit's time so a repeated step restarts its fade.
function Lane({ steps, pulse, hour }: { steps: boolean[] | null; pulse: PulseHit | null; hour: number | null }) {
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

export function Monitor({ m, pulse, lifts, setRef, routing }: Props) {
  const tone = TONE_WORDS[m.tierIndex] ?? TONE_WORDS[0];
  return (
    <div className="scene-monitor" data-routing={routing}>
      {routing && (
        <Card label={MONITOR_LABELS.routing} sources={["pm25", "o3", "no2"]} className="scene-card-routing">
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
      {/* BRIGHTNESS: normalized O3 is the lowpass ceiling's input (§3.6, 2500 → 12000 Hz). The meter is that input; the Hz stays in the engine. */}
      <Card label={MONITOR_LABELS.brightness} sources={["o3"]} className="scene-card-brightness">
        <Meter value={m.o3n} />
        <Sub>{m.o3 == null ? MONITOR_REST : `${Math.round(m.o3)} ${MONITOR_UNITS.o3}`}</Sub>
      </Card>
      {/* DETUNE: σ of the melody's per-note detune (§3.6), in semitones. */}
      <Card label={MONITOR_LABELS.detune} sources={["pm25"]} className="scene-card-detune">
        <Value>±{(m.detuneCents / 100).toFixed(2)}</Value>
        <DetuneBand cents={m.detuneCents} />
        <Sub>{MONITOR_UNITS.detune}</Sub>
      </Card>
      {/* REVERB: normalized PM2.5 is the wet's input (§3.6, wet = 0.15 + 0.6·pm25n). */}
      <Card label={MONITOR_LABELS.reverb} sources={["pm25"]} className="scene-card-reverb">
        <Meter value={m.pm25n} />
        <Sub>{m.pm25 == null ? MONITOR_REST : `${m.pm25.toFixed(1)} ${MONITOR_UNITS.pm25}`}</Sub>
      </Card>
    </div>
  );
}

