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
import { predictPanel, rampLiftFor, type RGB } from "./panelLuminance";
import { sunAnglesAt, sunPositionVector } from "./solar";
import { useListenSession, DEV } from "./useListenSession";
import { Glass } from "../components/Glass";
import { Cursor } from "../components/Cursor";
import { usePopoverOpen, consumeSuppressedClick } from "../components/popoverStore";
import { PlayButton, VolumeSlider } from "../components/Transport";
import { BoroughToggle } from "../components/BoroughToggle";
import { AQINumber } from "../components/AQINumber";
import { MoodLine } from "../components/MoodLine";
import { Graph, TRACK_ORDER, type TrackKey } from "../components/Graph";
import { DayNav, PinStrip, DayPicker } from "../components/DayNav";
import { SourceLine } from "../components/SourceLine";
import { PHASE0_DAYS } from "../fixtures/phase0-days";
import { ThemeContext, GLASS, HOSEK_ALBEDO, CAMERA_FACING, NYC_LAT, NYC_LON, SKY_GRADE, motion, space, GOLDEN, CONTROL } from "../utils/theme";

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
    // MAPPING (sun elevation, smoke → the glass): the material is a frost keyed to the sky (D-35). Its alpha runs from GLASS.fillAlphaNight to fillAlphaDay with the daylight, and the veil pulls it back toward night: white text needs the darkening only under a bright clear sky. Its tint runs from navy to umber with whichever is greater, the smoke share or the golden light, so the panel takes the sky's own cast under haze and smoke and at dusk, and stays navy under a blue sky. The white lift is the night's share.
    const veil = veilDensity(pm25nEased);
    const smokeShare = Math.max(0, Math.min(1, (veil - GLASS.veilFrom) / (GLASS.veilFull - GLASS.veilFrom))); // the veil thins the frost only once it dims the sky
    const daylight = Math.max(0, Math.min(1, (ang.elevationDeg - GLASS.dayFromDeg) / (GLASS.dayFullDeg - GLASS.dayFromDeg))) * (1 - smokeShare);
    const warm = Math.max(smokeShare, golden); // the tint keys on the same share as the alpha: a moderate haze leaves the panel navy, a grey or orange sky turns it umber
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

  // The ramp lift (D-36): the sky canvas is sampled behind each frosted panel four times a second (a 4×4 average of the region plus the frost's blur radius, since the blur reaches that far), the DOM layers and the glass are applied to the sample by panelLuminance.ts, and the predicted panel's luminance sets how far the AQI ramp on that panel is lifted toward its light end. Each panel gets its own: the graph sits lower in the frame than the hero and measured up to a third brighter. Eased like every other sky input so the colours glide.
  const heroRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<HTMLDivElement>(null);
  type Sample = { rgb: RGB; t: number };
  const [skySamples, setSkySamples] = useState<{ hero: Sample; graph: Sample }>({ hero: { rgb: [40, 60, 90], t: 0.6 }, graph: { rgb: [40, 60, 90], t: 0.6 } });
  useEffect(() => {
    const tiny = document.createElement("canvas"); tiny.width = 4; tiny.height = 4;
    const tctx = tiny.getContext("2d", { willReadFrequently: true });
    const sampleBehind = (gl: HTMLCanvasElement, el: HTMLElement | null, cr: DOMRect): Sample | null => {
      if (!el || !tctx) return null;
      const hr = el.getBoundingClientRect();
      const sx = gl.width / cr.width, sy = gl.height / cr.height, pad = parseFloat(GLASS.frostedBlur);
      const x = Math.max(0, (hr.left - cr.left - pad) * sx), y = Math.max(0, (hr.top - cr.top - pad) * sy);
      const w = Math.min(gl.width - x, (hr.width + 2 * pad) * sx), h = Math.min(gl.height - y, (hr.height + 2 * pad) * sy);
      if (w <= 0 || h <= 0) return null;
      tctx.drawImage(gl, x, y, w, h, 0, 0, 4, 4);
      const d = tctx.getImageData(0, 0, 4, 4).data;
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
      const n = d.length / 4;
      return { rgb: [r / n, g / n, b / n], t: (hr.top + hr.height / 2 - cr.top) / cr.height };
    };
    const changed = (a: Sample, b: Sample) => Math.abs(a.rgb[0] - b.rgb[0]) + Math.abs(a.rgb[1] - b.rgb[1]) + Math.abs(a.rgb[2] - b.rgb[2]) > 3 || Math.abs(a.t - b.t) > 0.01;
    const tick = () => {
      const gl = skyBoxRef.current?.querySelector("canvas:not([aria-hidden])") as HTMLCanvasElement | null;
      if (!gl || gl.width === 0) return;
      const cr = gl.getBoundingClientRect();
      if (cr.width === 0 || cr.height === 0) return;
      const hero = sampleBehind(gl, heroRef.current, cr), graph = sampleBehind(gl, graphRef.current, cr);
      setSkySamples((prev) => {
        const h = hero ?? prev.hero, g = graph ?? prev.graph;
        return changed(h, prev.hero) || changed(g, prev.graph) ? { hero: h, graph: g } : prev;
      });
    };
    const id = setInterval(tick, 250);
    tick();
    return () => clearInterval(id);
  }, []);
  const predict = (sm: Sample) => predictPanel({ sky: sm.rgb, t: sm.t, smoke: { density: view.smoke, regime: view.regime }, night: nightEased, golden: goldenEased, glass: { alpha: view.glass.alpha + GLASS.frostedExtraAlpha, fill: view.glass.fill, lift: view.glass.lift } });
  const panels = useMemo(() => ({ hero: predict(skySamples.hero), graph: predict(skySamples.graph) }), [skySamples, view.smoke, view.regime, view.glass, nightEased, goldenEased]); // eslint-disable-line react-hooks/exhaustive-deps
  const heroLift = useEased(rampLiftFor(panels.hero.luminance), tau, "hero ramp lift");
  const graphLift = useEased(rampLiftFor(panels.graph.luminance), tau, "graph ramp lift");
  (window as unknown as Record<string, unknown>).__panel = { samples: skySamples, predicted: panels, lifts: { hero: heroLift, graph: graphLift } }; // a handle for measurement, like the sky's __sky

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

  const popoverOpen = usePopoverOpen();
  // Glass parameters as custom properties at the root (§5.6: theme.ts is the source of truth; index.css reads these). The fill, its alpha and the lift follow the sky (D-35) and change with the clock; the rest are constants.
  const glassVars = {
    "--glass-blur": GLASS.blur, "--glass-saturate": GLASS.saturate, "--glass-fill-alpha": view.glass.alpha.toFixed(3), "--glass-fill": view.glass.fill, "--glass-lift": view.glass.lift.toFixed(3),
    "--glass-edge-alpha": String(GLASS.edgeAlpha), "--glass-fill-alpha-opaque": String(GLASS.fillAlphaOpaque), "--glass-blur-opaque": GLASS.blurOpaque,
    "--frosted-blur": GLASS.frostedBlur, "--frosted-fill-alpha": (view.glass.alpha + GLASS.frostedExtraAlpha).toFixed(3),
  } as React.CSSProperties;

  return (
    <ThemeContext.Provider value="dark">
      <div className="scene-root" style={{ position: "fixed", inset: 0, background: "#05050a", ...glassVars, "--chip-hover": String(CONTROL.hoverAlpha), "--chip-hover-active": String(CONTROL.hoverActiveAlpha), "--chip-press": String(CONTROL.pressAlpha), "--state-ms": `${CONTROL.stateMs}ms` } as React.CSSProperties}>
        {/* The scene: renders continuously while playing, on demand at rest. On tablets and up a click anywhere on the sky toggles play: the largest target on the page, and the audio gesture is the click itself. Not on phones — there a thumb resting on the sky, a scroll that lands, or a mis-tap would start or stop the music, and the transport button is within reach. Panels sit above and take their own clicks. Space does the same from the keyboard (hook), so the box is not in the tab order. */}
        <Cursor />
        {/* The cursor over the sky is the transport's affordance: the play glyph while paused, pause while playing (Cursor.tsx reads data-cursor). While a popover is open the sky shows the ring and the press that dismisses the popover is not a play/pause (popoverStore). */}
        <div ref={skyBoxRef} className="scene-sky" data-cursor={phone ? undefined : popoverOpen ? "ring" : playing ? "pause" : "play"} style={{ position: "absolute", inset: 0 }} onClick={phone ? undefined : () => { if (consumeSuppressedClick()) return; s.togglePlay(); }} role={phone ? undefined : "button"} aria-label={phone ? undefined : SKY_TOGGLE_LABEL} tabIndex={-1}>
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
            <Glass ref={heroRef} material="frosted" className="scene-panel scene-hero">
              <AQINumber value={s.displayAqi} />
              <div style={{ marginTop: space.md }}>
                <MoodLine tierIndex={s.moodTier} hour={s.moodHour} dominant={s.dominant} aqi={s.moodAqi} lift={heroLift} />
              </div>
            </Glass>
            {day && day.length > 0 && (
              <Glass ref={graphRef} material="frosted" className="scene-panel scene-graph">
                <Graph
                  day={day}
                  anchors={s.anchors}
                  playheadHour={playing || paused ? hour : null}
                  running={playing}
                  lift={graphLift}
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
