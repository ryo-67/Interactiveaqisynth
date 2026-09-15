// Graph — the day as four labelled tracks on one hour-aligned x-scale, the pulse row beneath, one playhead through all of it (§5.3 score panel, rebuilt). Replaces Score.
// Tabs: AQI (from PM2.5, coloured per EPA category, D-23), PM2.5 µg/m³, O3 ppb, NO2 ppb — one at a time, each with its unit and its own right-edge scale, a line through hourly points with gaps where the hour is null (§4.4 rest). The pulse row is always beneath: the engine's exact 16-step pattern per four-hour bar (graphPulse.ts), four steps under every hour column, each bar labelled with its hit count; a hit brightens when the engine fires it.
// One clock: the playhead is the session's eased hour — the same number that moves the sun — and the pulse row lights whichever hit mark the playhead is currently over. Lighting marks from the engine's callback instead put two clocks on one row (timer, render and frame latency on one side, the eased hour on the other) and the flashes drifted ahead of the line. The active tab is the caller's state.
// The graph is a transport surface, as in a DAW: press or drag anywhere on the plot to move the playhead, and the engine seeks with it, playing or paused. Play and pause live in the transport pill.
import { readingLabel } from "../utils/time";
import React, { useEffect, useMemo, useRef } from "react";
import { useTheme, themeColors, families, typeScale, space, aqiScaleColor, aqiScaleStops, AQI_CATEGORIES, GRAPH, CONTROL } from "../utils/theme";
import { TRACK_LABELS, TRACK_UNITS } from "../content";
import { pmToAQISeries } from "./graphSeries";
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
}

const MAX_RENDER_PIXELS = 24e6; // the buffer's pixel budget: the render ratio (device ratio × pinch scale) is capped where the buffer would exceed it, so a small plot stays crisp through a deep pinch and a large one cannot allocate hundreds of megabytes
// Hairlines: every faint line the graph draws — hour lines, ticks, baselines, dashed gridlines, the null-bar dashes — is drawn OPAQUE into one layer and the layer is composited once at the hairline alpha. Drawn straight onto the canvas each translucent line doubled where it crossed another (little bright squares at every intersection, ticks over hour lines); in one opaque layer a crossing is just a pixel, and the fainter hour lines are a dimmer grey painted first so the firm lines simply cover them.
function rgba(s: string): [number, number, number, number] {
  const m = s.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3]), m[4] == null ? 1 : Number(m[4])] : [255, 255, 255, 1];
}

export function Graph({ day, anchors, playheadHour, running, live, tab, onTab, onSeek }: Props) {
  const theme = useTheme();
  const c = themeColors(theme);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  // The playhead changes every frame; it goes through a ref so the draw effect — which owns the canvas size, the observer and the animation loop — is not torn down and rebuilt sixty times a second.
  const areaCache = useRef<{ key: string; canvas: HTMLCanvasElement } | null>(null);
  const hairRef = useRef<HTMLCanvasElement | null>(null); // the opaque hairline layer, reused across draws
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
      const tabsH = tabs ? tabs.getBoundingClientRect().height + parseFloat(getComputedStyle(tabs).marginBottom || "0") : 0;
      const available = wrap.clientHeight - tabsH - GRAPH.labelGutter - pulseH - axisH;
      const tabH = fill ? Math.max(minTab, Math.floor(available / 4) * 4) : minTab;
      const lineTracks: TrackKey[] = [tab];
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
      const [fr, fg, fb, fa] = rgba(c.textFaint);
      const [, , , ha] = rgba(c.gridHair);
      const firmLine = `rgb(${fr},${fg},${fb})`;
      const k = Math.min(1, ha / fa); // the faint lines' share of the layer alpha, expressed as a dimmer opaque grey
      const dim = fr > 127 ? Math.round(255 * k) : Math.round(255 * (1 - k));
      const hairLine = `rgb(${dim},${dim},${dim})`;
      hair.lineWidth = 1;

      const n = day.length;
      // The AQI tab keeps a scale bar at the RIGHT, on the line's own fixed y-scale: the standard category colours as one smooth vertical gradient, with a marker at the value under the playhead (the latest hour at rest).
      const barW = tab === "aqi" ? GRAPH.scaleBarWidth : 0;
      // A left gutter holds the y-axis values, right-aligned against the plot's first line, so they never sit on the area fill. Sized to the widest value the tab can show.
      const gutterW = Math.ceil(ctx.measureText("500").width) + GRAPH.axisGutterPad * 2;
      const plotX = gutterW;
      const plotW = cssW - plotX - (barW ? barW + GRAPH.scaleBarGap : 0);
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
        hair.strokeStyle = pass ? firmLine : hairLine;
        for (let i = 0; i < n; i++) {
          if ((i % 4 === 0) !== pass) continue;
          const x = Math.round(plotX + i * colW) + 0.5;
          hair.beginPath(); hair.moveTo(x, GRAPH.labelGutter); hair.lineTo(x, axisYForGrid + (pass ? 5 : 3)); hair.stroke();
        }
      }
      // The plot's right edge, so the grid never runs under the scale bar.
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, plotRight + 1, cssH); ctx.clip();

      // Tracks.
      let y0 = GRAPH.labelGutter;
      for (const t of lineTracks) {
        const vals = series[t];
        const present = vals.filter((v): v is number => v != null);
        // Scale. AQI is FIXED at the full 0–500 (GRAPH.aqiScaleMax), so the line never rescales between days, nothing clips, and the bar beside it is always the same complete ruler. The other channels have no standard ruler and take the day's own max, floored so a quiet day is not stretched to look dramatic; that changes only when the day changes.
        const floor = t === "pm25" ? 20 : t === "o3" ? 40 : 30;
        const max = t === "aqi" ? GRAPH.aqiScaleMax : Math.max(floor, ...present) * 1.08;
        const inner = tabH - lh - 2;
        const yFor = (v: number) => y0 + lh + (1 - Math.min(v, max) / max) * inner;

        // Baseline, the scale's top value at the right, and a mid gridline with its value so the line can be read against numbers.
        hair.strokeStyle = firmLine;
        hair.beginPath(); hair.moveTo(plotX, y0 + lh + inner + 0.5); hair.lineTo(plotRight, y0 + lh + inner + 0.5); hair.stroke();
        // Gridlines with values at the left: the category boundaries on AQI (a fixed ruler), top and middle on the others.
        const gridValues = t === "aqi" ? AQI_CATEGORIES.map((k) => k.max).filter((v) => v <= max) : [Math.round(max / 1.08), Math.round(max / 2.16)];
        ctx.fillStyle = c.textMuted;
        for (const gv of gridValues) {
          const gy = yFor(gv);
          if (gv !== gridValues[0] || t !== "aqi") { hair.setLineDash([2, 5]); hair.beginPath(); hair.moveTo(plotX, gy + 0.5); hair.lineTo(plotRight, gy + 0.5); hair.stroke(); hair.setLineDash([]); }
          const lab = String(gv);
          ctx.fillText(lab, plotX - GRAPH.axisGutterPad - ctx.measureText(lab).width, gy + labelPx * 0.36); // in the gutter, right-aligned, centred on the gridline
        }

        // AQI: the scale bar at the right. One smooth gradient through the category colours, each colour placed at its own upper boundary so the transitions fall where the categories change; the marker sits at the value under the playhead.
        if (t === "aqi") {
          ctx.restore(); // draw outside the plot clip
          const barX = cssW - barW;
          const barTop = yFor(max), barBottom = yFor(0);
          const grad = ctx.createLinearGradient(0, barBottom, 0, barTop);
          for (const s of aqiScaleStops(max)) grad.addColorStop(s.offset, s.color);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(barX + 2, barTop, barW - 4, barBottom - barTop, (barW - 4) / 2);
          ctx.fill();
          const hi = playheadRef.current != null ? Math.min(n - 1, Math.floor(playheadRef.current)) : (() => { for (let i = n - 1; i >= 0; i--) if (vals[i] != null) return i; return -1; })();
          const cur = hi >= 0 ? vals[hi] : null;
          if (cur != null) {
            const my = yFor(cur);
            ctx.fillStyle = c.textPrimary;
            ctx.strokeStyle = c.bgPanel;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(barX + barW / 2, my, GRAPH.scaleBarMarker, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          }
          ctx.save(); ctx.beginPath(); ctx.rect(0, 0, plotRight + 1, cssH); ctx.clip();
        }

        // The area under the line: colour blends horizontally along the line (a stop at every hour's scale colour) AND fades vertically from each segment's own line height to the baseline. One fill carries one gradient, so this is two passes on an offscreen canvas — the vertical fades as an alpha mask, then the horizontal colour gradient drawn through it (source-in) — cached per tab, day and size, so the playhead's per-frame redraw does not rebuild it.
        const baseY = y0 + lh + inner;
        const areaKey = `${t}|${n}|${cssW}|${cssH}|${dpr}|${day[0]?.ts ?? ""}|${vals.map((v) => (v == null ? "" : Math.round(v * 10))).join(",")}`;
        let area = areaCache.current;
        if (!area || area.key !== areaKey) {
          const off = document.createElement("canvas");
          off.width = Math.round(plotW * dpr); off.height = bufH; // the plot's own device pixels, blitted 1:1 below
          const o = off.getContext("2d")!;
          o.setTransform(dpr, 0, 0, dpr, 0, 0);
          const alpha = t === "aqi" ? GRAPH.areaAlpha.aqi : GRAPH.areaAlpha.channel;
          // Pass 1: the mask — each hour segment fades from opaque at the line to transparent at the base.
          for (let i = 1; i < n; i++) {
            const va = vals[i - 1], vb = vals[i];
            if (va == null || vb == null) continue;
            // Segment edges on whole device pixels: adjacent segments then abut with neither an anti-aliased seam nor an overlap (the old ±0.5 px overlap made a double-alpha stripe at every hour, and it drifted from the hairlines). The line's own points stay fractional; only the fill's columns snap.
            const x0 = Math.round((i - 1) * colW * dpr) / dpr, x1 = Math.round(i * colW * dpr) / dpr;
            // The segment's top corners sit ON the line: the true points are at fractional x, so the y at each snapped edge is interpolated along the segment's own slope. Otherwise the fill's edge and the line diverge by up to half a pixel on steep parts.
            const xa = (i - 1) * colW, xb = i * colW;
            const yAt = (x: number) => yFor(va) + (yFor(vb) - yFor(va)) * ((x - xa) / (xb - xa));
            const ya = yAt(x0), yb = yAt(x1);
            const fade = o.createLinearGradient(0, Math.min(ya, yb), 0, baseY);
            fade.addColorStop(0, `rgba(0,0,0,${alpha})`);
            fade.addColorStop(1, "rgba(0,0,0,0)");
            o.fillStyle = fade;
            o.beginPath(); o.moveTo(x0, ya); o.lineTo(x1, yb); o.lineTo(x1, baseY); o.lineTo(x0, baseY); o.closePath(); o.fill();
          }
          // Pass 2: the colour, through the mask — the scale colour at every hour along the line, or white for the other tracks.
          o.globalCompositeOperation = "source-in";
          const colour = o.createLinearGradient(0, 0, plotW, 0);
          for (let i = 0; i < n; i++) {
            const v = vals[i];
            colour.addColorStop(Math.min(1, Math.max(0, (i * colW) / plotW)), v == null ? "rgba(255,255,255,0)" : t === "aqi" ? aqiScaleColor(v) : "rgb(255,255,255)");
          }
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

        // The line. AQI segments are gradients between the scale colour at each end — the same rule the bar is drawn with, so a point on the line and the bar at that height always match; the others are the secondary text colour.
        ctx.lineWidth = t === "aqi" ? GRAPH.lineWidth.aqi : GRAPH.lineWidth.channel;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        for (let i = 1; i < n; i++) {
          const a = vals[i - 1], b = vals[i];
          if (a == null || b == null) continue;
          const x0 = plotX + (i - 1) * colW, x1 = plotX + i * colW;
          if (t === "aqi") {
            const seg = ctx.createLinearGradient(x0, yFor(a), x1, yFor(b));
            seg.addColorStop(0, aqiScaleColor(a));
            seg.addColorStop(1, aqiScaleColor(b));
            ctx.strokeStyle = seg;
          } else ctx.strokeStyle = c.textSecondary;
          ctx.beginPath();
          ctx.moveTo(x0, yFor(a));
          ctx.lineTo(x1, yFor(b));
          ctx.stroke();
        }
        // Trailing hours not yet reported (a live channel AirNow has not published for the newest hours) hold the last value as a dotted flat line to the right edge: the line does not simply stop, and the dots say "not yet" rather than "zero".
        let lastIdx = -1;
        for (let i = n - 1; i >= 0; i--) if (vals[i] != null) { lastIdx = i; break; }
        if (lastIdx >= 0 && lastIdx < n - 1) {
          const v = vals[lastIdx]!;
          const y = yFor(v);
          ctx.save();
          ctx.setLineDash([2, 4]);
          ctx.lineWidth = 1;
          ctx.strokeStyle = t === "aqi" ? aqiScaleColor(v) : c.textMuted;
          ctx.beginPath(); ctx.moveTo(plotX + lastIdx * colW, y); ctx.lineTo(plotRight, y); ctx.stroke();
          ctx.restore();
        }
        // Isolated points (a reporting hour between two nulls) still show.
        for (let i = 0; i < n; i++) {
          const v = vals[i];
          if (v == null) continue;
          if ((i === 0 || vals[i - 1] == null) && (i === n - 1 || vals[i + 1] == null)) {
            ctx.fillStyle = t === "aqi" ? aqiScaleColor(v) : c.textSecondary;
            ctx.fillRect(plotX + i * colW - 1, yFor(v) - 1, 2, 2);
          }
        }
        ctx.restore(); // back to the wider clip, so the y values in the gutter stay drawable
        y0 += tabH;
      }

      // Pulse row: 16 steps per bar, 4 per hour; hit = a mark, rest = nothing, null bar = a faint dash across it. Each bar is labelled with its hit count. The mark under the playhead is lit for as long as the playhead is over its step — the row and the line share one clock. Hour i's steps run from reading i towards reading i+1, so the last reading's steps fall past the right edge (the hour after the last reading) and are not drawn.
      {
        const stepW = colW / STEPS_PER_HOUR;
        const ph = playheadRef.current;
        const currentStep = ph == null ? -1 : Math.floor((ph % 24) * STEPS_PER_HOUR);
        ctx.fillStyle = c.textMuted;
        ctx.fillText(TRACK_LABELS.pulse, plotX + 4, y0 + labelPx);
        for (let b = 0; b < series.barHits.length; b++) {
          const k = series.barHits[b];
          const label = k == null ? "—" : `${k}`;
          const bx = Math.min(plotRight, plotX + b * 4 * colW + 4 * colW) - ctx.measureText(label).width - 4;
          ctx.fillStyle = c.textMuted;
          ctx.fillText(label, bx, y0 + labelPx);
        }
        ctx.fillStyle = c.textSecondary;
        for (let s = 0; s < series.pulse.length; s++) {
          const v = series.pulse[s];
          const x = plotX + s * stepW;
          if (x >= plotRight) continue;
          if (v == null) {
            if (s % 16 === 0) { hair.fillStyle = firmLine; hair.fillRect(x, y0 + pulseH - 5, Math.min(colW * 4, plotRight - x), 1); }
            continue;
          }
          if (!v) continue;
          const lit = s === currentStep;
          ctx.fillStyle = lit ? c.textPrimary : c.textSecondary;
          const h = lit ? pulseH - lh - 2 : pulseH - lh - 6;
          // Marks sit at the START of their step, where the playhead is at the moment of the hit.
          ctx.fillRect(Math.round(x) , y0 + pulseH - 3 - h, lit ? 3 : 2, h);
        }
        y0 += pulseH;
      }

      // X axis: a tick at every reading, firmer at bar starts; two labels only — the first reading's date and time at the left ("Sep 14, 2:00 pm"; the year only when it is not this year) and "now" at the right when live, else the last reading's time. Hour numbers read as a 24-hour clock and confused the rolling live window.
      const axisY = cssH - axisH;
      hair.strokeStyle = firmLine;
      hair.beginPath(); hair.moveTo(plotX, axisY + 0.5); hair.lineTo(plotRight, axisY + 0.5); hair.stroke();
      // Every hairline is in the layer now; composite it once, BENEATH everything drawn so far (the line, the area, the pulse marks, the labels): the hairlines are the bottom of the stack and the line is the top. Clipped to the plot's right edge like the grid was, so nothing runs under the scale bar.
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, plotRight + 1, cssH); ctx.clip();
      ctx.globalAlpha = fa;
      ctx.globalCompositeOperation = "destination-over";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(hairCanvas, 0, 0);
      ctx.restore();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (n > 0) {
        ctx.fillStyle = c.textMuted;
        ctx.fillText(readingLabel(day[0].ts, true), plotX + 2, cssH - 5);
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
        // Clock time from the reading's own timestamp, not the index. The date joins it only on the live window, whose readings straddle two days ("Sep 14, 6:00 pm"); a chosen day already names its date in the axis label, so its chip is just "4:00 am".
        const parts: string[] = [readingLabel(day[hi].ts, live)];
        for (const t of lineTracks) { const v = series[t][hi]; parts.push(`${TRACK_LABELS[t]} ${v == null ? "—" : Math.round(v)}`); }
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
      if (playing) raf = requestAnimationFrame(draw);
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
  }, [series, day, playing, live, tab, c, running ? 0 : playheadHour]); // when held, redraw once per change of the held value

  return (
    <div ref={wrapRef} style={{ width: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div role="tablist" style={{ display: "flex", flex: "0 0 auto", gap: CONTROL.gap, height: `var(--ctl-inner, ${CONTROL.inner}px)`, marginBottom: space.xs, overflowX: "auto", whiteSpace: "nowrap" }}>
        {TRACK_ORDER.map((t) => {
          const active = t === tab;
          return (
            <button
              key={t}
              role="tab"
              aria-selected={active}
              onClick={() => onTab(t)}
              style={{
                fontFamily: families.data, fontSize: typeScale.caption.size, lineHeight: 1, cursor: "pointer",
                color: active ? c.textPrimary : c.textMuted,
                background: "none", border: "none", borderBottom: `2px solid ${active ? c.textPrimary : "transparent"}`,
                height: `var(--ctl-inner, ${CONTROL.inner}px)`, boxSizing: "border-box", padding: CONTROL.chipPad, flex: "0 0 auto",
              }}
            >
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
