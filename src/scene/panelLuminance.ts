// panelLuminance — what a frosted panel will look like, predicted from what is behind it (D-36). The scene cannot read its own composited pixels, but it knows every layer: the sky canvas can be sampled behind the panel, the DOM layers are gradients with known maths (night and golden screened, the plume multiplied then screened), and the glass is a fill over a saturated backdrop. Composited here in sRGB the way the browser does it, at the panel's own vertical band, so the ramp that has to read on the panel can be set for the panel it will actually sit on. Calibrated against composited screenshots (2026-09-15): see RAMP in theme.ts.
import { NIGHT, GOLDEN, RAMP } from "../utils/theme";
import { smokeStop } from "./SmokeLayer";
import { nightOpacity } from "./NightLayer";
import { goldenOpacity, GOLDEN_MID_AT } from "./GoldenLayer";
import { clamp01, lerp } from "../utils/math";
import { hexToRgb, srgbToLinear, type RGB } from "../utils/oklch";

export type { RGB };

const mix = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

function hslToRgb(h: number, s: number, l: number): RGB {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}
// CSS mix-blend-mode screen and multiply, applied at the layer's alpha.
const screen = (base: RGB, top: RGB, alpha: number): RGB => base.map((b, i) => { const t = top[i]; const s = 255 - ((255 - b) * (255 - t)) / 255; return lerp(b, s, alpha); }) as RGB;
const multiply = (base: RGB, top: RGB, alpha: number): RGB => base.map((b, i) => lerp(b, (b * top[i]) / 255, alpha)) as RGB;
export const luminance = (c: RGB): number => 0.2126 * srgbToLinear(c[0]) + 0.7152 * srgbToLinear(c[1]) + 0.0722 * srgbToLinear(c[2]);
export const contrast = (a: RGB, b: RGB): number => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

export interface PanelInputs {
  sky: RGB; // the sky canvas, averaged behind the panel (and the blur radius around it)
  t: number; // the panel's vertical centre as a fraction of the sky box, 0 top → 1 bottom: where the gradient layers are evaluated
  smoke: { density: number; regime: number };
  night: number; // nightBlend, eased
  golden: number; // goldenBlend, eased
  glass: { alpha: number; fill: string; lift: number }; // the frosted material as the scene set it
}

// The sky as it is seen at height t, the DOM layers over the canvas sample and no glass: what a panel frosts, and the colour Safari's status bar band is set to (ScenePage, BUG-57).
function predictSky(i: Omit<PanelInputs, "glass">): RGB {
  const t = clamp01(i.t), d = clamp01(i.smoke.density);
  let c: RGB = i.sky;
  // The DOM layers, in the order the scene stacks them: night, golden, then the plume's two terms.
  const nightA = nightOpacity(i.night, d);
  if (nightA > 0.002) c = screen(c, mix(hexToRgb(NIGHT.zenith), hexToRgb(NIGHT.horizon), t), nightA);
  const goldenA = goldenOpacity(i.golden, d);
  if (goldenA > 0.002) { const p = 1 - t; const g = p < GOLDEN_MID_AT ? mix(hexToRgb(GOLDEN.horizon), hexToRgb(GOLDEN.mid), p / GOLDEN_MID_AT) : mix(hexToRgb(GOLDEN.mid), hexToRgb(GOLDEN.zenith), (p - GOLDEN_MID_AT) / (1 - GOLDEN_MID_AT)); c = screen(c, g, goldenA); }
  if (d > 0.001) {
    const at = smokeStop("attenuation", d, i.smoke.regime, t); c = multiply(c, hslToRgb(at.h, at.s, at.l), at.a);
    const sc = smokeStop("inscatter", d, i.smoke.regime, t); c = screen(c, hslToRgb(sc.h, sc.s, sc.l), sc.a);
  }
  return c;
}

export function predictPanel(i: PanelInputs): { rgb: RGB; luminance: number } {
  let c = predictSky(i);
  // The glass: the fill over the backdrop, the night's white lift over that. The material's own saturation is not in the sample: the browser applies it to the backdrop at composite time (D-59), and the sample is the raw sky under the panel.
  const fill = i.glass.fill.split(",").map(Number) as RGB;
  c = mix(c, fill, clamp01(i.glass.alpha));
  c = mix(c, [255, 255, 255], clamp01(i.glass.lift));
  return { rgb: c, luminance: luminance(c) };
}

// MAPPING (panel luminance → ramp lift): 0 on the darkest panel the scene makes, 1 on the brightest, linear between; the ramp's two ends are set so each clears 3:1 at its own end (RAMP in theme.ts).
export function rampLiftFor(panelLuminance: number): number {
  return clamp01((panelLuminance - RAMP.panelDark) / (RAMP.panelBright - RAMP.panelDark));
}
