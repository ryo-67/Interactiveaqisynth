// oklch — the perceptual colour space the AQI ramp is built in (D-51, 2026-09-16). OKLCH's lightness and chroma track what the eye reads as brightness and saturation, so six hues set at one L and one C read as one family; sRGB hex values hand-picked per hue never did (yellow at 0.93 luminance beside a red at 0.28). Björn Ottosson's Oklab, the standard matrices; sRGB only.
export type RGB = [number, number, number]; // 0..255

const srgbToLinear = (v: number) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const linearToSrgb = (v: number) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);

// Linear sRGB → Oklab.
function linearToOklab(r: number, g: number, b: number): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
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

export function hexToOklch(hex: string): OKLCH {
  const [r, g, b] = [1, 3, 5].map((i) => srgbToLinear(parseInt(hex.slice(i, i + 2), 16)));
  const [L, a, bb] = linearToOklab(r, g, b);
  const h = ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
  return { L, C: Math.hypot(a, bb), h };
}

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
  return "#" + lin.map((v) => Math.round(Math.max(0, Math.min(255, linearToSrgb(Math.max(0, Math.min(1, v)))))).toString(16).padStart(2, "0")).join("");
}
// WCAG relative luminance of a hex, for the contrast checks the ramp is set against.
export function luminanceOfHex(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => srgbToLinear(parseInt(hex.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
