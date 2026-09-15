// Graph — the day as four labelled tracks on one hour-aligned x-scale, the pulse row beneath, one playhead through all of it (§5.3 score panel, rebuilt). Replaces Score.
// Tracks: AQI (from PM2.5, coloured per EPA category, D-23), PM2.5 µg/m³, O3 ppb, NO2 ppb — each with its unit and its own right-edge scale, lines through hourly points, gaps where the hour is null (§4.4 rest). The pulse row draws the engine's exact 16-step pattern per four-hour bar (graphPulse.ts), four steps under every hour column; a hit brightens when the engine fires it.
// One clock: the playhead is the session's eased hour — the same number that moves the sun — so nothing here steps on its own. Toggles show or hide tracks; state is the caller's.
import React, { useEffect, useMemo, useRef } from "react";
import { useTheme, themeColors, families, typeScale, space, aqiCategoryColor, AQI_CATEGORIES, GRAPH } from "../utils/theme";
import { AQI_CATEGORY_NAMES, TRACK_LABELS, TRACK_UNITS } from "../content";
import { pmToAQISeries } from "./graphSeries";
import { pulseSteps, STEPS_PER_HOUR } from "./graphPulse";
import type { PollutantAnchors } from "../engine/contour";
import type { Day, PulseInfo } from "../engine/SynthEngine";

export type TrackKey = "aqi" | "pm25" | "o3" | "no2" | "pulse";
export const TRACK_ORDER: TrackKey[] = ["aqi", "pm25", "o3", "no2", "pulse"];

interface Props {
  day: Day;
  anchors: PollutantAnchors;
  playheadHour: number | null; // eased, fractional; null = at rest
  live: boolean;
  tracks: Record<TrackKey, boolean>;
  onToggleTrack: (t: TrackKey) => void;
  subscribePulse: (cb: (p: PulseInfo) => void) => () => void;
  onToggle: () => void; // tap the graph to play or pause
}

export function Graph({ day, anchors, playheadHour, live, tracks, onToggleTrack, subscribePulse, onToggle }: Props) {
  const theme = useTheme();
  const c = themeColors(theme);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const lastPulse = useRef<{ index: number; at: number } | null>(null);
  // The playhead changes every frame; it goes through a ref so the draw effect — which owns the canvas size, the observer and the animation loop — is not torn down and rebuilt sixty times a second.
  const playheadRef = useRef<number | null>(playheadHour);
  playheadRef.current = playheadHour;
  const playing = playheadHour != null;

  const series = useMemo(() => ({
    aqi: pmToAQISeries(day),
    pm25: day.map((h) => (h.pm25 == null ? null : Math.max(0, h.pm25))),
    o3: day.map((h) => h.o3),
    no2: day.map((h) => h.no2),
    pulse: pulseSteps(day, anchors),
  }), [day, anchors]);

  // PulseInfo.step is the sixteenth within the current bar (0..15); the row's index is bar·16 + step, the bar being hour ÷ 4.
  useEffect(() => subscribePulse((p) => {
    lastPulse.current = { index: Math.floor(p.hour / 4) * 16 + p.step, at: performance.now() };
  }), [subscribePulse]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;

    const draw = () => {
      const cssW = wrap.clientWidth;
      const isPhone = cssW < 480;
      const trackH = isPhone ? GRAPH.trackHeight.phone : GRAPH.trackHeight.laptop;
      const pulseH = isPhone ? GRAPH.pulseRowHeight.phone : GRAPH.pulseRowHeight.laptop;
      const shown = TRACK_ORDER.filter((t) => tracks[t]);
      const lineTracks = shown.filter((t) => t !== "pulse") as Exclude<TrackKey, "pulse">[];
      const cssH = GRAPH.labelGutter + lineTracks.length * trackH + (tracks.pulse ? pulseH : 0) + GRAPH.axisHeight;
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
        canvas.width = cssW * dpr;
        canvas.height = cssH * dpr;
        canvas.style.height = `${cssH}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      const n = day.length;
      const colW = cssW / n;
      const micro = `${parseInt(typeScale.micro.size)}px ${families.data}`;
      ctx.font = micro;

      // Hour grid: a faint tick per hour through everything, a firmer one per four-hour bar (the pulse's bar lines).
      for (let i = 0; i <= n; i++) {
        const x = Math.round(i * colW) + 0.5;
        ctx.strokeStyle = i % 4 === 0 ? c.textFaint : "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, GRAPH.labelGutter); ctx.lineTo(x, cssH - GRAPH.axisHeight); ctx.stroke();
      }

      // Tracks.
      let y0 = GRAPH.labelGutter;
      const trackTop: Partial<Record<TrackKey, number>> = {};
      for (const t of lineTracks) {
        trackTop[t] = y0;
        const vals = series[t];
        const present = vals.filter((v): v is number => v != null);
        // Scale: the track's own max, floored so a quiet day is not stretched to look dramatic. AQI floors at 100 (the Moderate line stays in the same place day to day).
        const floor = t === "aqi" ? 100 : t === "pm25" ? 20 : t === "o3" ? 40 : 30;
        const max = Math.max(floor, ...present) * 1.08;
        const inner = trackH - 14;
        const yFor = (v: number) => y0 + 12 + (1 - v / max) * inner;

        // Baseline and label.
        ctx.strokeStyle = c.textFaint;
        ctx.beginPath(); ctx.moveTo(0, y0 + 12 + inner + 0.5); ctx.lineTo(cssW, y0 + 12 + inner + 0.5); ctx.stroke();
        ctx.fillStyle = c.textMuted;
        ctx.fillText(`${TRACK_LABELS[t]}${TRACK_UNITS[t] ? ` ${TRACK_UNITS[t]}` : ""}`, 4, y0 + 9);
        const maxLabel = String(Math.round(max / 1.08));
        ctx.fillStyle = c.textFaint;
        ctx.fillText(maxLabel, cssW - ctx.measureText(maxLabel).width - 4, y0 + 9);

        // AQI: the category lines that fall inside the scale, in their own colours, faint.
        if (t === "aqi") {
          for (const cat of AQI_CATEGORIES) {
            if (cat.max >= max) break;
            ctx.strokeStyle = cat.color + "55";
            ctx.setLineDash([2, 4]);
            ctx.beginPath(); ctx.moveTo(0, yFor(cat.max) + 0.5); ctx.lineTo(cssW, yFor(cat.max) + 0.5); ctx.stroke();
            ctx.setLineDash([]);
          }
        }

        // The line. AQI is coloured per segment by the category of its higher end; the others are the secondary text colour.
        ctx.lineWidth = t === "aqi" ? GRAPH.lineWidth.aqi : GRAPH.lineWidth.channel;
        ctx.lineJoin = "round";
        for (let i = 1; i < n; i++) {
          const a = vals[i - 1], b = vals[i];
          if (a == null || b == null) continue;
          ctx.strokeStyle = t === "aqi" ? aqiCategoryColor(Math.max(a, b)) : c.textSecondary;
          ctx.beginPath();
          ctx.moveTo((i - 1) * colW + colW / 2, yFor(a));
          ctx.lineTo(i * colW + colW / 2, yFor(b));
          ctx.stroke();
        }
        // Isolated points (a reporting hour between two nulls) still show.
        for (let i = 0; i < n; i++) {
          const v = vals[i];
          if (v == null) continue;
          if ((i === 0 || vals[i - 1] == null) && (i === n - 1 || vals[i + 1] == null)) {
            ctx.fillStyle = t === "aqi" ? aqiCategoryColor(v) : c.textSecondary;
            ctx.fillRect(i * colW + colW / 2 - 1, yFor(v) - 1, 2, 2);
          }
        }
        y0 += trackH;
      }

      // Pulse row: 16 steps per bar, 4 per hour; hit = a mark, rest = nothing, null bar = a faint dash across it.
      if (tracks.pulse) {
        trackTop.pulse = y0;
        const stepW = colW / STEPS_PER_HOUR;
        const now = performance.now();
        ctx.fillStyle = c.textMuted;
        ctx.fillText(TRACK_LABELS.pulse, 4, y0 + 9);
        for (let s = 0; s < series.pulse.length; s++) {
          const v = series.pulse[s];
          const x = s * stepW;
          if (v == null) {
            if (s % 16 === 0) { ctx.fillStyle = c.textFaint; ctx.fillRect(x, y0 + pulseH - 5, colW * 4, 1); }
            continue;
          }
          if (!v) continue;
          const fresh = lastPulse.current && lastPulse.current.index === s && now - lastPulse.current.at < GRAPH.pulseFlashMs;
          ctx.fillStyle = fresh ? c.textPrimary : c.textSecondary;
          const h = fresh ? pulseH - 8 : pulseH - 11;
          ctx.fillRect(Math.round(x + stepW / 2) - 1, y0 + pulseH - 4 - h, 2, h);
        }
        y0 += pulseH;
      }

      // X axis: a tick every hour, a label every three, "now" at the right edge when live.
      const axisY = cssH - GRAPH.axisHeight;
      ctx.strokeStyle = c.textFaint;
      ctx.beginPath(); ctx.moveTo(0, axisY + 0.5); ctx.lineTo(cssW, axisY + 0.5); ctx.stroke();
      for (let i = 0; i < n; i++) {
        const x = Math.round(i * colW) + 0.5;
        ctx.beginPath(); ctx.moveTo(x, axisY); ctx.lineTo(x, axisY + (i % 3 === 0 ? 5 : 3)); ctx.stroke();
        if (i % 3 === 0) { ctx.fillStyle = c.textFaint; ctx.fillText(String(i), x + 2, cssH - 4); }
      }
      if (live) { const label = "now"; ctx.fillStyle = c.textFaint; ctx.fillText(label, cssW - ctx.measureText(label).width - 2, cssH - 4); }

      // Playhead: the eased hour, one line through every track, with the hour's values printed at its head.
      const playheadHour = playheadRef.current;
      if (playheadHour != null && n > 0) {
        const x = Math.min(cssW - 0.5, playheadHour * colW);
        ctx.strokeStyle = c.textPrimary;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, GRAPH.labelGutter); ctx.lineTo(x, axisY); ctx.stroke();
        const hi = Math.min(n - 1, Math.floor(playheadHour));
        const parts: string[] = [`${hi}h`];
        for (const t of lineTracks) { const v = series[t][hi]; parts.push(`${TRACK_LABELS[t]} ${v == null ? "—" : Math.round(v)}`); }
        const label = parts.join(" · ");
        const w = ctx.measureText(label).width + 8;
        const lx = x + 6 + w > cssW ? x - 6 - w : x + 6;
        ctx.fillStyle = "rgba(5,5,10,0.72)";
        ctx.fillRect(lx, GRAPH.labelGutter, w, 14);
        ctx.fillStyle = c.textPrimary;
        ctx.fillText(label, lx + 4, GRAPH.labelGutter + 10);
      }

      if (playing) raf = requestAnimationFrame(draw);
    };

    draw();
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); draw(); });
    ro.observe(wrap);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [series, day, playing, live, tracks, c]);

  return (
    <div ref={wrapRef} style={{ width: "100%" }}>
      <div style={{ display: "flex", gap: space.sm, flexWrap: "wrap", marginBottom: space.xs }}>
        {TRACK_ORDER.map((t) => (
          <button
            key={t}
            onClick={() => onToggleTrack(t)}
            aria-pressed={tracks[t]}
            style={{
              fontFamily: families.data, fontSize: typeScale.micro.size, cursor: "pointer",
              color: tracks[t] ? c.textPrimary : c.textMuted,
              background: tracks[t] ? "rgba(255,255,255,0.14)" : "none",
              border: `1px solid ${tracks[t] ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.14)"}`,
              borderRadius: 999, padding: "2px 8px",
            }}
          >
            {TRACK_LABELS[t]}
          </button>
        ))}
      </div>
      <canvas ref={canvasRef} onClick={onToggle} style={{ width: "100%", display: "block", cursor: "pointer" }} aria-label="24-hour graph; click to play or pause" />
      {tracks.aqi && (
        <div style={{ display: "flex", gap: space.sm, flexWrap: "wrap", marginTop: space.xs, fontFamily: families.data, fontSize: typeScale.micro.size, color: c.textMuted }}>
          {AQI_CATEGORIES.map((cat, i) => (
            <span key={cat.max} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, background: cat.color, borderRadius: 2, display: "inline-block" }} />
              {i === 0 ? 0 : AQI_CATEGORIES[i - 1].max + 1}–{cat.max} {AQI_CATEGORY_NAMES[i]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
