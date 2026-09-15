// ScenePage — /scene, the Listen page as the scene (D-19, §5). The sky is a pure function of two things the engine already emits every beat: the hour under the playhead and the smoothed normalized PM2.5. Sun elevation comes from the hour; the model cross-fade, exposure, stars and the plume all follow from those two numbers. Nothing here re-derives a mapping the harness did not judge.
// Shares useListenSession with the typographic page, so both play the same data through the same engine; this page replaces that one once it passes review.
import { SKY_TOGGLE_LABEL } from "../content";
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SkyView, particleLevel, grainLevel, type CameraFacing } from "./SkyView";
import { SmokeLayer, smokeRegime } from "./SmokeLayer";
import { NightLayer } from "./NightLayer";
import { GoldenLayer } from "./GoldenLayer";
import { warnOnce } from "../utils/time";
import { skyParamsFor, starOpacity, nightBlend, goldenBlend, veilDensity } from "./skyParams";
import { sunAnglesAt, sunPositionVector } from "./solar";
import { useListenSession, DEV } from "./useListenSession";
import { Glass } from "../components/Glass";
import { PlayButton, VolumeSlider } from "../components/Transport";
import { BoroughToggle } from "../components/BoroughToggle";
import { AQINumber } from "../components/AQINumber";
import { MoodLine } from "../components/MoodLine";
import { Graph, TRACK_ORDER, type TrackKey } from "../components/Graph";
import { DayNav, PinStrip, DayPicker } from "../components/DayNav";
import { SourceLine } from "../components/SourceLine";
import { PHASE0_DAYS } from "../fixtures/phase0-days";
import { ThemeContext, GLASS, HOSEK_ALBEDO, CAMERA_FACING, NYC_LAT, NYC_LON, SKY_GRADE, motion, space, GOLDEN } from "../utils/theme";

// The camera faces south (D-22, CAMERA_FACING) and the sun disc is on; its size is the token, under benchmark in the harness. Dev URL params can override both for comparison.
const qs = new URLSearchParams(window.location.search);
const DISC = qs.get("disc") !== "0";
const FACING = (qs.get("facing") ?? CAMERA_FACING) as CameraFacing;

// Eases a number toward its target over `tauMs` (exponential; ~63% of the way per tau), so per-beat steps in the data become continuous motion in the sky. Runs only while the value is off target.
function useEased(target: number, tauMs: number, name = "eased input"): number {
  const [value, setValue] = useState(Number.isFinite(target) ? target : 0);
  const valueRef = useRef(Number.isFinite(target) ? target : 0);
  useEffect(() => {
    if (!Number.isFinite(target)) { warnOnce(name); return; } // a NaN would ease to NaN for good; hold instead and say so once
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

const DISSOLVE_BEATS = 1.5; // the dissolve's length on a change of day while playing (D-32): the same span as the glide at rest

// Phones (state C, ≤575) get one day control instead of three pills: the width that makes state C is the width that makes a dropdown the better control.
function usePhone(): boolean {
  const [phone, setPhone] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 575px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 575px)");
    const on = () => setPhone(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return phone;
}

export default function ScenePage() {
  const s = useListenSession();
  const phone = usePhone();
  const { day, beat, playing, paused, channels, skyChannels, rest } = s;
  const hour = s.playheadHour; // the one transport position: the graph's playhead reads it as an index
  const clock = s.playheadClock; // the same position as time of day: the sun and the stars read it

  const [tab, setTab] = useState<TrackKey>(tabFromUrl);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    p.set("tab", tab);
    window.history.replaceState(null, "", `?${p}`);
  }, [tab]);


  // Every input that steps with the data is eased in the space where it is USED, so in and out take the same curve: the particulate LEVELS (0..1), not the raw µg/m³ — eased in µg/m³ the field appeared at once on the way up (the value rushed through the 35–150 band) and receded slowly on the way down (it lingered there on the exponential tail). The sky's own channels ease too, so the dome, the plume and the type move together instead of the dome cutting while the plume fades. Time constant: half a beat (~330 ms), settled within about a second.
  const tau = motion.beatMs * 0.5;
  const pm25Target = beat ? (beat.pm25 ?? 0) : (rest?.reading.pm25 ?? 0);
  const lens = useEased(particleLevel(pm25Target), tau, "lens level");
  const grain = useEased(grainLevel(pm25Target), tau, "grain level");
  const regime = useEased(smokeRegime(pm25Target), tau, "smoke regime");
  const smokeEased = useEased(beat?.pm25nSmoothed ?? skyChannels.pm25 ?? 0, tau, "smoke density");
  // The sky reads the held channels (a null hour keeps its last reported value; useListenSession), never the raw ones.
  const pm25nEased = useEased(skyChannels.pm25 ?? 0, tau, "pm25n");
  const o3nEased = useEased(skyChannels.o3 ?? 0, tau, "o3n");


  const view = useMemo(() => {
    // During a change of day the sun is the transition's interpolated position (D-31); otherwise the loaded day's date and the clock place it.
    const sun = s.sunDay ?? { date: "2023-07-12", tz: -4 };
    const ang = s.sunOverride ?? sunAnglesAt(sun.date, clock, NYC_LAT, NYC_LON, sun.tz);
    // MAPPING (PM2.5 → aerosol path, O3 → rayleigh + bloom, clock → exposure + fade): skyParamsFor is the one mapping, shared with the harness.
    const params = skyParamsFor(pm25nEased, o3nEased, ang.elevationDeg);
    // MAPPING (PM2.5 → plume density): the engine's own smoothed value while playing (§5.2: the scene never re-derives the smoothing); the rest hour's normalized value otherwise (the paused or seeked hour of the loaded day, else its latest).
    const smoke = smokeEased;
    // MAPPING (smoke regime → sky saturation): the blue is absorbed under smoke, so the grade goes negative as the regime rises.
    // MAPPING (sun elevation → saturation grade): the grade rises through golden hour (GOLDEN.saturationBoost at the peak) so the sky itself saturates on the way into dusk and dawn, not only the layer over it.
    // MAPPING (PM2.5 → golden hour's visibility): the grade is scaled by the same (1 − veil)² the stars use, so a hazy or smoky day has a dim golden hour rather than a super bright one; the colour of a hazy dusk comes from the smoke layer instead.
    const golden = goldenBlend(ang.elevationDeg) * Math.pow(1 - veilDensity(pm25nEased), 2);
    const saturation = SKY_GRADE.saturation + (SKY_GRADE.saturationUnderSmoke - SKY_GRADE.saturation) * regime + GOLDEN.saturationBoost * golden;
    // MAPPING (sun elevation, smoke → the glass): the material is a frost keyed to the sky (D-35). Its alpha runs from GLASS.fillAlphaNight to fillAlphaDay with the daylight, and the veil pulls it back toward night: white text needs the darkening only under a bright clear sky. Its tint runs from navy to umber with whichever is greater, the veil or the golden light, so the panel takes the sky's own warmth on an orange smoke day and at dusk. The white lift is the night's share.
    const veil = veilDensity(pm25nEased);
    const daylight = Math.max(0, Math.min(1, (ang.elevationDeg - GLASS.dayFromDeg) / (GLASS.dayFullDeg - GLASS.dayFromDeg))) * (1 - veil);
    const warm = Math.max(veil, golden);
    const mix = (a: string, b: string) => a.split(",").map((x, i) => Math.round(Number(x) + (Number(b.split(",")[i]) - Number(x)) * warm)).join(", ");
    const glass = { alpha: GLASS.fillAlphaNight + (GLASS.fillAlphaDay - GLASS.fillAlphaNight) * daylight, fill: mix(GLASS.fill, GLASS.fillWarm), lift: GLASS.liftNight * (1 - daylight) };
    return { params, sun: sunPositionVector(ang), stars: starOpacity(ang.elevationDeg, pm25nEased), smoke, regime, saturation, night: nightBlend(ang.elevationDeg), golden, glass };
  }, [s.sunDay, s.sunOverride, clock, pm25nEased, o3nEased, smokeEased, regime]);
  const goldenEased = useEased(view.golden, tau, "golden hour");
  // The last line of defence before the renderer: every number handed to the sky is checked; a non-finite one is named in the console once and the last good value stands in. Whatever produces the washed-out sky, it will be named here or in the sky's own watchdog.
  const lastGood = useRef<{ params: typeof view.params; sun: typeof view.sun; stars: number; saturation: number; lens: number; grain: number; clock: number } | null>(null);
  const safe = useMemo(() => {
    const finite = (v: number) => Number.isFinite(v);
    const ok = Object.values(view.params).every(finite) && view.sun.every(finite) && [view.stars, view.saturation, lens, grain, clock].every(finite);
    if (ok) { lastGood.current = { params: view.params, sun: view.sun, stars: view.stars, saturation: view.saturation, lens, grain, clock }; return lastGood.current; }
    warnOnce(`sky inputs ${JSON.stringify({ params: view.params, sun: view.sun, stars: view.stars, saturation: view.saturation, lens, grain, clock })}`);
    return lastGood.current ?? { params: view.params, sun: view.sun, stars: view.stars, saturation: view.saturation, lens, grain, clock };
  }, [view, lens, grain, clock]);
  const nightEased = useEased(view.night, tau, "night blend"); // eased so a cut between days never pops the blue above the dissolve

  // The dissolve: when the session reports a change of day made while playing, copy the WebGL sky's last frame into the overlay before the new day renders, then fade it out over DISSOLVE_BEATS.
  const skyBoxRef = useRef<HTMLDivElement>(null);
  const dissolveCanvasRef = useRef<HTMLCanvasElement>(null);
  const dissolveSeen = useRef(0);
  useLayoutEffect(() => {
    if (s.dissolve === dissolveSeen.current) return;
    dissolveSeen.current = s.dissolve;
    const gl = skyBoxRef.current?.querySelector("canvas:not([aria-hidden])") as HTMLCanvasElement | null;
    const overlay = dissolveCanvasRef.current;
    if (!gl || !overlay) return;
    overlay.width = gl.width; overlay.height = gl.height;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(gl, 0, 0);
    const start = performance.now(), ms = motion.beatMs * DISSOLVE_BEATS;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      overlay.style.opacity = String(1 - t);
      if (t < 1) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, overlay.width, overlay.height);
    };
    overlay.style.opacity = "1";
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [s.dissolve]);

  // Glass parameters as custom properties at the root (§5.6: theme.ts is the source of truth; index.css reads these). The fill, its alpha and the lift follow the sky (D-35) and change with the clock; the rest are constants.
  const glassVars = {
    "--glass-blur": GLASS.blur, "--glass-saturate": GLASS.saturate, "--glass-fill-alpha": view.glass.alpha.toFixed(3), "--glass-fill": view.glass.fill, "--glass-lift": view.glass.lift.toFixed(3),
    "--glass-edge-alpha": String(GLASS.edgeAlpha), "--glass-fill-alpha-opaque": String(GLASS.fillAlphaOpaque), "--glass-blur-opaque": GLASS.blurOpaque,
    "--frosted-blur": GLASS.frostedBlur, "--frosted-fill-alpha": (view.glass.alpha + GLASS.frostedExtraAlpha).toFixed(3),
  } as React.CSSProperties;

  return (
    <ThemeContext.Provider value="dark">
      <div style={{ position: "fixed", inset: 0, background: "#05050a", ...glassVars }}>
        {/* The scene: renders continuously while playing, on demand at rest. On tablets and up a click anywhere on the sky toggles play: the largest target on the page, and the audio gesture is the click itself. Not on phones — there a thumb resting on the sky, a scroll that lands, or a mis-tap would start or stop the music, and the transport button is within reach. Panels sit above and take their own clicks. Space does the same from the keyboard (hook), so the box is not in the tab order. */}
        <div ref={skyBoxRef} style={{ position: "absolute", inset: 0, cursor: phone ? "default" : "pointer" }} onClick={phone ? undefined : s.togglePlay} role={phone ? undefined : "button"} aria-label={phone ? undefined : SKY_TOGGLE_LABEL} tabIndex={-1}>
          <SkyView params={safe.params} sunPosition={safe.sun} starOpacity={safe.stars} albedo={HOSEK_ALBEDO} disc={DISC} facing={FACING} hour={safe.clock} saturation={safe.saturation} particles={safe.lens} grain={safe.grain} live={playing} style={{ width: "100%", height: "100%" }} />
          {/* The dissolve (D-32): on a change of day while playing, the last rendered sky is copied here and faded out over the new one. Sits above the WebGL sky and below the DOM layers, which ease on their own. */}
          <canvas ref={dissolveCanvasRef} aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0 }} />
          <NightLayer blend={nightEased} density={view.smoke} />
          <GoldenLayer blend={goldenEased} density={view.smoke} />
          <SmokeLayer density={view.smoke} regime={view.regime} />
        </div>

        {/* The scaffold (D-26): see .scene-ui in index.css. */}
        <div className="scene-ui">
          <div className="scene-top">
            <Glass material="glass" className="scene-pill scene-borough">
              <BoroughToggle selected={s.borough} onSelect={s.setBorough} />
            </Glass>
            {/* The day group: picker and presets together, since both choose the day. Right-aligned as a unit on laptop; dissolves into the centred row below that. */}
            <div className="scene-day">
              {phone ? (
                <Glass material="glass" className="scene-pill scene-chips">
                  <DayPicker date={s.date} onChange={s.setDate} loading={s.dayLoading} latestDate={s.latestDate} />
                </Glass>
              ) : (
                <>
                  <Glass material="glass" className="scene-pill scene-chips">
                    <DayNav date={s.date} onChange={s.setDate} loading={s.dayLoading} latestDate={s.latestDate} />
                  </Glass>
                  <Glass material="glass" className="scene-pill scene-chips scene-pins">
                    <PinStrip date={s.date} onChange={s.setDate} />
                  </Glass>
                </>
              )}
            </div>
          </div>

          <div className="scene-mid">
            <Glass material="frosted" className="scene-panel scene-hero">
              <AQINumber value={s.displayAqi} />
              <div style={{ marginTop: space.md }}>
                <MoodLine tierIndex={s.moodTier} hour={s.moodHour} dominant={s.dominant} aqi={s.moodAqi} />
              </div>
            </Glass>
            {day && day.length > 0 && (
              <Glass material="frosted" className="scene-panel scene-graph">
                <Graph
                  day={day}
                  anchors={s.anchors}
                  playheadHour={playing || paused ? hour : null}
                  running={playing}
                  live={s.live}
                  tab={tab}
                  onTab={setTab}
                  onSeek={s.seek}
                />
              </Glass>
            )}
          </div>

          <div className="scene-bottom">
            <div className="scene-transport">
              <Glass material="glass" className="scene-pill scene-icon-pill">
                <PlayButton playing={playing} onToggle={s.togglePlay} />
              </Glass>
              <Glass material="glass" className="scene-pill">
                <VolumeSlider onVolume={s.setVolume} />
              </Glass>
            </div>
            {day && day.length > 0 && (
              <Glass material="frosted" className="scene-source">
                <SourceLine borough={s.borough} hours={day} fallback={s.snapshot?.fallback ?? null} />
              </Glass>
            )}
          </div>

          {DEV && (
            <select className="scene-dev" value={s.devDayKey} onChange={(e) => s.setDevDayKey(e.target.value)}>
              <option value="live">Live: NYC (last 24 h)</option>
              {PHASE0_DAYS.map((d) => (
                <option key={d.key} value={d.key}>{d.label} (fixture)</option>
              ))}
            </select>
          )}
        </div>
      </div>
    </ThemeContext.Provider>
  );
}
