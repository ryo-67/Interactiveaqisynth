// Score — the picture is the thing being played (§5.1, §5.2 item 4). One canvas, one column per hour of the loaded day (24 normally; DST days genuinely have 23 or 25 — logged §5 deviation).
// O3 contour: 1.5 px line in the tier color at medium opacity — the melody's shape. NO2: pulse marks at each column's foot, height by the bar's Euclidean k, so four consecutive columns share a height — the pulse's density. PM2.5: a haze of slowly drifting grain, per-column density by normalized PM2.5 — the particulate fog. Borrowed channels are drawn identically; the source line discloses them.
// The playhead advances one column per beat, driven only by the engine's onBeat report — no second timing source. Haze drift is the one continuous motion (§5.4: it is particulate, not rhythmic). Clicking the score toggles play.
import React, { useEffect, useMemo, useRef } from "react";
import { useTheme, themeColors, families, typeScale, space, motion, tierColorAt } from "../utils/theme";
import { SCORE_LEGEND } from "../content";
import { normalize, type PollutantAnchors } from "../engine/contour";
import { barK } from "../engine/euclid";
import type { Day } from "../engine/SynthEngine";

interface Props {
  day: Day;
  anchors: PollutantAnchors;
  tierIndex: number;
  playheadHour: number | null; // null = not playing
  live: boolean;
  onToggle: () => void;
}

// Deterministic per-column PRNG so the grain field is stable across frames and re-renders.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function Score({ day, anchors, tierIndex, playheadHour, live, onToggle }: Props) {
  const theme = useTheme();
  const c = themeColors(theme);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fadeRef = useRef<{ img: HTMLCanvasElement | null; started: number }>({ img: null, started: 0 });
  const prevDayRef = useRef<Day | null>(null);

  // Per-column data, normalized with the same functions the engine plays (§3.10).
  const columns = useMemo(() => {
    const ks: Array<number | null> = [];
    for (let b = 0; b < Math.ceil(day.length / 4); b++) {
      ks.push(barK(day.slice(b * 4, b * 4 + 4).map((h) => normalize(h.no2, anchors.no2))));
    }
    return day.map((h, i) => ({
      o3n: normalize(h.o3, anchors.o3),
      pm25n: normalize(h.pm25 == null ? null : Math.max(0, h.pm25), anchors.pm25),
      k: ks[Math.floor(i / 4)],
    }));
  }, [day, anchors]);

  // Crossfade the previous drawing out over 300 ms on day/borough change (§5.4).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (prevDayRef.current && prevDayRef.current !== day && canvas) {
      if (canvas.width > 0) {
        const snap = document.createElement("canvas");
        snap.width = canvas.width;
        snap.height = canvas.height;
        snap.getContext("2d")!.drawImage(canvas, 0, 0);
        fadeRef.current = { img: snap, started: performance.now() };
      }
    }
    prevDayRef.current = day;
  }, [day]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const draw = (now: number) => {
      const isPhone = window.innerWidth < 768;
      const cssW = wrap.clientWidth;
      const cssH = isPhone ? 140 : 220;
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
        canvas.width = cssW * dpr;
        canvas.height = cssH * dpr;
        canvas.style.height = `${cssH}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      const n = columns.length;
      const colW = cssW / n;
      const padTop = 14;
      const footH = 16; // hour-mark strip
      const pulseMax = cssH * 0.18;
      const fieldH = cssH - padTop - footH;

      // PM2.5 haze: drifting grain, density per column (§5.3: grain in the ground color, no flat fill).
      ctx.fillStyle = c.textMuted;
      for (let i = 0; i < n; i++) {
        const d = columns[i].pm25n;
        if (d == null) continue;
        const count = Math.round((Math.min(1.5, d) / 1.5) * 34);
        const rnd = mulberry32(i * 7919 + n);
        for (let p = 0; p < count; p++) {
          const px = i * colW + rnd() * colW;
          const speed = motion.driftPxPerSec * (0.5 + rnd());
          const py = padTop + ((rnd() * fieldH + (now / 1000) * speed) % fieldH);
          ctx.globalAlpha = 0.25 + rnd() * 0.5;
          ctx.fillRect(px, py, 1.2, 1.2);
        }
      }
      ctx.globalAlpha = 1;

      // NO2 pulse marks at the column feet, height by the bar's k (0 when the bar is silent).
      ctx.fillStyle = c.textSecondary;
      for (let i = 0; i < n; i++) {
        const k = columns[i].k;
        if (k == null) continue;
        const h = (k / 11) * pulseMax;
        ctx.fillRect(i * colW + colW / 2 - 1, padTop + fieldH - h, 2, h);
      }

      // O3 contour: 1.5 px line in the tier color at medium opacity, gaps where the hour is null (§4.4 rest).
      ctx.strokeStyle = tierColorAt(tierIndex, "medium");
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i < n; i++) {
        const v = columns[i].o3n;
        if (v == null) { pen = false; continue; }
        const x = i * colW + colW / 2;
        const y = padTop + (1 - Math.min(1, v)) * fieldH;
        if (pen) ctx.lineTo(x, y);
        else { ctx.moveTo(x, y); pen = true; }
      }
      ctx.stroke();

      // Playhead: 1 px, tier color medium, one column per beat from the engine's report.
      if (playheadHour != null && playheadHour < n) {
        const x = Math.round(playheadHour * colW) + 0.5;
        ctx.strokeStyle = tierColorAt(tierIndex, "medium");
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, padTop);
        ctx.lineTo(x, padTop + fieldH);
        ctx.stroke();
      }

      // Hour marks at 0, 6, 12, 18; "now" at the right edge for live.
      ctx.fillStyle = c.textFaint;
      ctx.font = `${parseInt(typeScale.micro.size)}px ${families.data}`;
      for (const hMark of [0, 6, 12, 18]) {
        if (hMark < n) ctx.fillText(String(hMark), hMark * colW + 2, cssH - 4);
      }
      if (live) {
        const label = "now";
        ctx.fillText(label, cssW - ctx.measureText(label).width - 2, cssH - 4);
      }

      // Crossfade tail of the previous day's drawing.
      const fade = fadeRef.current;
      if (fade.img) {
        const t = (now - fade.started) / motion.crossfadeMs;
        if (t < 1) {
          ctx.globalAlpha = 1 - t;
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.drawImage(fade.img, 0, 0);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.globalAlpha = 1;
        } else {
          fadeRef.current = { img: null, started: 0 };
        }
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [columns, tierIndex, playheadHour, live, c.textMuted, c.textSecondary, c.textFaint]);

  return (
    <div ref={wrapRef}>
      <canvas
        ref={canvasRef}
        onClick={onToggle}
        style={{ width: "100%", display: "block", cursor: "pointer" }}
        aria-label="24-hour score; click to play or pause"
      />
      <div
        style={{
          fontFamily: families.uiCaps,
          fontSize: typeScale.micro.size,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: c.textFaint,
          marginTop: space.xs,
        }}
      >
        {SCORE_LEGEND}
      </div>
    </div>
  );
}
