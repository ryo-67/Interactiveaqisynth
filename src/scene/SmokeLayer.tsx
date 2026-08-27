// SmokeLayer — the wildfire plume (D-20). Not a sky-model parameter: a sky model renders clear air with more aerosol suspended in it, whereas June 7 was a plume between the observer and the sky. Those are different physical situations, so the plume is composited above the sky.
// MAPPING (PM2.5 → plume): normalized PM2.5 drives density, hue (amber → brown) and saturation. Two composited terms, because that is what a plume does to the light that reaches the eye:
//   attenuation (multiply) — the sky behind is dimmed and its blue is absorbed;
//   in-scatter (screen)    — the plume adds sunlight it scatters toward the viewer, which is what makes smoke read as luminous brown rather than as a dim blue sky.
// Density is horizon-weighted: the sight-line through the plume is longest low in the frame.
import React from "react";
import { SMOKE } from "../utils/theme";

interface Props {
  density: number; // 0..1, normalized PM2.5
  hueDeg?: number; // override for tuning; defaults to the token
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const STOPS = [0, 0.35, 0.62, 0.82, 1];

function ramp(d: number, alphaMax: number, hue: number, sat: number, light: (t: number) => number): string {
  const parts = STOPS.map((t) => {
    const weight = SMOKE.zenithFactor + (1 - SMOKE.zenithFactor) * Math.pow(t, SMOKE.horizonBias);
    const alpha = alphaMax * d * weight;
    return `hsla(${hue.toFixed(1)}, ${(sat * 100).toFixed(0)}%, ${(light(t) * 100).toFixed(0)}%, ${alpha.toFixed(3)}) ${(t * 100).toFixed(0)}%`;
  });
  return `linear-gradient(to bottom, ${parts.join(", ")})`;
}

export function SmokeLayer({ density, hueDeg }: Props) {
  const d = Math.max(0, Math.min(1, density));
  if (d <= 0.001) return null;

  const hue = (hueDeg ?? SMOKE.hueDeg) + SMOKE.hueDriftDeg * d;
  const base: React.CSSProperties = { position: "fixed", inset: 0, pointerEvents: "none" };

  // Attenuation: warm grey, darkening toward the horizon where the path is longest.
  const attenuation = ramp(
    d,
    SMOKE.attenuation.alphaMax,
    hue,
    SMOKE.attenuation.saturation,
    (t) => lerp(SMOKE.attenuation.lightness.thin, SMOKE.attenuation.lightness.thick, Math.pow(t, 0.8) * d),
  );

  // In-scatter: saturated amber, brightening toward the horizon.
  const inscatter = ramp(
    d,
    SMOKE.inscatter.alphaMax,
    hue,
    lerp(SMOKE.inscatter.saturation.thin, SMOKE.inscatter.saturation.thick, d),
    (t) => lerp(SMOKE.inscatter.lightness.thin, SMOKE.inscatter.lightness.thick, Math.pow(t, 0.8)),
  );

  return (
    <>
      <div aria-hidden style={{ ...base, background: attenuation, mixBlendMode: "multiply" }} />
      <div aria-hidden style={{ ...base, background: inscatter, mixBlendMode: "screen" }} />
    </>
  );
}
