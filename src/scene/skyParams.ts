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
export function skyParamsFor(pm25n: number | null, o3n: number | null, sunElevationDeg?: number): SkyParams {
  const p = Math.min(1, pm25n ?? 0);
  const o = Math.min(1, o3n ?? 0);
  return {
    turbidity: lerp(SKY_RANGES.turbidity.clear, SKY_RANGES.turbidity.suffocating, p),
    mieCoefficient: lerp(SKY_RANGES.mieCoefficient.clear, SKY_RANGES.mieCoefficient.high, p),
    mieDirectionalG: SKY_RANGES.mieDirectionalG,
    rayleigh: lerp(SKY_RANGES.rayleigh.lowO3, SKY_RANGES.rayleigh.highO3, o),
    bloomIntensity: o3n == null ? 0 : lerp(SKY_RANGES.bloomIntensity.lowO3, SKY_RANGES.bloomIntensity.highO3, o),
    discBrightness: lerp(SKY_RANGES.discBrightness.lowO3, SKY_RANGES.discBrightness.highO3, o),
    exposure:
      lerp(SKY_RANGES.exposure.lowO3, SKY_RANGES.exposure.highO3, o) *
      (sunElevationDeg == null ? 1 : nightExposureFactor(sunElevationDeg)),
  };
}

// Stars fade in below the horizon and are hidden by haze (§5.2 item 4).
export function starOpacity(sunElevationDeg: number, pm25n: number | null): number {
  const night = Math.max(0, Math.min(1, -sunElevationDeg / 8)); // full by ~8° below the horizon
  return night * (1 - Math.min(1, pm25n ?? 0));
}
