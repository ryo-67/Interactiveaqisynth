// skyParams.ts — the data → sky-parameter mapping (D-19 rebuild, §5.2). One place, so the scene and the test harness read the same numbers.
// PM2.5 → turbidity, mieCoefficient: aerosol scattering. What smoke does to light.
// O3 → rayleigh, bloom intensity, disc brightness, exposure: photochemical intensity. Ozone is made by strong sun, so a high-ozone afternoon reads bright and white; a low-ozone morning reads deep blue.
// Clock → sunPosition, star visibility (handled by the caller from solar.ts).

import { SKY_RANGES } from "../utils/theme";

export interface SkyParams {
  turbidity: number;
  mieCoefficient: number;
  mieDirectionalG: number;
  rayleigh: number;
  bloomIntensity: number;
  discBrightness: number;
  exposure: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));

// The Preetham model three.js Sky implements has no night: with the sun below the horizon it still renders a bright sky. Darkness has to come from tone-mapping exposure, so night is an exposure falloff keyed to the sun's elevation. FINDING for review — the falloff shape is a starting value, not a settled one.
export function nightExposureFactor(sunElevationDeg: number): number {
  if (sunElevationDeg >= 0) return 1;
  return Math.max(0.03, 1 + sunElevationDeg / 12); // full dark by ~12° below the horizon (astronomical-ish twilight)
}

// pm25n and o3n are the engine's normalized values (p05 → 0, p95 → 1). Both saturate above 1: an extreme day sits at the ceiling rather than running away. sunElevationDeg, when given, applies the night falloff.
// The shape of SKY_RANGES, so a caller can pass a tuned copy instead of the compiled one.
export interface SkyRanges {
  turbidity: { clear: number; suffocating: number };
  mieCoefficient: { clear: number; high: number };
  mieDirectionalG: number;
  rayleigh: { lowO3: number; highO3: number };
  bloomIntensity: { lowO3: number; highO3: number };
  discBrightness: { lowO3: number; highO3: number };
  exposure: { lowO3: number; highO3: number };
}

// `r` overrides the compiled ranges.
export function skyParamsFor(
  pm25n: number | null,
  o3n: number | null,
  sunElevationDeg?: number,
  r: SkyRanges = SKY_RANGES as unknown as SkyRanges,
): SkyParams {
  const p = Math.min(1, pm25n ?? 0);
  const o = Math.min(1, o3n ?? 0);
  return {
    turbidity: lerp(r.turbidity.clear, r.turbidity.suffocating, p),
    mieCoefficient: lerp(r.mieCoefficient.clear, r.mieCoefficient.high, p),
    mieDirectionalG: r.mieDirectionalG,
    rayleigh: lerp(r.rayleigh.lowO3, r.rayleigh.highO3, o),
    bloomIntensity: o3n == null ? 0 : lerp(r.bloomIntensity.lowO3, r.bloomIntensity.highO3, o),
    discBrightness: lerp(r.discBrightness.lowO3, r.discBrightness.highO3, o),
    exposure:
      lerp(r.exposure.lowO3, r.exposure.highO3, o) *
      (sunElevationDeg == null ? 1 : nightExposureFactor(sunElevationDeg)),
  };
}

// The aerosol path (§5.2 item 2): one parameter, haze 0→1, along which turbidity and mieCoefficient rise together. Two free variables would be a search space, not a comparison. haze = 0 is the model's own default sky (turbidity 2, mie 0.005). Linear for now.
// Ordinary haze only (D-20): the wildfire event moved to the composited smoke layer, so this path no longer has to reach for it. 2.0 is a measured clear sky (photometric fits land at 2.5, stable 2–3); 6 is Preetham's own hazy-evening figure. Kept equal to SKY_RANGES.turbidity/mieCoefficient in theme.ts, which is what actually renders.
export const HAZE_PATH = {
  turbidity: { at0: 2, at1: 6 },
  mieCoefficient: { at0: 0.005, at1: 0.02 },
} as const;

export function hazeToAerosol(haze: number): { turbidity: number; mieCoefficient: number } {
  const h = Math.max(0, Math.min(1, haze));
  return {
    turbidity: HAZE_PATH.turbidity.at0 + (HAZE_PATH.turbidity.at1 - HAZE_PATH.turbidity.at0) * h,
    mieCoefficient: HAZE_PATH.mieCoefficient.at0 + (HAZE_PATH.mieCoefficient.at1 - HAZE_PATH.mieCoefficient.at0) * h,
  };
}

// Rayleigh is held at the three.js Sky model default and is no longer part of what the haze row varies.
export const RAYLEIGH_DEFAULT = 1;

// Stars fade in below the horizon and are hidden by haze (§5.2 item 4).
export function starOpacity(sunElevationDeg: number, pm25n: number | null): number {
  const night = Math.max(0, Math.min(1, -sunElevationDeg / 8)); // full by ~8° below the horizon
  return night * (1 - Math.min(1, pm25n ?? 0));
}
