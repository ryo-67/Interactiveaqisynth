// Scene — the full-bleed sky (D-19, §5.2). Everything drawn is data:
//   sky gradient = the clock hour under the playhead (SKY_STOPS, interpolated by beat fraction);
//   sun = the clock (real sunrise → solar noon → sunset for the day's date at NYC) with apex height scaled by the hour's normalized O3 — the melody's pitch, drawn;
//   haze = normalized PM2.5, smoothed by the engine with the tier's own α (particle density/size/drift + a color-temperature tint + contrast flattening toward the horizon);
//   city = a ground band whose window lights and traffic glow follow the bar's Euclidean k and flicker on the engine's pulse hits.
// One timing source: the engine's beat/pulse callbacks. Continuous drift runs on rAF and stops under prefers-reduced-motion (the sun still moves — it is the playhead). No clouds, no birds, no stars: nothing undriven.
import React, { useEffect, useMemo, useRef } from "react";
import {
  SKY_STOPS,
  HAZE_RAMP,
  PARTICLE_BUDGET,
  SUN,
  CITY,
  NYC_LAT,
  NYC_LON,
} from "../utils/theme";
import { normalize, type PollutantAnchors } from "../engine/contour";
import { barK } from "../engine/euclid";
import type { BeatInfo, Day } from "../engine/SynthEngine";
import { solarTimes, tzOffsetFromTs, type SolarTimes } from "./solar";

interface Props {
  day: Day;
  anchors: PollutantAnchors;
  beat: BeatInfo | null;
  restHour: number; // scene hour when not playing
  pulseFlashRef: React.MutableRefObject<number>; // performance.now() of the last pulse hit
  onFrame?: (dtMs: number) => void; // frame-time sampler (dev)
}

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function lerpHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return `rgb(${Math.round(lerp(ar, br, t))},${Math.round(lerp(ag, bg, t))},${Math.round(lerp(ab, bb, t))})`;
}
function rampColor(t: number): string {
  // HAZE_RAMP: clear → white-gray → amber, driven by PM2.5 (never tier).
  const s = HAZE_RAMP.stops;
  return t < 0.5 ? lerpHex(s[0], s[1], t * 2) : lerpHex(s[1], s[2], (t - 0.5) * 2);
}
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BEAT_MS = 60000 / 90;

export function Scene({ day, anchors, beat, restHour, pulseFlashRef, onFrame }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beatAtRef = useRef<{ beat: BeatInfo | null; at: number }>({ beat: null, at: 0 });
  const reducedMotion = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  useEffect(() => {
    beatAtRef.current = { beat, at: performance.now() };
  }, [beat]);

  // Per-hour data and solar times, recomputed only when the day changes.
  const model = useMemo(() => {
    const hours = day.map((h) => ({
      clockHour: Number(h.ts.slice(11, 13)),
      date: h.ts.slice(0, 10),
      o3n: normalize(h.o3, anchors.o3),
      pm25n: normalize(h.pm25 == null ? null : Math.max(0, h.pm25), anchors.pm25),
    }));
    const ks: Array<number | null> = [];
    for (let b = 0; b < Math.ceil(day.length / 4); b++) {
      ks.push(barK(day.slice(b * 4, b * 4 + 4).map((h) => normalize(h.no2, anchors.no2))));
    }
    // A rolling live window spans two dates; solar times per distinct date.
    const solarByDate = new Map<string, SolarTimes>();
    for (const h of hours) {
      if (!solarByDate.has(h.date)) {
        solarByDate.set(h.date, solarTimes(h.date, NYC_LAT, NYC_LON, tzOffsetFromTs(day[0].ts)));
      }
    }
    return { hours, ks, solarByDate };
  }, [day, anchors]);

  // Particle field: seeded once at full budget; density decides how many are drawn each frame.
  const particles = useMemo(() => {
    const rnd = mulberry32(1379);
    const budget = window.innerWidth < 768 ? PARTICLE_BUDGET.phone : PARTICLE_BUDGET.laptop;
    return Array.from({ length: budget }, () => ({
      x: rnd(), y: rnd(), r: 0.6 + rnd() * 1.8, speed: 0.2 + rnd() * 0.8, alpha: 0.2 + rnd() * 0.5,
    }));
  }, []);

  // City blocks: seeded abstract silhouette (O-15: varied blocks, not a skyline logo), with per-block window grids.
  const blocks = useMemo(() => {
    const rnd = mulberry32(40718);
    let x = 0;
    const out: Array<{ x: number; w: number; h: number; windows: Array<{ wx: number; wy: number; on: number }> }> = [];
    while (x < 1) {
      const w = 0.02 + rnd() * 0.045;
      const h = 0.25 + rnd() * 0.75;
      const windows: Array<{ wx: number; wy: number; on: number }> = [];
      const cols = Math.max(1, Math.floor(w * 90));
      const rows = Math.max(2, Math.floor(h * 9));
      for (let cx = 0; cx < cols; cx++) for (let cy = 0; cy < rows; cy++) {
        windows.push({ wx: (cx + 0.5) / cols, wy: (cy + 0.5) / rows, on: rnd() });
      }
      out.push({ x, w, h, windows });
      x += w + 0.004 + rnd() * 0.012;
    }
    return out;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    const draw = (now: number) => {
      onFrame?.(now - last);
      last = now;

      const W = window.innerWidth;
      const H = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
        canvas.width = W * dpr;
        canvas.height = H * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // ——— playhead position: engine beat + fraction, or the rest hour ———
      const { beat: b, at } = beatAtRef.current;
      const playing = b != null;
      const hourIdx = playing ? b.hour : Math.min(restHour, model.hours.length - 1);
      const frac = playing ? Math.min(1, (now - at) / BEAT_MS) : 0;
      const cur = model.hours[hourIdx];
      const nxt = model.hours[(hourIdx + 1) % model.hours.length];
      if (!cur) { raf = requestAnimationFrame(draw); return; }

      // Continuous clock time between this column's hour and the next (rolling windows wrap 23 → 0).
      let clockT = cur.clockHour + frac * (((nxt.clockHour - cur.clockHour) % 24 + 24) % 24 || 1);
      clockT %= 24;

      // haze density: the engine's smoothed value while playing; the hour's own value at rest
      const hazeRaw = playing ? (b!.pm25nSmoothed ?? 0) : (cur.pm25n ?? 0);
      const haze = Math.min(1.5, hazeRaw) / 1.5; // 0..1, saturating above p95 the way the detune does

      // ——— sky: 24-stop gradient, interpolated by beat fraction ———
      const s0 = SKY_STOPS[Math.floor(clockT) % 24];
      const s1 = SKY_STOPS[(Math.floor(clockT) + 1) % 24];
      const st = clockT - Math.floor(clockT);
      const horizonY = H * (1 - CITY.bandFrac);
      // PM2.5 shifts the whole sky's temperature toward the haze ramp (§5.2 item 2).
      const tintT = haze;
      const tint = rampColor(tintT);
      const grad = ctx.createLinearGradient(0, 0, 0, horizonY);
      grad.addColorStop(0, lerpHex(s0[0], s1[0], st));
      grad.addColorStop(0.55, lerpHex(s0[1], s1[1], st));
      grad.addColorStop(1, lerpHex(s0[2], s1[2], st));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // ——— sun: clock-driven arc, O3-scaled apex (§5.2 item 1 as amended) ———
      const solar = model.solarByDate.get(cur.date) ?? [...model.solarByDate.values()][0];
      const dayLen = solar.sunset - solar.sunrise;
      const p = (clockT - solar.sunrise) / dayLen;
      if (p >= 0 && p <= 1) {
        const o3nNow = cur.o3n != null && nxt.o3n != null ? lerp(cur.o3n, nxt.o3n, frac) : cur.o3n;
        const o3c = o3nNow == null ? 0 : Math.min(1, o3nNow);
        const sunX = p * W;
        const apex = (horizonY - H * (1 - SUN.apexFrac)) * o3c;
        const sunY = horizonY - Math.sin(Math.PI * p) * apex;
        const r = SUN.radiusFrac * Math.min(W, H);
        // The sun's own color follows the sky stop's warmth: white blended toward the horizon color of the current stop.
        const warm = lerpHex("#ffffff", s0[2], 0.45);
        const nullO3 = o3nNow == null;
        const alpha = nullO3 ? SUN.nightDim : 1; // §4.4: a null hour dims the sun and drops its bloom; measured zero keeps the bloom, low
        if (!nullO3) {
          const bloom = ctx.createRadialGradient(sunX, sunY, r * 0.4, sunX, sunY, r * SUN.bloomScale);
          bloom.addColorStop(0, `rgba(255,240,214,${SUN.bloomAlpha})`);
          bloom.addColorStop(1, "rgba(255,240,214,0)");
          ctx.fillStyle = bloom;
          ctx.fillRect(sunX - r * SUN.bloomScale, sunY - r * SUN.bloomScale, r * SUN.bloomScale * 2, r * SUN.bloomScale * 2);
        }
        const disc = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, r);
        disc.addColorStop(0, warm);
        disc.addColorStop(0.75, warm);
        disc.addColorStop(1, "rgba(255,255,255,0)");
        ctx.globalAlpha = alpha;
        ctx.fillStyle = disc;
        ctx.beginPath();
        ctx.arc(sunX, sunY, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // ——— haze: particles + tint + contrast flattening (§5.2 item 2) ———
      const count = Math.round(particles.length * haze);
      if (count > 0) {
        const drift = reducedMotion ? 0 : now / 1000;
        ctx.fillStyle = rampColor(Math.min(1, tintT + 0.2));
        for (let i = 0; i < count; i++) {
          const pt = particles[i];
          const px = ((pt.x + drift * pt.speed * 0.01) % 1) * W;
          const py = pt.y * horizonY;
          ctx.globalAlpha = pt.alpha * (0.3 + 0.7 * haze);
          ctx.fillRect(px, py, pt.r * (1 + haze), pt.r * (1 + haze));
        }
        ctx.globalAlpha = 1;
      }
      if (haze > 0.02) {
        // full-screen color-temperature tint, capped so the sun stays visible
        ctx.globalAlpha = HAZE_RAMP.tintAlphaCap * haze;
        ctx.fillStyle = tint;
        ctx.fillRect(0, 0, W, H);
        // visibility falloff: contrast flattens toward the horizon
        const flat = ctx.createLinearGradient(0, H * 0.35, 0, horizonY);
        flat.addColorStop(0, "rgba(0,0,0,0)");
        flat.addColorStop(1, tint.replace("rgb", "rgba").replace(")", `,${HAZE_RAMP.contrastFlattenCap * haze})`));
        ctx.globalAlpha = 1;
        ctx.fillStyle = flat;
        ctx.fillRect(0, H * 0.35, W, horizonY - H * 0.35);
      }
      ctx.globalAlpha = 1;

      // ——— city: NO2's ground band (§5.2 item 3) ———
      const k = model.ks[Math.floor(hourIdx / 4)] ?? null;
      const kFrac = k == null ? 0 : k / 11;
      const bandTop = horizonY;
      const flash = now - pulseFlashRef.current < CITY.flashMs ? 1 : 0;
      // ground strip only; the sky shows between blocks so the varied silhouette reads as a skyline
      ctx.fillStyle = CITY.silhouette;
      ctx.fillRect(0, H - (H - bandTop) * 0.12, W, (H - bandTop) * 0.12);
      for (const blk of blocks) {
        const bx = blk.x * W;
        const bw = blk.w * W;
        const bh = blk.h * (H - bandTop);
        const by = H - bh;
        ctx.fillStyle = CITY.silhouette;
        ctx.fillRect(bx, by, bw, bh);
        // window lights: lit fraction follows the bar's k; flicker brightens on the hit
        const litFrac = k == null ? 0 : 0.12 + 0.55 * kFrac;
        ctx.fillStyle = CITY.lightColor;
        for (const wdw of blk.windows) {
          if (wdw.on < litFrac) {
            ctx.globalAlpha = (0.35 + 0.4 * kFrac) * (flash ? 1.7 : 1);
            ctx.fillRect(bx + wdw.wx * bw - 0.8, by + wdw.wy * bh - 0.8, 1.6, 1.6);
          }
        }
        ctx.globalAlpha = 1;
      }
      // traffic glow along the base, intensity by k, brighter on the hit
      if (k != null) {
        const glow = ctx.createLinearGradient(0, H - 14, 0, H);
        const gAlpha = (0.1 + 0.35 * kFrac) * (flash ? 1.6 : 1);
        glow.addColorStop(0, "rgba(232,160,90,0)");
        glow.addColorStop(1, `rgba(232,160,90,${Math.min(0.7, gAlpha)})`);
        ctx.fillStyle = glow;
        ctx.fillRect(0, H - 14, W, 14);
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [model, particles, blocks, restHour, reducedMotion, pulseFlashRef, onFrame]);

  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", display: "block" }} />;
}
