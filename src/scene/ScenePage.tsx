// ScenePage — /scene, the Listen page as the scene (D-19, §5). The sky is a pure function of two things the engine already emits every beat: the hour under the playhead and the smoothed normalized PM2.5. Sun elevation comes from the hour; the model cross-fade, exposure, stars and the plume all follow from those two numbers. Nothing here re-derives a mapping the harness did not judge.
// Shares useListenSession with the typographic page, so both play the same data through the same engine; this page replaces that one once it passes review.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { SkyView, type CameraFacing } from "./SkyView";
import { SmokeLayer } from "./SmokeLayer";
import { skyParamsFor, starOpacity } from "./skyParams";
import { sunAnglesAt, sunPositionVector, tzOffsetFromTs } from "./solar";
import { useListenSession, DEV } from "./useListenSession";
import { Glass } from "../components/Glass";
import { Transport } from "../components/Transport";
import { BoroughToggle } from "../components/BoroughToggle";
import { AQINumber } from "../components/AQINumber";
import { MoodLine } from "../components/MoodLine";
import { Score } from "../components/Score";
import { SourceLine } from "../components/SourceLine";
import { PHASE0_DAYS } from "../fixtures/phase0-days";
import { ThemeContext, GLASS, HOSEK_ALBEDO, NYC_LAT, NYC_LON, motion, space } from "../utils/theme";
import { STATUS_LIVE, STATUS_ARCHIVE } from "../content";

// Under benchmark (harness): the literal sun disc and which way the camera faces. Dev URL params only; the page defaults to the framing every judged frame used.
const qs = new URLSearchParams(window.location.search);
const DISC = qs.get("disc") === "1";
const FACING = (qs.get("facing") ?? "north") as CameraFacing;

// The sun eases along its path per beat (§5.4): the beat report gives an integer hour, and this tweens toward it over one beat so the playhead glides instead of stepping. Across the loop seam it runs 23 → 24 (= 0) rather than back across the sky. Under reduced motion the sun still moves, because it is the playhead.
function useEasedHour(target: number): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef(0);
  useEffect(() => {
    let to = target;
    const from = fromRef.current;
    if (to < from - 12) to += 24; // wrap forward, never backward
    startRef.current = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - startRef.current) / motion.beatMs);
      const e = 1 - Math.pow(1 - t, 3); // ease-out cubic: arrives on the beat, settles rather than snaps
      const v = from + (to - from) * e;
      fromRef.current = v % 24;
      setValue(v % 24);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return value;
}

export default function ScenePage() {
  const s = useListenSession();
  const { day, beat, playing, latest, channels } = s;

  // The hour under the playhead while playing; the latest reported hour at rest.
  const targetHour = beat ? beat.hour : (latest?.hour ?? 12);
  const hour = useEasedHour(targetHour);

  const view = useMemo(() => {
    const firstTs = day?.[0]?.ts ?? "2023-07-12T00:00:00-04:00";
    const date = firstTs.slice(0, 10);
    const ang = sunAnglesAt(date, hour, NYC_LAT, NYC_LON, tzOffsetFromTs(firstTs));
    // MAPPING (PM2.5 → aerosol path, O3 → rayleigh + bloom, clock → exposure + fade): skyParamsFor is the one mapping, shared with the harness.
    const params = skyParamsFor(channels.pm25, channels.o3, ang.elevationDeg);
    // MAPPING (PM2.5 → plume density): the engine's own smoothed value while playing (§5.2: the scene never re-derives the smoothing); the latest hour's normalized value at rest.
    const smoke = beat?.pm25nSmoothed ?? channels.pm25 ?? 0;
    return { params, sun: sunPositionVector(ang), stars: starOpacity(ang.elevationDeg, channels.pm25), smoke };
  }, [day, hour, channels.pm25, channels.o3, beat?.pm25nSmoothed]);

  const lastTs = day?.[day.length - 1]?.ts ?? null;
  const dateLabel = lastTs ? new Date(lastTs).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
  const hourLabel = lastTs ? lastTs.slice(11, 16) : "—";

  // Glass parameters as custom properties, once, at the root (§5.6: theme.ts is the source of truth; index.css reads these).
  const glassVars = {
    "--glass-blur": GLASS.blur, "--glass-saturate": GLASS.saturate, "--glass-fill-alpha": String(GLASS.fillAlpha),
    "--glass-edge-alpha": String(GLASS.edgeAlpha), "--glass-fill-alpha-opaque": String(GLASS.fillAlphaOpaque), "--glass-blur-opaque": GLASS.blurOpaque,
    "--frosted-blur": GLASS.frostedBlur, "--frosted-fill": GLASS.frostedFill, "--frosted-fill-alpha": String(GLASS.frostedFillAlpha),
  } as React.CSSProperties;

  return (
    <ThemeContext.Provider value="dark">
      <div style={{ position: "fixed", inset: 0, background: "#05050a", ...glassVars }}>
        {/* The scene: renders continuously while playing, on demand at rest. */}
        <div style={{ position: "absolute", inset: 0 }}>
          <SkyView params={view.params} sunPosition={view.sun} starOpacity={view.stars} albedo={HOSEK_ALBEDO} disc={DISC} facing={FACING} live={playing} style={{ width: "100%", height: "100%" }} />
          <SmokeLayer density={view.smoke} />
        </div>

        {/* Panels: one centered column over the scene (§5.7). The column itself passes pointer events through to nothing; only the panels catch them. */}
        <div style={{ position: "absolute", inset: 0, overflowY: "auto", pointerEvents: "none" }}>
          <div style={{ maxWidth: "720px", margin: "0 auto", padding: `${space.lg} ${space.md} calc(${space.xl} + env(safe-area-inset-bottom))`, display: "flex", flexDirection: "column", gap: space.lg, color: "rgba(255,255,255,0.92)" }}>
            <Glass material="glass" style={{ pointerEvents: "auto", padding: `${space.xs} ${space.md}`, alignSelf: "flex-start", maxWidth: "100%", overflowX: "auto" }}>
              <BoroughToggle selected={s.borough} onSelect={s.setBorough} dateLabel={dateLabel} hourLabel={hourLabel} status={s.live ? STATUS_LIVE : STATUS_ARCHIVE} />
            </Glass>

            <Glass material="frosted" style={{ pointerEvents: "auto", padding: `${space.lg} ${space.lg} ${space.md}` }}>
              <AQINumber value={s.displayAqi} />
              <div style={{ marginTop: space.md }}>
                <MoodLine tierIndex={s.moodTier} hour={s.moodHour} dominant={s.dominant} />
              </div>
            </Glass>

            {day && (
              <Glass material="frosted" style={{ pointerEvents: "auto", padding: space.md }}>
                <Score day={day} anchors={s.anchors} tierIndex={s.moodTier} playheadHour={beat ? beat.hour : null} live={s.live} onToggle={s.togglePlay} />
              </Glass>
            )}

            <Glass material="glass" style={{ pointerEvents: "auto", alignSelf: "flex-start" }}>
              <Transport playing={playing} onToggle={s.togglePlay} onVolume={s.setVolume} />
            </Glass>

            {day && (
              <Glass material="frosted" style={{ pointerEvents: "auto", padding: `${space.sm} ${space.md}` }}>
                <SourceLine borough={s.borough} hours={day} fallback={s.snapshot?.fallback ?? null} />
              </Glass>
            )}

            {DEV && (
              <select value={s.devDayKey} onChange={(e) => s.setDevDayKey(e.target.value)} style={{ pointerEvents: "auto", alignSelf: "flex-start" }}>
                <option value="live">Live: NYC (last 24 h)</option>
                {PHASE0_DAYS.map((d) => (
                  <option key={d.key} value={d.key}>{d.label} (fixture)</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>
    </ThemeContext.Provider>
  );
}
