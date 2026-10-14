// oklch — the perceptual colour space the AQI ramp is built in (D-51, 2026-09-16). OKLCH's lightness and chroma track what the eye reads as brightness and saturation, so six hues set at one L and one C read as one family; sRGB hex values hand-picked per hue never did (yellow at 0.93 luminance beside a red at 0.28). Björn Ottosson's Oklab, the standard matrices; sRGB only.
import { clamp01 } from "./math";
export type RGB = [number, number, number]; // 0..255

/** "#rrggbb" → [r, g, b], 0..255. */
export const hexToRgb = (hex: string): RGB => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];

export const srgbToLinear = (v: number) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const linearToSrgb = (v: number) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);

// Oklab → linear sRGB (may fall outside 0..1: out of gamut).
function oklabToLinear(L: number, a: number, b: number): [number, number, number] {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export interface OKLCH { L: number; C: number; h: number } // L 0..1, C 0..~0.37, h degrees

function oklchToLinear({ L, C, h }: OKLCH): [number, number, number] {
  const rad = (h * Math.PI) / 180;
  return oklabToLinear(L, C * Math.cos(rad), C * Math.sin(rad));
}
export function inGamut(c: OKLCH): boolean {
  const eps = 1e-4;
  return oklchToLinear(c).every((v) => v >= -eps && v <= 1 + eps);
}
// The largest chroma this hue holds at this lightness inside sRGB.
export function maxChroma(L: number, h: number): number {
  let lo = 0, hi = 0.4;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (inGamut({ L, C: mid, h })) lo = mid; else hi = mid; }
  return lo;
}
export function oklchToHex(c: OKLCH): string {
  const lin = oklchToLinear({ ...c, C: Math.min(c.C, maxChroma(c.L, c.h)) }); // clipped to the gamut by chroma alone, so the hue and the lightness hold
  return "#" + lin.map((v) => Math.round(Math.max(0, Math.min(255, linearToSrgb(clamp01(v))))).toString(16).padStart(2, "0")).join("");
}
