// SmokeLayer — the wildfire plume (D-20). Not a sky-model parameter: a sky model renders clear air with more aerosol suspended in it, whereas June 7 was a plume between the observer and the sky. Those are different physical situations, so the plume is composited above the sky.
// MAPPING (PM2.5 → veil/plume): normalized PM2.5 drives density; with density the veil's character moves from white-grey haze (ordinary particulate whitens the sky) to orange smoke (wildfire particles absorb blue). Two composited terms, because that is what particulate does to the light that reaches the eye:
//   attenuation (multiply) — the sky behind is dimmed and its blue is absorbed;
//   in-scatter (screen)    — the plume adds sunlight it scatters toward the viewer, which is what makes smoke read as luminous brown rather than as a dim blue sky.
// Density is horizon-weighted: the sight-line through the plume is longest low in the frame.
import React from "react";
import { SMOKE } from "../utils/theme";

interface Props {
  density: number; // 0..1, normalized PM2.5 — how much veil
  regime?: number; // 0..1 — white haze to orange smoke, from absolute PM2.5 via smokeRegime(); eased by the caller so in and out take the same curve
  hueDeg?: number; // override for tuning; defaults to the token
}

// 0 = white haze, 1 = orange smoke, from absolute PM2.5.
export function smokeRegime(pm25: number | null | undefined): number {
  if (pm25 == null) return 0;
  return Math.max(0, Math.min(1, (pm25 - SMOKE.orange.fromUgm3) / (SMOKE.orange.toUgm3 - SMOKE.orange.fromUgm3)));
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const STOPS = [0, 0.35, 0.62, 0.82, 1];

// One stop of either term at vertical fraction t (0 top, 1 bottom): hue, saturation, lightness (0..1) and alpha. The gradient strings below are built from it, and panelLuminance.ts evaluates it at a panel's band, so the predicted panel and the drawn plume can never disagree.
export function smokeStop(kind: "attenuation" | "inscatter", density: number, regime: number, t: number, hueDeg: number = SMOKE.hueDeg): { h: number; s: number; l: number; a: number } {
  const d = Math.max(0, Math.min(1, density)), r = Math.max(0, Math.min(1, regime));
  const h = hueDeg + SMOKE.hueDriftDeg * r;
  const strength = Math.pow(d, SMOKE.curve); // steeper at the low end: a normal day is visibly hazy
  const weight = SMOKE.zenithFactor + (1 - SMOKE.zenithFactor) * Math.pow(t, SMOKE.horizonBias);
  if (kind === "attenuation") {
    // A light warm tint that strips blue, deepening a little toward the horizon. Kept light on purpose — this term must not carry the darkening.
    return { h, s: lerp(SMOKE.attenuation.saturation.thin, SMOKE.attenuation.saturation.thick, r), l: lerp(SMOKE.attenuation.lightness.thin, SMOKE.attenuation.lightness.thick, Math.pow(t, 0.8) * r), a: SMOKE.attenuation.alphaMax * strength * weight };
  }
  // The plume's own light. Bright orange-tan overhead, deeper and more saturated toward the horizon where the path is longest.
  const v = Math.pow(t, 1.4);
  const thin = lerp(SMOKE.inscatter.lightness.thin.zenith, SMOKE.inscatter.lightness.thin.horizon, v);
  const thick = lerp(SMOKE.inscatter.lightness.thick.zenith, SMOKE.inscatter.lightness.thick.horizon, v);
  return { h, s: lerp(SMOKE.inscatter.saturation.thin, SMOKE.inscatter.saturation.thick, r), l: lerp(thin, thick, r), a: SMOKE.inscatter.alphaMax * strength * weight };
}

function ramp(kind: "attenuation" | "inscatter", d: number, r: number, hueDeg?: number): string {
  const parts = STOPS.map((t) => {
    const c = smokeStop(kind, d, r, t, hueDeg);
    return `hsla(${c.h.toFixed(1)}, ${(c.s * 100).toFixed(0)}%, ${(c.l * 100).toFixed(0)}%, ${c.a.toFixed(3)}) ${(t * 100).toFixed(0)}%`;
  });
  return `linear-gradient(to bottom, ${parts.join(", ")})`;
}

export const SmokeLayer = React.memo(function SmokeLayer({ density, regime = 0, hueDeg }: Props) {
  const d = Math.max(0, Math.min(1, density));
  if (d <= 0.001) return null;
  const r = Math.max(0, Math.min(1, regime)); // colour follows the regime; alpha follows density

  // Absolute, not fixed: the scene owns its own box above the control bar, so the plume's densest band stays visible.
  const base: React.CSSProperties = { position: "absolute", inset: 0, pointerEvents: "none" };
  const attenuation = ramp("attenuation", d, r, hueDeg);
  const inscatter = ramp("inscatter", d, r, hueDeg);

  return (
    <>
      <div aria-hidden style={{ ...base, background: attenuation, mixBlendMode: "multiply" }} />
      <div aria-hidden style={{ ...base, background: inscatter, mixBlendMode: "screen" }} />
    </>
  );
}, (a, b) => Math.round(a.density * 200) === Math.round(b.density * 200) && Math.round((a.regime ?? 0) * 100) === Math.round((b.regime ?? 0) * 100) && a.hueDeg === b.hueDeg);
