// ScenePage — /scene, the Listen page as the scene (D-19, §5). The sky is a pure function of two things the engine already emits every beat: the hour under the playhead and the smoothed normalized PM2.5. Sun elevation comes from the hour; the model cross-fade, exposure, stars and the plume all follow from those two numbers. Nothing here re-derives a mapping the harness did not judge.
// Shares useListenSession with the typographic page, so both play the same data through the same engine; this page replaces that one once it passes review.
import { SKY_TOGGLE_LABEL } from "../content";
import { useEased } from "./useEased";
import { frostBusy } from "./frost";
import { Monitor } from "../components/Monitor";
import { PageIndicator, VIEWS, type View } from "../components/PageIndicator";
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
import { AQICard, BreathCard } from "../components/HeroCards";
import { Graph, TRACK_ORDER, type TrackKey } from "../components/Graph";
import { DayNav, PinStrip, DayPicker } from "../components/DayNav";
import { SourceLine } from "../components/SourceLine";
import { Credit } from "../components/Credit";
import { PHASE0_DAYS } from "../fixtures/phase0-days";
import { ThemeContext, GLASS, HOSEK_ALBEDO, CAMERA_FACING, NYC_LAT, NYC_LON, SKY_GRADE, motion, GOLDEN, CONTROL } from "../utils/theme";

// The camera faces south (D-22, CAMERA_FACING) and the sun disc is on; its size is the token, under benchmark in the harness. Dev URL params can override both for comparison.
const qs = new URLSearchParams(window.location.search);
const DISC = qs.get("disc") !== "0";
// Dev bisect for Chrome's raster bands (2026-09-16): ?fx=nosmoke,nonight,nodither,noblur,nocursor leaves those layers out, one reload each, so the layer behind the artefact can be named on the machine that shows it.
const FX_OFF = new Set((qs.get("fx") ?? "").split(",").map((s) => s.trim()).filter(Boolean));
const FACING = (qs.get("facing") ?? CAMERA_FACING) as CameraFacing;

// The graph's active tab and the page live in the URL so a view can be sent: ?tab=o3, ?view=monitor (absent = the scene).
function tabFromUrl(): TrackKey {
  const t = qs.get("tab") as TrackKey | null;
  return t && TRACK_ORDER.includes(t) ? t : "aqi";
}
function viewFromUrl(): View {
  const v = qs.get("view") as View | null;
  return v && VIEWS.includes(v) ? v : "scene";
}
const PAGE_MS = motion.beatMs * motion.pageBeats; // the slide between pages (D-43)
const FADE_MS = PAGE_MS * 0.3; // the outgoing page is gone within the first three tenths of the travel (a fifth read as a cut, Shoro 2026-09-16), still before its panels can reach the frame's edge; the incoming one appears only in the last three tenths, once it is wholly inside
const SWIPE_LOCK_PX = 8; // movement before a drag commits to an axis
const SWIPE_PX = 48; // a travel along the pages' axis that counts as a swipe (D-45)
const WHEEL_PX = 120; // a wheel travel that counts as a page turn above the phone width
const REDUCED_MOTION = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

declare module "react" { interface HTMLAttributes<T> { inert?: "" } } // React 18's typings lack the attribute; "" sets it, undefined removes it

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

// Laptop (≥1024): the hero and graph share a row and the pages stack vertically with the page pill beside the section. Below that the panels are full width, so the pages sit side by side like the phone's and the pill joins the transport row (Shoro, 2026-09-16).
function useLaptop(): boolean {
  const [laptop, setLaptop] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setLaptop(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return laptop;
}

export default function ScenePage() {
  const s = useListenSession();
  const phone = usePhone();
  const laptop = useLaptop();
  const { day, beat, playing, paused, channels, skyChannels, rest } = s;
  const hour = s.playheadHour; // the one transport position: the graph's playhead reads it as an index
  const clock = s.playheadClock; // the same position as time of day: the sun and the stars read it

  const [tab, setTab] = useState<TrackKey>(tabFromUrl);
  // The page (D-43): the scene or the monitor. Both pages are always mounted in a frame that never changes size (the band fills the height the bars leave); a switch translates them, the outgoing page fading as it leaves and the incoming one fading as it arrives (index.css, PAGE_MS). Above the phone width the pages stack vertically, the monitor below the scene, and the wheel, the up and down arrows or the side icons move between them; on phones they sit side by side and a swipe, the left and right arrows or the icons do.
  const [page, setPage] = useState<View>(viewFromUrl);
  const lockRef = useRef(0); // the time until which a switch is refused: one slide at a time, and the wheel's inertia is not a second gesture
  const wheelRef = useRef({ acc: 0, at: 0 }); // the wheel's travel within one gesture (a ref: the listener is re-bound each render and must not forget)
  const switchView = (next: View) => {
    if (next === page || performance.now() < lockRef.current) return;
    lockRef.current = performance.now() + PAGE_MS;
    frostBusy(PAGE_MS + 400); // the panels move and dissolve for the whole switch: the sky reads their rectangles every frame until it has settled (frost.ts)
    setPage(next);
  };
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    p.set("tab", tab);
    if (page === "scene") p.delete("view"); else p.set("view", page);
    window.history.replaceState(null, "", `?${p}`);
  }, [tab, page]);
  const vertical = laptop;
  // A resize, and above all a change of breakpoint between the vertical and horizontal stacks, must not be animated: the pages' transitions would carry them from their old axis positions to the new and paint a slide that means nothing (Shoro, 2026-09-16). While a resize is in progress the band suppresses every page transition, and a drag's leftover inline transform is cleared.
  const [resizing, setResizing] = useState(false);
  useEffect(() => {
    let t = 0;
    const onResize = () => { setResizing(true); frostBusy(600); if (trackRef.current) trackRef.current.style.transform = ""; window.clearTimeout(t); t = window.setTimeout(() => setResizing(false), 200); };
    window.addEventListener("resize", onResize);
    document.fonts?.ready.then(() => frostBusy(600)); // the fonts arriving re-flow the bars, which moves the band and every panel in it
    frostBusy(1500); // the first layout settles over the first frames: the hero cards measure their widths, the graph its gutter
    return () => { window.removeEventListener("resize", onResize); window.clearTimeout(t); };
  }, []);
  // The arrows along the pages' axis switch pages (only Space and Escape were bound); not while a control that uses them (the volume slider) has focus. Above the phone width the wheel does too: a scroll of more than WHEEL_PX in one direction, then nothing more until the slide is over, so a trackpad's inertia does not carry the page back.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement) return;
      const fwd = vertical ? "ArrowDown" : "ArrowRight", back = vertical ? "ArrowUp" : "ArrowLeft";
      if (e.key === fwd) switchView("monitor");
      if (e.key === back) switchView("scene");
    };
    // The wheel along the pages' axis: vertical travel on laptop, horizontal travel where the pages sit side by side (Shoro, 2026-09-16: a narrow laptop window is the horizontal layout too, and a trackpad's two-finger swipe sideways should turn the page there, not only a drag). A page's own horizontal scroll strips (the pins, the graph's tabs) get the gesture first: a wheel over one that can still scroll is theirs.
    const onWheel = (e: WheelEvent) => {
      const w = wheelRef.current, now = performance.now();
      if (now - w.at > 400) w.acc = 0; // a fresh gesture
      w.at = now;
      if (now < lockRef.current) { w.acc = 0; return; } // inertia from the gesture that switched
      if (!vertical) {
        const strip = (e.target as Element | null)?.closest?.(".scene-strip, [role=\"tablist\"]");
        if (strip && strip.scrollWidth > strip.clientWidth) return;
      }
      w.acc += vertical ? e.deltaY : e.deltaX;
      if (Math.abs(w.acc) >= WHEEL_PX) { switchView(w.acc > 0 ? "monitor" : "scene"); w.acc = 0; }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("wheel", onWheel); };
  });
  // The page drag (D-45, 2026-09-16, Shoro): a press anywhere but a control (the sky, the band's empty space, any card; never the plot, a chip, a button, the slider or a link, so a drag never contends with a gesture of its own) dragged along the pages' axis switches pages on release past SWIPE_PX. Below laptop the axis is horizontal and the track follows the pointer as it does the finger (translated directly, no React state per move; on release the nearer page wins, or the one the pointer was heading for). On laptop the axis is vertical, the pages stay put, and the cursor says what release will do: Lucide's move-up or move-down (move-left or move-right below laptop) once the drag has gone SWIPE_PX in a direction that has a page, nothing in one that does not (body data-drag, read by Cursor.tsx). A touch keeps its implicit capture, which a chip's tap relies on. A mouse or pen is captured once the drag is allowed, so leaving the surface mid-drag does not lose it. A drag that commits to the other axis does nothing, and no drag is ever the sky's click (swipedAt).
  const trackRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ id: number; x: number; y: number; axis: "x" | "y" | null; base: number } | null>(null);
  const swipedAt = useRef(0); // a drag must not also be a tap: the click it leaves behind is swallowed (the sky's play/pause, a chip a swipe began on)
  const dragGlyph = (d: number): string | null => {
    if (Math.abs(d) < SWIPE_PX) return null;
    const fwd = d < 0; // the content follows the pointer: pulling up or left reaches the monitor below or to the right of the scene
    if (fwd ? page === "monitor" : page === "scene") return null; // nothing past the last or before the first page
    return vertical ? (fwd ? "move-up" : "move-down") : (fwd ? "move-left" : "move-right");
  };
  const setDragGlyph = (g: string | null) => { if (g) document.body.dataset.drag = g; else delete document.body.dataset.drag; };
  const onDragDown = (e: React.PointerEvent) => {
    const t = e.target as HTMLElement, touch = e.pointerType === "touch";
    if (t.closest(".scene-graph canvas, input, select, a, button")) return; // only what takes its own gesture refuses a drag (Shoro, 2026-09-16): the plot's canvas (the seek; the sky's canvases are the sky), the slider, links, chips and buttons. Every card and the sky are swipeable, whatever the pointer; excluding whole panels left too little to grab, above all on a phone
    if (!touch) e.currentTarget.setPointerCapture(e.pointerId);
    const track = trackRef.current;
    const base = track && !vertical ? new DOMMatrix(getComputedStyle(track).transform).m41 : 0; // where the track rests now (0, or one page and a gap to the left), read rather than recomputed
    swipe.current = { id: e.pointerId, x: e.clientX, y: e.clientY, axis: null, base };
  };
  const onDragMove = (e: React.PointerEvent) => {
    const s = swipe.current, track = trackRef.current;
    if (!s || s.id !== e.pointerId || !track) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (!s.axis && (Math.abs(dx) >= SWIPE_LOCK_PX || Math.abs(dy) >= SWIPE_LOCK_PX)) s.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    if (s.axis !== (vertical ? "y" : "x")) return;
    setDragGlyph(dragGlyph(vertical ? dy : dx));
    if (vertical) return;
    const bounded = page === "scene" ? Math.min(0, dx) : Math.max(0, dx); // no pull past the first or last page
    track.dataset.dragging = "true";
    frostBusy(300); // the pages follow the finger: their blur must too
    track.style.transform = `translateX(${s.base + bounded}px)`;
  };
  const onDragUp = (e: React.PointerEvent) => {
    const s = swipe.current, track = trackRef.current;
    swipe.current = null;
    setDragGlyph(null);
    if (!s || s.id !== e.pointerId || !track) return;
    if (s.axis) swipedAt.current = performance.now();
    if (s.axis === (vertical ? "y" : "x")) {
      const d = vertical ? e.clientY - s.y : e.clientX - s.x;
      const next: View = page === "scene" ? (d <= -SWIPE_PX ? "monitor" : "scene") : (d >= SWIPE_PX ? "scene" : "monitor");
      lockRef.current = 0; // the pointer's own release is never refused
      if (next !== page) switchView(next);
    }
    // Hand the track back to the stylesheet: from the dragged position the transition runs to the page's own.
    if (!vertical) { frostBusy(PAGE_MS + 400); requestAnimationFrame(() => { delete track.dataset.dragging; track.style.transform = ""; }); }
  };
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
  // The sampled panels: the hero and the graph on the scene page, the two monitor cards that colour a step (D-43). A panel that is not on screen keeps its last sample.
  type PanelKey = "hero" | "aqi" | "graph" | "scale" | "tone";
  const panelRefs = useRef<Record<PanelKey, HTMLDivElement | null>>({ hero: null, aqi: null, graph: null, scale: null, tone: null });
  const setPanelRef = (key: PanelKey) => (el: HTMLDivElement | null) => { panelRefs.current[key] = el; };
  type Sample = { rgb: RGB; t: number };
  const initialSample: Sample = { rgb: [40, 60, 90], t: 0.6 };
  const [skySamples, setSkySamples] = useState<Record<PanelKey, Sample>>({ hero: initialSample, aqi: initialSample, graph: initialSample, scale: initialSample, tone: initialSample });
  useEffect(() => {
    const tiny = document.createElement("canvas"); tiny.width = 4; tiny.height = 4;
    const tctx = tiny.getContext("2d", { willReadFrequently: true });
    const sampleBehind = (gl: HTMLCanvasElement, el: HTMLElement | null, cr: DOMRect): Sample | null => {
      if (!el || !tctx) return null;
      const hr = el.getBoundingClientRect();
      if (hr.bottom <= cr.top || hr.top >= cr.bottom || hr.right <= cr.left || hr.left >= cr.right) return null; // the panel is on the page that is off screen (D-43): it keeps its last sample; sampling the sky's edge for it eased its ramp toward nothing and, on the graph, redrew the plot every frame while nobody could see it (2026-09-16)
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
      if (performance.now() < lockRef.current) return; // a page switch in flight (D-43): the panels are passing over sky they will not rest on, and a sample there would ease the ramps toward a colour that is gone by the time they arrive; the first tick after the slide samples where they settled (2026-09-16)
      const gl = skyBoxRef.current?.querySelector("canvas:not([aria-hidden])") as HTMLCanvasElement | null;
      if (!gl || gl.width === 0) return;
      const cr = gl.getBoundingClientRect();
      if (cr.width === 0 || cr.height === 0) return;
      setSkySamples((prev) => {
        let any = false;
        const next = { ...prev };
        for (const key of Object.keys(prev) as PanelKey[]) {
          const s = sampleBehind(gl, panelRefs.current[key], cr);
          if (s && changed(s, prev[key])) { next[key] = s; any = true; }
        }
        return any ? next : prev;
      });
    };
    const id = setInterval(tick, 250);
    tick();
    return () => clearInterval(id);
  }, []);
  const predict = (sm: Sample) => predictPanel({ sky: sm.rgb, t: sm.t, smoke: { density: view.smoke, regime: view.regime }, night: nightEased, golden: goldenEased, glass: { alpha: view.glass.alpha + GLASS.frostedExtraAlpha, fill: view.glass.fill, lift: view.glass.lift } });
  const panels = useMemo(() => ({ hero: predict(skySamples.hero), aqi: predict(skySamples.aqi), graph: predict(skySamples.graph), scale: predict(skySamples.scale), tone: predict(skySamples.tone) }), [skySamples, view.smoke, view.regime, view.glass, nightEased, goldenEased]); // eslint-disable-line react-hooks/exhaustive-deps
  const heroLift = useEased(rampLiftFor(panels.hero.luminance), tau, "hero ramp lift");
  const aqiLift = useEased(rampLiftFor(panels.aqi.luminance), tau, "aqi card ramp lift");
  const graphLift = useEased(rampLiftFor(panels.graph.luminance), tau, "graph ramp lift");
  const scaleLift = useEased(rampLiftFor(panels.scale.luminance), tau, "scale card ramp lift");
  const toneLift = useEased(rampLiftFor(panels.tone.luminance), tau, "tone card ramp lift");
  (window as unknown as Record<string, unknown>).__panel = { samples: skySamples, predicted: panels, lifts: { hero: heroLift, aqi: aqiLift, graph: graphLift, scale: scaleLift, tone: toneLift }, page, hour, playing, beat }; // a handle for measurement, like the sky's __sky

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
    "--glass-blur": FX_OFF.has("noblur") ? "0px" : GLASS.blur, "--glass-saturate": GLASS.saturate, "--glass-fill-alpha": view.glass.alpha.toFixed(3), "--glass-fill": view.glass.fill, "--glass-lift": view.glass.lift.toFixed(3),
    "--glass-edge-alpha": String(GLASS.edgeAlpha), "--glass-fill-alpha-opaque": String(GLASS.fillAlphaOpaque), "--glass-blur-opaque": GLASS.blurOpaque,
    "--frosted-blur": FX_OFF.has("noblur") ? "0px" : GLASS.frostedBlur, "--frosted-fill-alpha": (view.glass.alpha + GLASS.frostedExtraAlpha).toFixed(3), "--glass-dither": String(GLASS.ditherAlpha), "--sky-dither": String(GLASS.skyDither),
  } as React.CSSProperties;

  return (
    <ThemeContext.Provider value="dark">
      <div className="scene-root" style={{ position: "fixed", inset: 0, background: "#05050a", ...glassVars, "--chip-hover": String(CONTROL.hoverAlpha), "--chip-hover-active": String(CONTROL.hoverActiveAlpha), "--state-ms": `${CONTROL.stateMs}ms` } as React.CSSProperties}>
        {/* The scene: renders continuously while playing, on demand at rest. On tablets and up a click anywhere on the sky toggles play: the largest target on the page, and the audio gesture is the click itself. Not on phones — there a thumb resting on the sky, a scroll that lands, or a mis-tap would start or stop the music, and the transport button is within reach. Panels sit above and take their own clicks. Space does the same from the keyboard (hook), so the box is not in the tab order. */}
        {!FX_OFF.has("nocursor") && <Cursor />}
        {/* The cursor over the sky is the transport's affordance: the play glyph while paused, pause while playing (Cursor.tsx reads data-cursor). While a popover is open the sky shows the ring and the press that dismisses the popover is not a play/pause (popoverStore). */}
        <div ref={skyBoxRef} className="scene-sky" data-cursor={phone ? undefined : popoverOpen ? "ring" : playing ? "pause" : "play"} style={{ position: "absolute", inset: 0 }} onPointerDown={onDragDown} onPointerMove={onDragMove} onPointerUp={onDragUp} onPointerCancel={onDragUp} onClick={phone ? undefined : () => { if (consumeSuppressedClick() || performance.now() - swipedAt.current < 400) return; s.togglePlay(); }} role={phone ? undefined : "button"} aria-label={phone ? undefined : SKY_TOGGLE_LABEL} tabIndex={-1}>
          <SkyView params={safe.params} sunPosition={safe.sun} starOpacity={safe.stars} albedo={HOSEK_ALBEDO} disc={DISC} facing={FACING} hour={safe.clock} saturation={safe.saturation} particles={safe.lens} grain={safe.grain} live={playing} frost={!FX_OFF.has("noblur")} style={{ width: "100%", height: "100%" }} />
          {/* The dissolve (D-32): on a change of day while playing, the last rendered sky is copied here and faded out over the new one. Sits above the WebGL sky and below the DOM layers, which ease on their own. */}
          <canvas ref={dissolveCanvasRef} aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0 }} />
          {!FX_OFF.has("nonight") && <NightLayer blend={nightEased} density={view.smoke} />}
          {!FX_OFF.has("nonight") && <GoldenLayer blend={goldenEased} density={view.smoke} />}
          {!FX_OFF.has("nosmoke") && <SmokeLayer density={view.smoke} regime={view.regime} />}
          {/* A fine noise over the gradient layers (index.css .scene-sky-dither): they band on their own, and the frost's blur bands them again. */}
          {!FX_OFF.has("nodither") && <div className="scene-sky-dither" aria-hidden />}
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

          {/* The middle band (D-43): a frame that never changes size, holding both pages; a switch translates them along the axis (vertical above the phone width, horizontal on phones) with a fade, over PAGE_MS. The frame reaches the panels' shadow room on every side (index.css --clip-pad, --clip-pad-y), and what keeps a page mid-switch off the bars' pills is the drift: on laptop the visible motion is one gap, the travel between the fades runs unseen (D-48, Shoro, 2026-09-16). */}
          <div className="scene-mid" data-page={page} data-axis={vertical ? "y" : "x"} data-fade={REDUCED_MOTION} data-resizing={resizing} style={{ "--page-ms": `${PAGE_MS}ms`, "--fade-ms": `${FADE_MS}ms` } as React.CSSProperties} onPointerDown={onDragDown} onPointerMove={onDragMove} onPointerUp={onDragUp} onPointerCancel={onDragUp} onClickCapture={(e) => { if (performance.now() - swipedAt.current < 400) { e.stopPropagation(); e.preventDefault(); } }}
            // Below laptop the band takes pointer events for the swipe, so it stands between the sky and a tap on the empty space around the panels; that tap is still the sky's play/pause (tablets), and the cursor there is the sky's.
            data-cursor={phone || laptop ? undefined : popoverOpen ? "ring" : playing ? "pause" : "play"}
            onClick={phone || laptop ? undefined : (e) => { if ((e.target as HTMLElement).closest(".glass")) return; if (consumeSuppressedClick()) return; s.togglePlay(); }}>
            <div ref={trackRef} className="scene-track">
              <div className="scene-page scene-page-scene" data-page="scene" aria-hidden={page !== "scene"} inert={page !== "scene" ? "" : undefined}>
                <div className="scene-page-inner">
                  {/* The hero as two widgets (2026-09-16): the number over its category bar under its day, the word over the ladder under "Breath"; both sampled for the ramp. */}
                  <div className="scene-hero-pair">
                    <AQICard value={s.displayAqi} date={s.date} lift={aqiLift} cardRef={setPanelRef("aqi")} />
                    <BreathCard tierIndex={s.moodTier} aqi={s.moodAqi} lift={heroLift} cardRef={setPanelRef("hero")} />
                  </div>
                  {day && day.length > 0 && (
                    <Glass ref={setPanelRef("graph")} material="frosted" className="scene-panel scene-graph">
                      <Graph
                        day={day}
                        aqi={s.aqiHours}
                        playheadHour={playing && page !== "scene" ? null : playing || paused ? hour : null} /* on the monitor page while playing the graph gets no playhead: the eased hour moves every frame, and a held playhead redraws once per change, so an unseen plot was redrawn sixty times a second (2026-09-16); the scene page brings it back the moment it is current */
                        running={playing && page === "scene"}
                        lift={graphLift}
                        live={s.live}
                        tab={tab}
                        onTab={setTab}
                        onSeek={s.seek}
                      />
                    </Glass>
                  )}
                </div>
              </div>
              <div className="scene-page scene-page-monitor" data-page="monitor" aria-hidden={page !== "monitor"} inert={page !== "monitor" ? "" : undefined}>
                <div className="scene-page-inner">
                  <Monitor m={s.monitor} pulse={s.pulse} lifts={{ scale: scaleLift, tone: toneLift }} setRef={setPanelRef} routing />
                </div>
              </div>
            </div>
            {/* The page control on laptop (D-43): a glass pill 16 px left of the section and centred on it, the two icons stacked along the pages' axis. It lives in the band so its centre is the band's, which is the section's (the pages centre their content in the band), not the page's. Below laptop it sits in the transport group beside the volume. */}
            {laptop && (
              <Glass material="glass" className="scene-pill scene-views-pill scene-views-side">
                <PageIndicator view={page} onView={switchView} vertical />
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
              {/* Below laptop the page pill is part of the transport group, beside the volume (Shoro, 2026-09-16). */}
              {!laptop && (
                <Glass material="glass" className="scene-pill scene-views-pill">
                  <PageIndicator view={page} onView={switchView} vertical={false} />
                </Glass>
              )}
            </div>
            {/* The bottom bar (Shoro, 2026-09-16): the transport at the left, the source line centred on the bar, the credit at the right; below laptop the three stack, the credit its own row under the source line (index.css). */}
            {day && day.length > 0 && (
              <Glass material="frosted" className="scene-source">
                <SourceLine borough={s.borough} hours={day} fallback={s.snapshot?.fallback ?? null} live={s.live} />
              </Glass>
            )}
            <Glass material="frosted" className="scene-credit">
              <Credit />
            </Glass>
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
