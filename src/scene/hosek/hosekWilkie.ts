// hosekWilkie.ts — CPU side of the Hosek-Wilkie analytic sky (SIGGRAPH 2012). Ported from diharaw/sky-models (MIT), which wraps the authors' reference dataset; see hosekData.ts for the Hosek/Wilkie notice.
// The model's parameters are turbidity, ground albedo, and solar elevation. It has no ozone parameter — that belongs to the physical-transport models (Bruneton/Nishita/Prague), not to this one.
import { datasetsRGB, datasetsRGBRad } from "./hosekData";

export interface HosekCoefficients {
  A: [number, number, number];
  B: [number, number, number];
  C: [number, number, number];
  D: [number, number, number];
  E: [number, number, number];
  F: [number, number, number];
  G: [number, number, number];
  H: [number, number, number];
  I: [number, number, number];
  Z: [number, number, number];
}

// Quintic Bézier over the six elevation control points.
function evaluateSpline(data: Float64Array, offset: number, stride: number, t: number): number {
  const u = 1 - t;
  return (
    1 * u ** 5 * data[offset + 0 * stride] +
    5 * u ** 4 * t * data[offset + 1 * stride] +
    10 * u ** 3 * t ** 2 * data[offset + 2 * stride] +
    10 * u ** 2 * t ** 3 * data[offset + 3 * stride] +
    5 * u * t ** 4 * data[offset + 4 * stride] +
    1 * t ** 5 * data[offset + 5 * stride]
  );
}

// Splines are functions of elevation^(1/3); the table covers turbidity 1..10 and albedo 0..1.
function evaluate(data: Float64Array, base: number, stride: number, turbidity: number, albedo: number, sunTheta: number): number {
  const elevationK = Math.pow(Math.max(0, 1 - sunTheta / (Math.PI / 2)), 1 / 3);
  const turbidity0 = Math.min(10, Math.max(1, Math.floor(turbidity)));
  const turbidity1 = Math.min(turbidity0 + 1, 10);
  const turbidityK = Math.min(1, Math.max(0, turbidity - turbidity0));

  const a0 = base;
  const a1 = base + stride * 6 * 10; // albedo-1 half of the table

  const a0t0 = evaluateSpline(data, a0 + stride * 6 * (turbidity0 - 1), stride, elevationK);
  const a1t0 = evaluateSpline(data, a1 + stride * 6 * (turbidity0 - 1), stride, elevationK);
  const a0t1 = evaluateSpline(data, a0 + stride * 6 * (turbidity1 - 1), stride, elevationK);
  const a1t1 = evaluateSpline(data, a1 + stride * 6 * (turbidity1 - 1), stride, elevationK);

  return (
    a0t0 * (1 - albedo) * (1 - turbidityK) +
    a1t0 * albedo * (1 - turbidityK) +
    a0t1 * (1 - albedo) * turbidityK +
    a1t1 * albedo * turbidityK
  );
}

const chan = (v: number[]): [number, number, number] => [v[0], v[1], v[2]];

// The analytic radiance function, evaluated on the CPU only to normalise the sun's luminance.
function hosekWilkieRGB(cosTheta: number, gamma: number, cosGamma: number, c: HosekCoefficients): [number, number, number] {
  const out: number[] = [];
  for (let i = 0; i < 3; i++) {
    const chi = (1 + cosGamma * cosGamma) / Math.pow(1 + c.H[i] * c.H[i] - 2 * cosGamma * c.H[i], 1.5);
    out.push(
      (1 + c.A[i] * Math.exp(c.B[i] / (cosTheta + 0.01))) *
        (c.C[i] + c.D[i] * Math.exp(c.E[i] * gamma) + c.F[i] * cosGamma * cosGamma + c.G[i] * chi + c.I[i] * Math.sqrt(Math.max(0, cosTheta))),
    );
  }
  return chan(out);
}

/**
 * Coefficients for a given sun elevation, turbidity and ground albedo.
 * sunTheta is the sun's zenith angle in radians (0 = overhead, π/2 = horizon).
 * normalizedSunY, when set, rescales radiance so the sun's own luminance equals it — the practical way to keep the physical units in display range.
 */
export function hosekCoefficients(sunTheta: number, turbidity: number, albedo = 0.1, normalizedSunY = 1.15): HosekCoefficients {
  const A: number[] = [], B: number[] = [], C: number[] = [], D: number[] = [], E: number[] = [];
  const F: number[] = [], G: number[] = [], H: number[] = [], I: number[] = [], Z: number[] = [];

  for (let i = 0; i < 3; i++) {
    const d = datasetsRGB[i];
    A.push(evaluate(d, 0, 9, turbidity, albedo, sunTheta));
    B.push(evaluate(d, 1, 9, turbidity, albedo, sunTheta));
    C.push(evaluate(d, 2, 9, turbidity, albedo, sunTheta));
    D.push(evaluate(d, 3, 9, turbidity, albedo, sunTheta));
    E.push(evaluate(d, 4, 9, turbidity, albedo, sunTheta));
    F.push(evaluate(d, 5, 9, turbidity, albedo, sunTheta));
    G.push(evaluate(d, 6, 9, turbidity, albedo, sunTheta));
    // H and I are swapped in the dataset, per the reference implementation.
    H.push(evaluate(d, 8, 9, turbidity, albedo, sunTheta));
    I.push(evaluate(d, 7, 9, turbidity, albedo, sunTheta));
    Z.push(evaluate(datasetsRGBRad[i], 0, 1, turbidity, albedo, sunTheta));
  }

  const c: HosekCoefficients = { A: chan(A), B: chan(B), C: chan(C), D: chan(D), E: chan(E), F: chan(F), G: chan(G), H: chan(H), I: chan(I), Z: chan(Z) };

  if (normalizedSunY) {
    const S = hosekWilkieRGB(Math.cos(sunTheta), 0, 1, c);
    const lum = S[0] * c.Z[0] * 0.2126 + S[1] * c.Z[1] * 0.7152 + S[2] * c.Z[2] * 0.0722;
    if (lum > 0) c.Z = [(c.Z[0] / lum) * normalizedSunY, (c.Z[1] / lum) * normalizedSunY, (c.Z[2] / lum) * normalizedSunY];
  }

  return c;
}
