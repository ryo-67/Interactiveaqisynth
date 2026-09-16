// Routing (D-43, trial) — the patch bay: the three measurements on the left, the six destinations on the right, a line for every mapping in STRATEGY §3.2/§3.6. A line brightens on the beat when its source moved (its normalized value changed from the last beat) and settles back over the beat. If it reads as noise at phone width or repeats what the source pills already say, it goes; the pills stay either way.
// Layout: three columns. The labels are HTML so they set in the UI face; the lines are one SVG stretched between the columns (non-scaling strokes), its endpoints the rows' centres, which are known by construction: source i sits at (i + ½) / 3 of the height, destination j at (j + ½) / 6.
import React, { useRef } from "react";
import { useTheme, themeColors, families, typeScale, MONITOR } from "../utils/theme";
import { MONITOR_LABELS, SOURCE_LABELS } from "../content";
import type { MonitorState, Channel } from "../scene/useListenSession";

type Dest = "scale" | "tone" | "beats" | "brightness" | "detune" | "reverb";
const SOURCES: Channel[] = ["pm25", "o3", "no2"];
const DESTS: Dest[] = ["scale", "tone", "beats", "brightness", "detune", "reverb"];
// The mappings (§3.2 roles, §3.6 effects): PM2.5 → scale, tone, detune, reverb; NO2 → beats and tone (the pulse's and bass's index); O3 → brightness.
const LINES: Array<[Channel, Dest]> = [["pm25", "scale"], ["pm25", "tone"], ["pm25", "detune"], ["pm25", "reverb"], ["no2", "beats"], ["no2", "tone"], ["o3", "brightness"]];

const H = 100; // the SVG's own height units; it is stretched to the card's routing height

export function Routing({ m }: { m: MonitorState }) {
  const c = themeColors(useTheme());
  // Which sources moved this beat: compared with the values at the previous beat (a ref, so the comparison is one beat deep and costs nothing).
  const prev = useRef<{ hour: number | null; pm25n: number | null; o3n: number | null; no2n: number | null; moved: Record<Channel, boolean> }>({ hour: null, pm25n: null, o3n: null, no2n: null, moved: { pm25: false, o3: false, no2: false } });
  if (prev.current.hour !== m.hour) {
    const eps = 0.005;
    const diff = (a: number | null, b: number | null) => (a == null || b == null ? a !== b : Math.abs(a - b) > eps);
    prev.current = { hour: m.hour, pm25n: m.pm25n, o3n: m.o3n, no2n: m.no2n, moved: { pm25: diff(prev.current.pm25n, m.pm25n), o3: diff(prev.current.o3n, m.o3n), no2: diff(prev.current.no2n, m.no2n) } };
  }
  const moved = prev.current.moved;
  const label = { fontFamily: families.ui, letterSpacing: "0.04em", fontSize: typeScale.caption.size, lineHeight: 1, color: c.textSecondary, display: "flex", alignItems: "center" } as React.CSSProperties;
  return (
    <div className="scene-routing" style={{ height: `var(--routing-h, ${MONITOR.routingHeight.laptop}px)` }}>
      <div className="scene-routing-col scene-routing-sources">
        {SOURCES.map((s) => <span key={s} style={{ ...label, justifyContent: "flex-end", color: moved[s] ? c.textPrimary : c.textSecondary }}>{SOURCE_LABELS[s]}</span>)}
      </div>
      <svg className="scene-routing-lines" viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" aria-hidden>
        {LINES.map(([s, d]) => {
          const y1 = ((SOURCES.indexOf(s) + 0.5) / SOURCES.length) * H;
          const y2 = ((DESTS.indexOf(d) + 0.5) / DESTS.length) * H;
          // Keyed on the hour when the source moved, so the brighten restarts on each beat it moves and not otherwise.
          return <line key={moved[s] ? `${s}-${d}-${m.hour}` : `${s}-${d}`} x1={0} y1={y1} x2={100} y2={y2} data-moved={moved[s]} vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
      <div className="scene-routing-col scene-routing-dests">
        {DESTS.map((d) => <span key={d} style={label}>{MONITOR_LABELS[d]}</span>)}
      </div>
    </div>
  );
}
