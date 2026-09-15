// ScenePage — /scene, the Listen page as the scene (D-19, §5). The sky is a pure function of two things the engine already emits every beat: the hour under the playhead and the smoothed normalized PM2.5. Sun elevation comes from the hour; the model cross-fade, exposure, stars and the plume all follow from those two numbers. Nothing here re-derives a mapping the harness did not judge.
// Shares useListenSession with the typographic page, so both play the same data through the same engine; this page replaces that one once it passes review.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { SkyView, particleLevel, grainLevel, type CameraFacing } from "./SkyView";
import { SmokeLayer, smokeRegime } from "./SmokeLayer";
import { NightLayer } from "./NightLayer";
import { skyParamsFor, starOpacity, nightBlend } from "./skyParams";
import { sunAnglesAt, sunPositionVector, tzOffsetFromTs } from "./solar";
import { useListenSession, DEV } from "./useListenSession";
import { Glass } from "../components/Glass";
import { Transport } from "../components/Transport";
import { BoroughToggle, DateStatus } from "../components/BoroughToggle";
import { AQINumber } from "../components/AQINumber";
import { MoodLine } from "../components/MoodLine";
import { Graph, TRACK_ORDER, type TrackKey } from "../components/Graph";
import { DayNav } from "../components/DayNav";
import { SourceLine } from "../components/SourceLine";
import { PHASE0_DAYS } from "../fixtures/phase0-days";
import { ThemeContext, GLASS, HOSEK_ALBEDO, CAMERA_FACING, NYC_LAT, NYC_LON, SKY_GRADE, motion, space } from "../utils/theme";
import { STATUS_LIVE, STATUS_ARCHIVE } from "../content";

// The camera faces south (D-22, CAMERA_FACING) and the sun disc is on; its size is the token, under benchmark in the harness. Dev URL params can override both for comparison.
const qs = new URLSearchParams(window.location.search);
const DISC = qs.get("disc") !== "0";
const FACING = (qs.get("facing") ?? CAMERA_FACING) as CameraFacing;

// Eases a number toward its target over `tauMs` (exponential; ~63% of the way per tau), so per-beat steps in the data become continuous motion in the sky. Runs only while the value is off target.
function useEased(target: number, tauMs: number): number {
  const [value, setValue] = useState(target);
  const valueRef = useRef(target);
  useEffect(() => {
    let raf = 0, last = performance.now();
    const tick = (now: number) => {
      const dt = now - last; last = now;
      const v = valueRef.current + (target - valueRef.current) * (1 - Math.exp(-dt / tauMs));
      valueRef.current = Math.abs(target - v) < 1e-3 ? target : v;
      setValue(valueRef.current);
      if (valueRef.current !== target) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, tauMs]);
  return value;
}

// The graph's active tab lives in the URL so a view can be sent: ?tab=o3
function tabFromUrl(): TrackKey {
  const t = qs.get("tab") as TrackKey | null;
  return t && TRACK_ORDER.includes(t) ? t : "aqi";
}

export default function ScenePage() {
  const s = useListenSession();
  const { day, beat, playing, paused, channels, latest } = s;
  const hour = s.playheadHour; // the one clock: sun, playhead and graph all read it

  const [tab, setTab] = useState<TrackKey>(tabFromUrl);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    p.set("tab", tab);
    window.history.replaceState(null, "", `?${p}`);
  }, [tab]);


  // The particulate inputs, eased: absolute PM2.5 for the regime, lenses, grain and aberration; the veil density for the plume and the stars. Both step once per beat in the data; the sky should not.
  const pm25Target = beat ? (beat.pm25 ?? 0) : (latest?.reading.pm25 ?? 0);
  const pm25Eased = useEased(pm25Target, motion.beatMs * 1.5);
  const smokeTarget = beat?.pm25nSmoothed ?? channels.pm25 ?? 0;
  const smokeEased = useEased(smokeTarget, motion.beatMs * 1.5);

  const view = useMemo(() => {
    const firstTs = day?.[0]?.ts ?? "2023-07-12T00:00:00-04:00";
    const date = firstTs.slice(0, 10);
    const ang = sunAnglesAt(date, hour, NYC_LAT, NYC_LON, tzOffsetFromTs(firstTs));
    // MAPPING (PM2.5 → aerosol path, O3 → rayleigh + bloom, clock → exposure + fade): skyParamsFor is the one mapping, shared with the harness.
    const params = skyParamsFor(channels.pm25, channels.o3, ang.elevationDeg);
    // MAPPING (PM2.5 → plume density): the engine's own smoothed value while playing (§5.2: the scene never re-derives the smoothing); the latest hour's normalized value at rest.
    const smoke = smokeEased;
    const pm25 = pm25Eased;
    // MAPPING (smoke regime → sky saturation): the blue is absorbed under smoke, so the grade goes negative as the regime rises.
    const r = smokeRegime(pm25);
    const saturation = SKY_GRADE.saturation + (SKY_GRADE.saturationUnderSmoke - SKY_GRADE.saturation) * r;
    return { params, sun: sunPositionVector(ang), stars: starOpacity(ang.elevationDeg, channels.pm25), smoke, pm25, saturation, night: nightBlend(ang.elevationDeg) };
  }, [day, hour, channels.pm25, channels.o3, smokeEased, pm25Eased]);

  const lastTs = day?.[day.length - 1]?.ts ?? null;
  const dateLabel = lastTs ? new Date(lastTs).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
  const hourLabel = lastTs ? lastTs.slice(11, 16) : "—";

  // Glass parameters as custom properties, once, at the root (§5.6: theme.ts is the source of truth; index.css reads these).
  const glassVars = {
    "--glass-blur": GLASS.blur, "--glass-saturate": GLASS.saturate, "--glass-fill-alpha": String(GLASS.fillAlpha), "--glass-fill": GLASS.fill,
    "--glass-edge-alpha": String(GLASS.edgeAlpha), "--glass-fill-alpha-opaque": String(GLASS.fillAlphaOpaque), "--glass-blur-opaque": GLASS.blurOpaque,
    "--frosted-blur": GLASS.frostedBlur, "--frosted-fill-alpha": String(GLASS.frostedFillAlpha),
  } as React.CSSProperties;

  return (
    <ThemeContext.Provider value="dark">
      <div style={{ position: "fixed", inset: 0, background: "#05050a", ...glassVars }}>
        {/* The scene: renders continuously while playing, on demand at rest. */}
        <div style={{ position: "absolute", inset: 0 }}>
          <SkyView params={view.params} sunPosition={view.sun} starOpacity={view.stars} albedo={HOSEK_ALBEDO} disc={DISC} facing={FACING} hour={hour} saturation={view.saturation} particles={particleLevel(view.pm25)} grain={grainLevel(view.pm25)} live={playing} style={{ width: "100%", height: "100%" }} />
          <NightLayer blend={view.night} density={view.smoke} />
          <SmokeLayer density={view.smoke} pm25={view.pm25} />
        </div>

        {/* Panels: one centered column over the scene (§5.7). The column itself passes pointer events through to nothing; only the panels catch them. */}
        <div style={{ position: "absolute", inset: 0, overflowY: "auto", overflowX: "hidden", pointerEvents: "none" }}>
          <div style={{ maxWidth: "720px", margin: "0 auto", padding: `${space.md} ${space.md} calc(${space.xl} + env(safe-area-inset-bottom))`, display: "flex", flexDirection: "column", gap: space.md, minWidth: 0 }}>
            {/* Two pills, each one line: the borough words, centred; the date and status beneath, centred. Never on one row, so neither can wrap or misalign. */}
            <Glass material="glass" style={{ pointerEvents: "auto", alignSelf: "center", maxWidth: "100%", padding: `${space.sm} ${space.lg}` }}>
              <BoroughToggle selected={s.borough} onSelect={s.setBorough} />
            </Glass>
            <Glass material="glass" style={{ pointerEvents: "auto", alignSelf: "center", padding: `${space.xs} ${space.md}`, marginTop: `calc(-1 * ${space.sm})` }}>
              <DateStatus dateLabel={dateLabel} hourLabel={hourLabel} status={s.live ? STATUS_LIVE : STATUS_ARCHIVE} />
            </Glass>

            <Glass material="glass" style={{ pointerEvents: "auto", width: "100%", padding: `${space.sm} ${space.md}`, borderRadius: 20 }}>
              <DayNav date={s.date} onChange={s.setDate} loading={s.dayLoading} />
            </Glass>

            <Glass material="frosted" style={{ pointerEvents: "auto", width: "100%", padding: `${space.lg} ${space.lg} ${space.md}` }}>
              <AQINumber value={s.displayAqi} />
              <div style={{ marginTop: space.md }}>
                <MoodLine tierIndex={s.moodTier} hour={s.moodHour} dominant={s.dominant} />
              </div>
            </Glass>

            {day && day.length > 0 && (
              <Glass material="frosted" style={{ pointerEvents: "auto", width: "100%", padding: space.md }}>
                <Graph
                  day={day}
                  anchors={s.anchors}
                  playheadHour={playing || paused ? hour : null}
                  running={playing}
                  live={s.live}
                  tab={tab}
                  onTab={setTab}
                  onToggle={s.togglePlay}
                />
              </Glass>
            )}

            <Glass material="glass" style={{ pointerEvents: "auto", alignSelf: "flex-start" }}>
              <Transport playing={playing} onToggle={s.togglePlay} onVolume={s.setVolume} />
            </Glass>

            {day && day.length > 0 && (
              <Glass material="frosted" style={{ pointerEvents: "auto", width: "100%", padding: `${space.sm} ${space.md}` }}>
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
