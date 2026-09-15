// Graph — the day as four labelled tracks on one hour-aligned x-scale, the pulse row beneath, one playhead through all of it (§5.3 score panel, rebuilt). Replaces Score.
// Tabs: AQI (from PM2.5, coloured per EPA category, D-23), PM2.5 µg/m³, O3 ppb, NO2 ppb — one at a time, each with its unit and its own right-edge scale, a line through hourly points with gaps where the hour is null (§4.4 rest). The pulse row is always beneath: the engine's exact 16-step pattern per four-hour bar (graphPulse.ts), four steps under every hour column, each bar labelled with its hit count; a hit brightens when the engine fires it.
// One clock: the playhead is the session's eased hour — the same number that moves the sun — and the pulse row lights whichever hit mark the playhead is currently over. Lighting marks from the engine's callback instead put two clocks on one row (timer, render and frame latency on one side, the eased hour on the other) and the flashes drifted ahead of the line. The active tab is the caller's state.
// The graph is a transport surface, as in a DAW: press or drag anywhere on the plot to move the playhead, and the engine seeks with it, playing or paused. Play and pause live in the transport pill.
import { readingLabel } from "../utils/time";
import React, { useEffect, useMemo, useRef } from "react";
import { useTheme, themeColors, families, typeScale, space, aqiScaleColor, aqiScaleStops, AQI_CATEGORIES, GRAPH, CONTROL, motion } from "../utils/theme";
import { TRACK_LABELS, TRACK_UNITS } from "../content";
import { pmToAQISeries, monotoneCurve } from "./graphSeries";
import { chipStyle } from "./chip";
import { pulseSteps, STEPS_PER_HOUR } from "./graphPulse";
import type { PollutantAnchors } from "../engine/contour";
import type { Day } from "../engine/SynthEngine";

export type TrackKey = "aqi" | "pm25" | "o3" | "no2";
export const TRACK_ORDER: TrackKey[] = ["aqi", "pm25", "o3", "no2"];

interface Props {
  day: Day;
  anchors: PollutantAnchors;
  playheadHour: number | null; // eased, fractional; null = at rest
  running: boolean; // playing: animate; paused: draw the held playhead once
  live: boolean;
  tab: TrackKey;
  onTab: (t: TrackKey) => void;
  onSeek: (hour: number) => void; // press or drag on the plot: move the phrase to that hour
  lift?: number; // the ramp lift for this panel (D-36): 0 the dark end, 1 the light end
}

const MAX_RENDER_PIXELS = 24e6; // the buffer's pixel budget: the render ratio (device ratio × pinch scale) is capped where the buffer would exceed it, so a small plot stays crisp through a deep pinch and a large one cannot allocate hundreds of megabytes
// Hairlines: every faint line the graph draws — hour lines, ticks, baselines, dashed gridlines, the null-bar dashes — is drawn OPAQUE into one layer and the layer is composited once at the hairline alpha. Drawn straight onto the canvas each translucent line doubled where it crossed another (little bright squares at every intersection, ticks over hour lines); in one opaque layer a crossing is just a pixel, and the fainter hour lines are a dimmer grey painted first so the firm lines simply cover them.
function rgba(s: string): [number, number, number, number] {
  const m = s.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3]), m[4] == null ? 1 : Number(m[4])] : [255, 255, 255, 1];
}


// A frame (D-37): everything the track and the pulse row draw for one state (a day on a tab), with the line in NORMALIZED height — a fraction of the tab's own scale — so two frames on different scales can be blended point by point. Presence is an alpha, so a reading that exists in one frame and not the other fades rather than pops.
interface Frame {
  key: string; // the state: tab and day
  dayKey: string;
  norm: Array<number | null>;
  alpha: number[];
  colours: Array<[number, number, number] | null>; // the line's colour at each reading
  max: number;
  gridValues: number[];
  isAqi: number; // 1 on the AQI tab: the bar, the wider line and the deeper fill fade with it
  pulse: Array<boolean | null>;
  barHits: Array<number | null>;
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
function lerpFrame(a: Frame, b: Frame, t: number): Frame {
  const n = Math.max(a.norm.length, b.norm.length);
  const norm: Array<number | null> = [], alpha: number[] = [], colours: Array<[number, number, number] | null> = [];
  for (let i = 0; i < n; i++) {
    const na = a.norm[i] ?? null, nb = b.norm[i] ?? null;
    norm.push(na == null && nb == null ? null : lerp(na ?? nb!, nb ?? na!, t));
    alpha.push(lerp(a.alpha[i] ?? 0, b.alpha[i] ?? 0, t));
    const ca = a.colours[i] ?? b.colours[i] ?? null, cb = b.colours[i] ?? a.colours[i] ?? null;
    colours.push(ca && cb ? [lerp(ca[0], cb[0], t), lerp(ca[1], cb[1], t), lerp(ca[2], cb[2], t)] : null);
  }
  return { ...b, norm, alpha, colours, max: lerp(a.max, b.max, t), isAqi: lerp(a.isAqi, b.isAqi, t) };
}

export function Graph({ day, anchors, playheadHour, running, live, tab, onTab, onSeek, lift = 0 }: Props) {
  const theme = useTheme();
  const c = themeColors(theme);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  // The playhead changes every frame; it goes through a ref so the draw effect — which owns the canvas size, the observer and the animation loop — is not torn down and rebuilt sixty times a second.
  const areaCache = useRef<{ key: string; canvas: HTMLCanvasElement } | null>(null);
  const hairRef = useRef<HTMLCanvasElement | null>(null); // the firm hairlines, opaque white, reused across draws
  const faintRef = useRef<HTMLCanvasElement | null>(null); // the faint hairlines, opaque white, composited at their own alpha
  const playheadRef = useRef<number | null>(playheadHour);
  playheadRef.current = playheadHour;
  const playing = running && playheadHour != null;
  // The plot's horizontal extent, recorded by draw() so pointer positions map to hours.
  const plotRef = useRef({ x: 0, w: 1, n: 24 });
  const dragging = useRef(false);
  const hourAt = (clientX: number): number | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const { x, w, n } = plotRef.current;
    const px = clientX - canvas.getBoundingClientRect().left;
    return Math.max(0, Math.min(n - 0.001, ((px - x) / w) * (n - 1))); // the plot spans the readings, first to last
  };

  const series = useMemo(() => ({
    aqi: pmToAQISeries(day),
    pm25: day.map((h) => (h.pm25 == null ? null : Math.max(0, h.pm25))),
    o3: day.map((h) => h.o3),
    no2: day.map((h) => h.no2),
    pulse: pulseSteps(day, anchors),
    // Hit count per bar, for the row's labels.
    barHits: Array.from({ length: Math.ceil(day.length / 4) }, (_, b) => {
      const st = pulseSteps(day, anchors).slice(b * 16, b * 16 + 16);
      return st[0] == null ? null : st.filter((x) => x === true).length;
    }),
  }), [day, anchors]);

  // The target frame for this state, and the transition to it. When the state changes (a new day or a new tab) the frame last SHOWN becomes the start, so a change made mid-transition continues from where the line is rather than from where it was going.
  // Which data is on screen: a counter that steps whenever the day array changes identity (a new date, a new borough, a live refresh), so the state's key follows the data rather than the date, and a change of borough morphs too.
  const dayIdRef = useRef({ day, id: 0 });
  if (dayIdRef.current.day !== day) dayIdRef.current = { day, id: dayIdRef.current.id + 1 };
  const dayId = dayIdRef.current.id;
  const target = useMemo<Frame>(() => {
    const vals = series[tab];
    const present = vals.filter((v): v is number => v != null);
    const floor = tab === "pm25" ? 20 : tab === "o3" ? 40 : 30;
    // Scale. AQI is FIXED at the full 0–500 (GRAPH.aqiScaleMax), so the line never rescales between days, nothing clips, and the bar beside it is always the same complete ruler. The other channels have no standard ruler and take the day's own max, floored so a quiet day is not stretched to look dramatic; that changes only when the day changes.
    const max = tab === "aqi" ? GRAPH.aqiScaleMax : Math.max(floor, ...present) * 1.08;
    const secondary = rgba(c.textSecondary);
    return {
      key: `${tab}|${dayId}`,
      dayKey: `${dayId}`,
      norm: vals.map((v) => (v == null ? null : Math.min(v, max) / max)),
      alpha: vals.map((v) => (v == null ? 0 : 1)),
      colours: vals.map((v) => (v == null ? null : tab === "aqi" ? (rgba(aqiScaleColor(v, lift)).slice(0, 3) as [number, number, number]) : [secondary[0], secondary[1], secondary[2]])),
      max,
      gridValues: tab === "aqi" ? AQI_CATEGORIES.map((k) => k.max).filter((v) => v <= max) : [Math.round(max / 1.08), Math.round(max / 2.16)],
      isAqi: tab === "aqi" ? 1 : 0,
      pulse: series.pulse,
      barHits: series.barHits,
    };
  }, [series, tab, lift, c, dayId]); // eslint-disable-line react-hooks/exhaustive-deps
  const transitionRef = useRef<{ from: Frame | null; to: Frame; start: number; ms: number }>({ from: null, to: target, start: 0, ms: 0 });
  const shownRef = useRef<Frame | null>(null);
  if (transitionRef.current.to.key !== target.key) {
    // A new state: start from what is on screen now. The tab band's chips have already moved; the line follows over GRAPH.transitionBeats.
    transitionRef.current = { from: shownRef.current ?? transitionRef.current.to, to: target, start: performance.now(), ms: motion.beatMs * GRAPH.transitionBeats };
  } else transitionRef.current.to = target; // the same state re-described (a lift or theme change): no morph

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;

    const draw = () => {
      const cssW = wrap.getBoundingClientRect().width; // the real, fractional width: clientWidth rounds, and a buffer sized from the rounded width was stretched across the real box by a fraction of a pixel, blurring every line
      // Breakpoint from the panel's own width: the panel is ~640 on laptop, ~700 on a portrait tablet, ~320 on a phone.
      const bp: "laptop" | "tablet" | "phone" = cssW < 480 ? "phone" : cssW < 760 ? "tablet" : "laptop";
      // The scene may override the tab height by CSS (--graph-tab-h) where the VIEWPORT is short — a phone's width says nothing about its height.
      const pulseH = GRAPH.pulseRowHeight[bp];
      const axisH = GRAPH.axisHeight[bp];
      const cssTab = parseInt(getComputedStyle(wrap).getPropertyValue("--graph-tab-h"));
      const minTab = Number.isFinite(cssTab) && cssTab > 0 ? cssTab : GRAPH.tabHeight[bp];
      // Side by side (the scene sets --graph-fill: 1 there), the plot grows into the height the stretched panel gives it, never below the breakpoint's minimum — so the graph is taller than the hero. In the column layouts the panel's height is its content, and growing into it would be a feedback loop, so the plot stays at the minimum.
      const fill = getComputedStyle(wrap).getPropertyValue("--graph-fill").trim() === "1";
      const tabs = wrap.firstElementChild as HTMLElement | null;
      // The band is pulled up into the panel's padding, so the space it takes inside the wrap is from the wrap's top to the band's bottom, plus the gap below it.
      const tabsH = tabs ? tabs.getBoundingClientRect().bottom - wrap.getBoundingClientRect().top + parseFloat(getComputedStyle(tabs).marginBottom || "0") : 0;
      const available = wrap.clientHeight - tabsH - GRAPH.labelGutter - pulseH - axisH;
      const tabH = fill ? Math.max(minTab, Math.floor(available / 4) * 4) : minTab;
      const cssH = GRAPH.labelGutter + tabH + pulseH + axisH;
      // The buffer is whole device pixels at the current ratio, and the canvas box is set to exactly buffer ÷ ratio, so one buffer pixel is one device pixel and every line lands on one; any other pairing resamples the drawing. The ratio includes the visual viewport's pinch scale (trackpad pinch on a Mac, pinch on a phone): that magnifies the page without reflow or a ratio change, and a bitmap drawn at the unmagnified ratio is simply scaled up, which is the one element on the page that can look soft. Capped, because a 5× pinch on a 2× display would be a 100-megapixel buffer.
      const pinch = window.visualViewport?.scale ?? 1;
      const dpr = Math.min((window.devicePixelRatio || 1) * pinch, Math.sqrt(MAX_RENDER_PIXELS / (cssW * cssH)));
      const bufW = Math.round(cssW * dpr), bufH = Math.round(cssH * dpr);
      if (canvas.width !== bufW || canvas.height !== bufH) {
        canvas.width = bufW;
        canvas.height = bufH;
      }
      canvas.style.width = `${bufW / dpr}px`;
      canvas.style.height = `${bufH / dpr}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      // The hairline layer (see rgba() above): same buffer, same transform, cleared each draw.
      const hairCanvas = hairRef.current ?? (hairRef.current = document.createElement("canvas"));
      if (hairCanvas.width !== bufW || hairCanvas.height !== bufH) { hairCanvas.width = bufW; hairCanvas.height = bufH; }
      const hair = hairCanvas.getContext("2d")!;
      hair.setTransform(dpr, 0, 0, dpr, 0, 0);
      hair.clearRect(0, 0, cssW, cssH);
      // Two weights, two layers, one colour: every hairline is the token's white, drawn opaque, and each layer is composited once at its token's alpha (textFaint for the firm lines, gridHair for the faint ones), so a hairline reads as the same lift over the panel whatever the panel's tint. The earlier single layer encoded the faint weight as a dimmer opaque grey, which is only equivalent over black: over the tinted frost that grey was darker than the panel on warm tints and invisible on cool ones (2026-09-15). Crossings within a layer are opaque, so nothing doubles; where a firm line crosses a faint one the faint layer is cut out beneath it.
      const faintCanvas = faintRef.current ?? (faintRef.current = document.createElement("canvas"));
      if (faintCanvas.width !== bufW || faintCanvas.height !== bufH) { faintCanvas.width = bufW; faintCanvas.height = bufH; }
      const faint = faintCanvas.getContext("2d")!;
      faint.setTransform(dpr, 0, 0, dpr, 0, 0);
      faint.clearRect(0, 0, cssW, cssH);
      const [fr, fg, fb, fa] = rgba(c.textFaint);
      const [, , , ha] = rgba(c.gridHair);
      const firmLine = `rgb(${fr},${fg},${fb})`;
      hair.lineWidth = 1; faint.lineWidth = 1; faint.strokeStyle = firmLine;

      const n = day.length;
      // The AQI tab keeps a scale bar at the RIGHT, on the line's own fixed y-scale: the standard category colours as one smooth vertical gradient, with a marker at the value under the playhead (the latest hour at rest). Its column is reserved on EVERY tab, so the plot is the same width whichever tab is up and the lines land on the same x positions (2026-09-15); the bar is an addition beside the plot, not a change to it.
      const barW = GRAPH.scaleBarWidth;
      // A left gutter holds the y-axis values, right-aligned against the plot's first line, so they never sit on the area fill. Sized to the widest value the tab can show.
      const gutterW = Math.ceil(ctx.measureText("500").width) + GRAPH.axisGutterPad * 2;
      const plotX = gutterW;
      const plotW = cssW - plotX - barW; // the legend's column abuts the plot: its track begins on the plot's right edge
      const plotRight = plotX + plotW;
      // The readings are pinned to the plot: the first on the y-axis line, the last on the right edge, so the line has no padding at either end (the y values live in the gutter and cannot collide). colW is the interval between readings; everything on the time axis — grid, area, line, pulse steps, playhead — is plotX + hours * colW.
      const colW = n > 1 ? plotW / (n - 1) : plotW;
      plotRef.current = { x: plotX, w: plotW, n };
      const labelPx = parseInt(typeScale.caption.size);
      ctx.font = `${labelPx}px ${families.data}`;
      const lh = labelPx + 4; // label line height inside the canvas

      // Hour grid: a faint line at every reading through everything, a firmer one per four-hour bar (the pulse's bar lines), each running on past the axis as its own tick (5 px at bar starts, 3 otherwise) — one stroke, so the tick never sits on top of the line. Faint ones first, firm ones after, so a firm line covers rather than doubles.
      const axisYForGrid = cssH - axisH;
      for (const pass of [false, true]) {
        const layer = pass ? hair : faint;
        layer.strokeStyle = firmLine;
        for (let i = 0; i < n; i++) {
          if ((i % 4 === 0) !== pass) continue;
          const x = Math.round(plotX + i * colW) + 0.5;
          layer.beginPath(); layer.moveTo(x, GRAPH.labelGutter); layer.lineTo(x, axisYForGrid + (pass ? 5 : 3)); layer.stroke();
        }
      }
      // The plot's right edge, so the grid never runs under the scale bar.
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, plotRight + 1, cssH); ctx.clip();

      // Tracks: the one line track (the tab), drawn from the SHOWN frame. The shown frame is the target frame, or during a transition the blend of the frame last shown and the target (see Frame below): every value at a blend of its two normalized heights, every colour at a blend, every presence at a blend of its alphas, the scale's top at a blend. So a change of day morphs the line from the old shape to the new, and a change of tab morphs it from the old track to the new on a scale that rescales as it goes (D-37).
      const now = performance.now();
      const tr = transitionRef.current;
      let e = 1;
      if (tr.from) { e = easeInOut(Math.min(1, (now - tr.start) / tr.ms)); if (e >= 1) tr.from = null; }
      const cur = tr.from ? lerpFrame(tr.from, tr.to, e) : tr.to;
      shownRef.current = cur;
      const transitioning = tr.from != null;
      const fromFrame = tr.from, toFrame = tr.to;
      let y0 = GRAPH.labelGutter;
      {
        const { norm, alpha, max, colours } = cur;
        const curve = monotoneCurve(norm);
        const inner = tabH - lh - 2;
        const yOf = (f: number) => y0 + lh + (1 - Math.min(f, 1)) * inner; // f: a fraction of the shown scale
        const rgbaOf = (col: [number, number, number] | null, a: number) => col ? `rgba(${col.map(Math.round).join(",")},${a.toFixed(3)})` : "rgba(255,255,255,0)";

        // Baseline. Gridlines at the target's values, each at the height its value has on the SHOWN scale, so a value's line slides as the scale rescales rather than jumping; the labels cross-fade, the previous frame's out and the target's in.
        hair.strokeStyle = firmLine;
        hair.beginPath(); hair.moveTo(plotX, y0 + lh + inner + 0.5); hair.lineTo(plotRight, y0 + lh + inner + 0.5); hair.stroke();
        for (const gv of toFrame.gridValues) {
          const f = gv / max; if (f > 1.001) continue;
          const gy = yOf(f);
          hair.setLineDash([2, 5]); hair.beginPath(); hair.moveTo(plotX, gy + 0.5); hair.lineTo(plotRight, gy + 0.5); hair.stroke(); hair.setLineDash([]);
        }
        const labelSets: Array<[number[], number]> = fromFrame ? [[fromFrame.gridValues, 1 - e], [toFrame.gridValues, e]] : [[toFrame.gridValues, 1]];
        for (const [values, a] of labelSets) {
          ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = c.textMuted;
          for (const gv of values) { const f = gv / max; if (f > 1.001) continue; const lab = String(gv); ctx.fillText(lab, plotX - GRAPH.axisGutterPad - ctx.measureText(lab).width, yOf(f) + labelPx * 0.36); }
          ctx.restore();
        }

        // AQI: the scale bar at the right, fading in with the tab. One smooth gradient through the category colours on the fixed 0–500 ruler; the marker sits at the value under the playhead, and eases with it.
        if (cur.isAqi > 0.005) {
          ctx.restore(); // draw outside the plot clip
          ctx.save(); ctx.globalAlpha = cur.isAqi;
          const barX = cssW - barW;
          const barTop = GRAPH.labelGutter, barBottom = yOf(0);
          const grad = ctx.createLinearGradient(0, barBottom, 0, yOf(1));
          for (const s of aqiScaleStops(GRAPH.aqiScaleMax, lift)) grad.addColorStop(s.offset, s.color);
          const trackW = GRAPH.scaleTrackWidth, trackX = barX;
          ctx.fillStyle = grad;
          ctx.fillRect(trackX, barTop, trackW, barBottom - barTop);
          const hi = playheadRef.current != null ? Math.min(n - 1, Math.floor(playheadRef.current)) : (() => { for (let i = n - 1; i >= 0; i--) if (alpha[i] > 0.5) return i; return -1; })();
          const cv = hi >= 0 ? norm[hi] : null;
          if (cv != null && alpha[hi] > 0.005) {
            // The marker is a caret at the track's right, pointing left at the value: a reading, not a control. On the 4 px grid (GRAPH.scaleCaret tall, half as deep), its tip GRAPH.scaleCaretGap from the track; its base on the column's outer edge.
            // Drawn in the glass vocabulary: a translucent light fill, a soft shadow cast down and right, a fine edge, and a brighter top edge where the light catches it — the chips' inset highlight, in miniature.
            ctx.globalAlpha = cur.isAqi * alpha[hi];
            const my = yOf(cv);
            const h = GRAPH.scaleCaret, d = GRAPH.scaleCaret / 2, tipX = trackX + trackW + GRAPH.scaleCaretGap;
            const caret = () => { ctx.beginPath(); ctx.moveTo(tipX, my); ctx.lineTo(tipX + d, my - h / 2); ctx.lineTo(tipX + d, my + h / 2); ctx.closePath(); };
            ctx.save();
            ctx.shadowColor = "rgba(0,0,0,0.4)"; ctx.shadowBlur = 4; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 1.5;
            ctx.fillStyle = "rgba(255,255,255,0.55)";
            caret(); ctx.fill();
            ctx.restore();
            ctx.lineWidth = 1; ctx.lineJoin = "round";
            ctx.strokeStyle = "rgba(255,255,255,0.7)"; caret(); ctx.stroke(); // the edge
            ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.beginPath(); ctx.moveTo(tipX, my); ctx.lineTo(tipX + d, my - h / 2); ctx.stroke(); // the lit top edge
          }
          ctx.restore();
          ctx.save(); ctx.beginPath(); ctx.rect(0, 0, plotRight + 1, cssH); ctx.clip();
        }

        // The area under the line: colour blends horizontally along the line (a stop at every hour's colour) AND fades vertically from each segment's own line height to the baseline. One fill carries one gradient, so this is two passes on an offscreen canvas — the vertical fades as an alpha mask, then the horizontal colour gradient drawn through it (source-in) — cached per shown frame and size, so the playhead's per-frame redraw does not rebuild it; a transition rebuilds it every frame, which is the cost of the fill following the morphing line.
        const baseY = y0 + lh + inner;
        // Keyed on the plot's geometry too (plotX, plotW, the track's y range): plotX is measured from the data font, and when that font arrives after the first draw the edge moves a couple of pixels; the line redraws at the new positions, and a fill cached under the old edge sat visibly off the line.
        const areaKey = `${n}|${cssW}|${cssH}|${dpr}|${plotX}|${plotW}|${y0}|${tabH}|${cur.isAqi.toFixed(2)}|${norm.map((v, i) => (v == null ? "" : `${Math.round(v * 1000)}:${Math.round(alpha[i] * 100)}:${colours[i]?.map(Math.round).join(".")}`)).join(",")}`;
        let area = areaCache.current;
        if (!area || area.key !== areaKey) {
          const off = document.createElement("canvas");
          off.width = Math.round(plotW * dpr); off.height = bufH; // the plot's own device pixels, blitted 1:1 below
          const o = off.getContext("2d")!;
          o.setTransform(dpr, 0, 0, dpr, 0, 0);
          const fillAlpha = GRAPH.areaAlpha.channel + (GRAPH.areaAlpha.aqi - GRAPH.areaAlpha.channel) * cur.isAqi;
          // Pass 1: the mask — the fade computed per pixel into an image buffer: alpha falls linearly from the fill alpha at the line's height in that column to 0 at the base, the line's height following the segment between the two readings continuously. Per-hour segments each had their own fade and read as bands; per-column canvas gradients were smooth in principle but the rasterizer quantizes each column's gradient with a different phase, a 3–4% ripple between neighbouring columns at high zoom. Written directly, the fade is exact. The top row gets the line's fractional coverage so the fill's edge sits on the line.
          const mask = o.createImageData(off.width, off.height);
          const md = mask.data;
          const baseDev = baseY * dpr;
          for (let px = 0; px < off.width; px++) {
            const xc = (px + 0.5) / dpr; // the column's centre in CSS px, relative to the plot
            const v = curve(Math.min(n - 1, Math.max(0, xc / colW)));
            if (v == null) continue;
            const yLine = yOf(v) * dpr;
            if (yLine >= baseDev) continue;
            const span = baseDev - yLine;
            const first = Math.floor(yLine);
            for (let y = first; y < off.height && y < baseDev; y++) {
              const coverage = y === first ? first + 1 - yLine : 1; // the top pixel's fractional coverage by the fill
              const depth = Math.max(0, y + 0.5 - yLine) / span; // 0 at the line, 1 at the base
              md[(y * off.width + px) * 4 + 3] = Math.round(255 * fillAlpha * coverage * Math.max(0, 1 - depth));
            }
          }
          o.putImageData(mask, 0, 0);
          // Pass 2: the colour, through the mask — each hour's colour at its presence.
          o.globalCompositeOperation = "source-in";
          const colour = o.createLinearGradient(0, 0, plotW, 0);
          for (let i = 0; i < n; i++) colour.addColorStop(Math.min(1, Math.max(0, (i * colW) / plotW)), rgbaOf(colours[i], alpha[i]));
          o.fillStyle = colour;
          o.fillRect(0, 0, plotW, cssH);
          area = { key: areaKey, canvas: off };
          areaCache.current = area;
        }
        // The fill and the line are clipped to the plot itself: with the first and last readings on the bounds, the stroke's width and round caps would otherwise spill over the y-axis line and the right edge.
        // From the column after the axis line to the column of the right edge line (both lines sit at Math.round(x) + 0.5, so they own exactly those columns): the fill meets both lines with no gap and never paints over them.
        ctx.save(); ctx.beginPath(); ctx.rect(plotX + 1, 0, Math.round(plotRight) - plotX - 1, cssH); ctx.clip();
        // Blitted at its native size onto the plot's own device pixels, so nothing is resampled.
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(area.canvas, Math.round(plotX * dpr), 0);
        ctx.restore();

        // The line. Each segment is a gradient between its two ends' colours — the same rule the bar is drawn with, so a point on the line and the bar at that height always match — at the lesser of its two ends' presence.
        ctx.lineWidth = GRAPH.lineWidth.channel + (GRAPH.lineWidth.aqi - GRAPH.lineWidth.channel) * cur.isAqi;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        // Each hour's piece is the monotone curve sampled every few pixels (graphSeries.monotoneCurve), so the line is smooth between readings and never overshoots one; the fill's height follows the same curve.
        const CURVE_STEP = 3; // css px between samples along the curve
        for (let i = 1; i < n; i++) {
          const a = norm[i - 1], b = norm[i];
          const sa = Math.min(alpha[i - 1], alpha[i]);
          if (a == null || b == null || sa <= 0.005) continue;
          const x0 = plotX + (i - 1) * colW, x1 = plotX + i * colW;
          const seg = ctx.createLinearGradient(x0, yOf(a), x1, yOf(b));
          seg.addColorStop(0, rgbaOf(colours[i - 1], sa));
          seg.addColorStop(1, rgbaOf(colours[i], sa));
          ctx.strokeStyle = seg;
          ctx.beginPath();
          ctx.moveTo(x0, yOf(a));
          const steps = Math.max(2, Math.ceil(colW / CURVE_STEP));
          for (let s = 1; s <= steps; s++) {
            const f = s / steps;
            const v = curve(i - 1 + f);
            ctx.lineTo(x0 + (x1 - x0) * f, yOf(v ?? (a + (b - a) * f)));
          }
          ctx.stroke();
        }
        // Trailing hours not yet reported (a live channel AirNow has not published for the newest hours) hold the last value as a dotted flat line to the right edge: the line does not simply stop, and the dots say "not yet" rather than "zero".
        let lastIdx = -1;
        for (let i = n - 1; i >= 0; i--) if (alpha[i] > 0.5 && norm[i] != null) { lastIdx = i; break; }
        if (lastIdx >= 0 && lastIdx < n - 1) {
          const y = yOf(norm[lastIdx]!);
          ctx.save();
          ctx.setLineDash([2, 4]);
          ctx.lineWidth = 1;
          ctx.strokeStyle = cur.isAqi > 0.5 ? rgbaOf(colours[lastIdx], alpha[lastIdx]) : c.textMuted;
          ctx.beginPath(); ctx.moveTo(plotX + lastIdx * colW, y); ctx.lineTo(plotRight, y); ctx.stroke();
          ctx.restore();
        }
        // Isolated points (a reporting hour between two nulls) still show.
        for (let i = 0; i < n; i++) {
          const v = norm[i];
          if (v == null || alpha[i] <= 0.005) continue;
          if ((i === 0 || alpha[i - 1] <= 0.5) && (i === n - 1 || alpha[i + 1] <= 0.5)) {
            ctx.fillStyle = rgbaOf(colours[i], alpha[i]);
            ctx.fillRect(plotX + i * colW - 1, yOf(v) - 1, 2, 2);
          }
        }
        ctx.restore(); // back to the wider clip, so the y values in the gutter stay drawable
        y0 += tabH;
      }

      // Pulse row: 16 steps per bar, 4 per hour; hit = a mark, rest = nothing, null bar = a faint dash across it. Each bar is labelled with its hit count. The mark under the playhead is lit for as long as the playhead is over its step — the row and the line share one clock. Hour i's steps run from reading i towards reading i+1, so the last reading's steps fall past the right edge (the hour after the last reading) and are not drawn. On a change of day the previous day's marks and counts fade out as the new day's fade in.
      {
        const stepW = colW / STEPS_PER_HOUR;
        const ph = playheadRef.current;
        const currentStep = ph == null ? -1 : Math.floor((ph % 24) * STEPS_PER_HOUR);
        ctx.fillStyle = c.textMuted;
        ctx.fillText(TRACK_LABELS.pulse, plotX + 4, y0 + labelPx);
        const pulseSets: Array<[Frame, number]> = fromFrame && fromFrame.dayKey !== toFrame.dayKey ? [[fromFrame, 1 - e], [toFrame, e]] : [[toFrame, 1]];
        for (const [fr, a] of pulseSets) {
          ctx.save(); ctx.globalAlpha = a;
          for (let b = 0; b < fr.barHits.length; b++) {
            const k = fr.barHits[b];
            const label = k == null ? "—" : `${k}`;
            const bx = Math.min(plotRight, plotX + b * 4 * colW + 4 * colW) - ctx.measureText(label).width - 4;
            ctx.fillStyle = c.textMuted;
            ctx.fillText(label, bx, y0 + labelPx);
          }
          for (let s = 0; s < fr.pulse.length; s++) {
            const v = fr.pulse[s];
            const x = plotX + s * stepW;
            if (x >= plotRight) continue;
            if (v == null) {
              if (s % 16 === 0 && fr === toFrame) { hair.fillStyle = firmLine; hair.fillRect(x, y0 + pulseH - 5, Math.min(colW * 4, plotRight - x), 1); }
              continue;
            }
            if (!v) continue;
            const lit = s === currentStep;
            ctx.fillStyle = lit ? c.textPrimary : c.textSecondary;
            const h = lit ? pulseH - lh - 2 : pulseH - lh - 6;
            // Marks sit at the START of their step, where the playhead is at the moment of the hit.
            ctx.fillRect(Math.round(x), y0 + pulseH - 3 - h, lit ? 3 : 2, h);
          }
          ctx.restore();
        }
        y0 += pulseH;
      }

      // X axis: a line under the pulse row, ticks from the hour grid above; two labels only, drawn after the hairlines are composited below.
      const axisY = cssH - axisH;
      hair.strokeStyle = firmLine;
      hair.beginPath(); hair.moveTo(plotX, axisY + 0.5); hair.lineTo(plotRight, axisY + 0.5); hair.stroke();
      // Every hairline is in the layer now; composite it once, BENEATH everything drawn so far (the line, the area, the pulse marks, the labels): the hairlines are the bottom of the stack and the line is the top. Clipped to the plot's right edge like the grid was, so nothing runs under the scale bar.
      faint.save(); faint.setTransform(1, 0, 0, 1, 0, 0); faint.globalCompositeOperation = "destination-out"; faint.drawImage(hairCanvas, 0, 0); faint.restore();
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, plotRight + 1, cssH); ctx.clip();
      ctx.globalCompositeOperation = "destination-over";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = fa; ctx.drawImage(hairCanvas, 0, 0);
      ctx.globalAlpha = ha; ctx.drawImage(faintCanvas, 0, 0);
      ctx.restore();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (n > 0) {
        ctx.fillStyle = c.textMuted;
        // The date is on the left label only for the live window, whose readings straddle two days; a chosen day is named by the picker already, so its label is just the time.
        ctx.fillText(readingLabel(day[0].ts, live), plotX + 2, cssH - 5);
        const right = live ? "now" : readingLabel(day[n - 1].ts, false);
        ctx.fillText(right, plotRight - ctx.measureText(right).width - 2, cssH - 5);
      }

      // Playhead: the eased hour, one line through every track, with the hour's values printed at its head.
      const playheadHour = playheadRef.current;
      if (playheadHour != null && n > 0) {
        const x = Math.min(plotRight - 0.5, plotX + playheadHour * colW);
        ctx.strokeStyle = c.textPrimary;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, GRAPH.labelGutter); ctx.lineTo(x, axisY); ctx.stroke();
        const hi = Math.max(0, Math.min(n - 1, Math.floor(playheadHour))); // clamped both ways: this indexes the day
        // Clock time from the reading's own timestamp, not the index. The date joins it only on the live window, whose readings straddle two days ("Sep 14, 6pm"); a chosen day already names its date in the axis label, so its chip is just "4am".
        const parts: string[] = [readingLabel(day[hi].ts, live)];
        { const v = series[tab][hi]; parts.push(`${TRACK_LABELS[tab]} ${v == null ? "—" : Math.round(v)}`); }
        const label = parts.join(" · ");
        // The readout is a chip, in the site's vocabulary: 24 tall, 8 px side padding, 8 px corners, the panel's dark fill with the chips' hairline border, caption type.
        const chipH = 24, chipPad = 8, chipR = 8;
        const w = Math.ceil(ctx.measureText(label).width) + chipPad * 2;
        const lx = x + 8 + w > plotRight ? x - 8 - w : x + 8;
        const ly = GRAPH.labelGutter;
        ctx.fillStyle = c.bgPanel;
        ctx.strokeStyle = "rgba(255,255,255,0.14)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(lx + 0.5, ly + 0.5, w, chipH, chipR); ctx.fill(); ctx.stroke();
        ctx.fillStyle = c.textPrimary;
        ctx.fillText(label, lx + chipPad, ly + chipH / 2 + labelPx * 0.36);
      }

      ctx.restore();
      if (playing || transitioning) raf = requestAnimationFrame(draw);
    };

    draw();
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); draw(); });
    ro.observe(wrap);
    // Browser zoom changes the device pixel ratio without always changing the panel's CSS size (Firefox fires no resize then), so watch the ratio itself: a media query that matches the current ratio stops matching the moment it changes; redraw and watch the new one.
    let mq: MediaQueryList | null = null;
    const watchRatio = () => {
      mq?.removeEventListener("change", onRatio);
      mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      mq.addEventListener("change", onRatio);
    };
    const onRatio = () => { cancelAnimationFrame(raf); draw(); watchRatio(); };
    watchRatio();
    // Browser zoom also fires a window resize; a pinch fires the visual viewport's resize. Redraw when the effective ratio (device ratio × pinch scale) has moved, whether or not the media query reported it (Firefox rounds resolution queries).
    const effective = () => (window.devicePixelRatio || 1) * (window.visualViewport?.scale ?? 1);
    let seen = effective();
    const onResize = () => { const e = effective(); if (e !== seen) { seen = e; cancelAnimationFrame(raf); draw(); watchRatio(); } };
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); mq?.removeEventListener("change", onRatio); window.removeEventListener("resize", onResize); window.visualViewport?.removeEventListener("resize", onResize); };
  }, [target, day, playing, live, c, running ? 0 : playheadHour]); // when held, redraw once per change of the held value

  return (
    <div ref={wrapRef} style={{ width: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* The tabs are a header band attached to the top of the graph container, built to the preset bar's spec (§5.3): the same chips (chip.ts), the same 4 px gaps with a roomier 8 px inset, the band spanning the container edge to edge so the container's own top corners round it and its bottom is square, and no line, fill or shadow of its own — the band and the graph are one container. */}
      <div role="tablist" style={{ position: "relative", display: "flex", alignItems: "center", flex: "0 0 auto", gap: CONTROL.gap, height: `calc(var(--ctl-inner, ${CONTROL.inner}px) + ${GRAPH.tabsInset * 2}px)`, margin: `calc(-1 * var(--graph-pad, 20px)) calc(-1 * var(--graph-pad-x, 16px)) ${GRAPH.tabsGap}px`, padding: `0 ${GRAPH.tabsInset}px`, boxSizing: "border-box", overflowX: "auto", overflowY: "hidden", whiteSpace: "nowrap", scrollbarWidth: "none" }}>
        {TRACK_ORDER.map((t) => {
          const active = t === tab;
          return (
            <button key={t} role="tab" aria-selected={active} onClick={() => onTab(t)} style={chipStyle(c, active)}>
              {TRACK_LABELS[t]}{TRACK_UNITS[t] ? ` ${TRACK_UNITS[t]}` : ""}
            </button>
          );
        })}
      </div>
      <canvas
        ref={canvasRef}
        // The canvas is the flexible child: its CSS height is set by draw() from the space the panel gives.
        onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); const h = hourAt(e.clientX); if (h != null) onSeek(h); }}
        onPointerMove={(e) => { if (!dragging.current) return; const h = hourAt(e.clientX); if (h != null) onSeek(h); }}
        onPointerUp={(e) => { dragging.current = false; e.currentTarget.releasePointerCapture(e.pointerId); }}
        onPointerCancel={() => { dragging.current = false; }}
        style={{ display: "block", cursor: "ew-resize", touchAction: "none" }} // width and height are set by draw() to exactly buffer ÷ ratio
        aria-label="24-hour graph; press or drag to move the playhead"
      />
    </div>
  );
}
