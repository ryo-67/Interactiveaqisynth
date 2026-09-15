// SmokeLayer — the wildfire plume (D-20). Not a sky-model parameter: a sky model renders clear air with more aerosol suspended in it, whereas June 7 was a plume between the observer and the sky. Those are different physical situations, so the plume is composited above the sky.
// MAPPING (PM2.5 → veil/plume): normalized PM2.5 drives density; with density the veil's character moves from white-grey haze (ordinary particulate whitens the sky) to orange smoke (wildfire particles absorb blue). Two composited terms, because that is what particulate does to the light that reaches the eye:
//   attenuation (multiply) — the sky behind is dimmed and its blue is absorbed;
//   in-scatter (screen)    — the plume adds sunlight it scatters toward the viewer, which is what makes smoke read as luminous brown rather than as a dim blue sky.
// Density is horizon-weighted: the sight-line through the plume is longest low in the frame.
import React from "react";
import { SMOKE } from "../utils/theme";

interface Props {
  density: number; // 0..1, normalized PM2.5 — how much veil
  pm25?: number | null; // absolute µg/m³ — which regime: white haze or orange smoke (SMOKE.orange)
  hueDeg?: number; // override for tuning; defaults to the token
}

// 0 = white haze, 1 = orange smoke, from absolute PM2.5.
export function smokeRegime(pm25: number | null | undefined): number {
  if (pm25 == null) return 0;
  return Math.max(0, Math.min(1, (pm25 - SMOKE.orange.fromUgm3) / (SMOKE.orange.toUgm3 - SMOKE.orange.fromUgm3)));
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const STOPS = [0, 0.35, 0.62, 0.82, 1];

function ramp(d: number, alphaMax: number, hue: number, sat: number, light: (t: number) => number): string {
  const strength = Math.pow(d, SMOKE.curve); // steeper at the low end: a normal day is visibly hazy
  const parts = STOPS.map((t) => {
    const weight = SMOKE.zenithFactor + (1 - SMOKE.zenithFactor) * Math.pow(t, SMOKE.horizonBias);
    const alpha = alphaMax * strength * weight;
    return `hsla(${hue.toFixed(1)}, ${(sat * 100).toFixed(0)}%, ${(light(t) * 100).toFixed(0)}%, ${alpha.toFixed(3)}) ${(t * 100).toFixed(0)}%`;
  });
  return `linear-gradient(to bottom, ${parts.join(", ")})`;
}

export const SmokeLayer = React.memo(function SmokeLayer({ density, pm25, hueDeg }: Props) {
  const d = Math.max(0, Math.min(1, density));
  if (d <= 0.001) return null;
  const r = smokeRegime(pm25); // colour follows the regime; alpha follows density

  const hue = (hueDeg ?? SMOKE.hueDeg) + SMOKE.hueDriftDeg * r;
  // Absolute, not fixed: the scene owns its own box above the control bar, so the plume's densest band stays visible.
  const base: React.CSSProperties = { position: "absolute", inset: 0, pointerEvents: "none" };

  // Attenuation: a light warm tint that strips blue, deepening a little toward the horizon. Kept light on purpose — this term must not carry the darkening.
  const attenuation = ramp(
    d,
    SMOKE.attenuation.alphaMax,
    hue,
    lerp(SMOKE.attenuation.saturation.thin, SMOKE.attenuation.saturation.thick, r),
    (t) => lerp(SMOKE.attenuation.lightness.thin, SMOKE.attenuation.lightness.thick, Math.pow(t, 0.8) * r),
  );

  // In-scatter: the plume's own light. Bright orange-tan overhead, deeper and more saturated toward the horizon where the path is longest.
  const inscatter = ramp(
    d,
    SMOKE.inscatter.alphaMax,
    hue,
    lerp(SMOKE.inscatter.saturation.thin, SMOKE.inscatter.saturation.thick, r),
    (t) => {
      const v = Math.pow(t, 1.4);
      const thin = lerp(SMOKE.inscatter.lightness.thin.zenith, SMOKE.inscatter.lightness.thin.horizon, v);
      const thick = lerp(SMOKE.inscatter.lightness.thick.zenith, SMOKE.inscatter.lightness.thick.horizon, v);
      return lerp(thin, thick, r);
    },
  );

  return (
    <>
      <div aria-hidden style={{ ...base, background: attenuation, mixBlendMode: "multiply" }} />
      <div aria-hidden style={{ ...base, background: inscatter, mixBlendMode: "screen" }} />
    </>
  );
}, (a, b) => Math.round(a.density * 200) === Math.round(b.density * 200) && Math.round(smokeRegime(a.pm25) * 100) === Math.round(smokeRegime(b.pm25) * 100) && a.hueDeg === b.hueDeg);
