import { createContext, useContext } from "react";

export type Theme = "dark" | "light";

export const ThemeContext = createContext<Theme>("dark");

export function useTheme() {
  return useContext(ThemeContext);
}

export function themeColors(theme: Theme) {
  const isDark = theme === "dark";
  return {
    bg: isDark ? "#0a0a16" : "#f6f4f0",
    bgCanvas: isDark ? "rgb(10, 10, 22)" : "#ebe7e0",
    bgSurface: isDark
      ? "rgba(255,255,255,0.04)"
      : "rgba(0,0,0,0.025)",
    bgSurfaceHover: isDark
      ? "rgba(255,255,255,0.07)"
      : "rgba(0,0,0,0.05)",
    bgPanel: isDark
      ? "rgba(10, 10, 22, 0.92)"
      : "rgba(246, 244, 240, 0.94)",
    bgPanelSolid: isDark ? "#0a0a16" : "#f6f4f0",

    textPrimary: isDark
      ? "rgba(255,255,255,0.9)"
      : "rgba(0,0,0,0.84)",
    // Text alphas hold WCAG AA (4.5:1) on the panel fills at GLASS.fillAlpha against any sky: secondary ≥ 6:1, muted ≥ 4.6:1 on both tones. Faint is for LINES only, never text.
    textSecondary: isDark
      ? "rgba(255,255,255,0.78)"
      : "rgba(0,0,0,0.72)",
    textMuted: isDark
      ? "rgba(255,255,255,0.64)"
      : "rgba(0,0,0,0.6)",
    textFaint: isDark
      ? "rgba(255,255,255,0.18)"
      : "rgba(0,0,0,0.22)",
    gridHair: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",

    border: isDark
      ? "rgba(255,255,255,0.07)"
      : "rgba(0,0,0,0.07)",
    borderSubtle: isDark
      ? "rgba(255,255,255,0.035)"
      : "rgba(0,0,0,0.035)",

    btnBg: isDark
      ? "rgba(255,255,255,0.06)"
      : "rgba(0,0,0,0.05)",
    btnBgActive: isDark
      ? "rgba(255,255,255,0.12)"
      : "rgba(0,0,0,0.09)",
    btnBorder: isDark
      ? "rgba(255,255,255,0.08)"
      : "rgba(0,0,0,0.08)",
    btnBorderActive: isDark
      ? "rgba(255,255,255,0.18)"
      : "rgba(0,0,0,0.16)",

    meterBg: isDark
      ? "rgba(255,255,255,0.05)"
      : "rgba(0,0,0,0.05)",

    canvasTextShadow: isDark
      ? "0 0 60px rgba(0,0,0,0.8)"
      : "0 0 60px rgba(255,255,255,0.8)",
    canvasOverlayText: isDark
      ? "rgba(255,255,255,0.88)"
      : "rgba(30,25,20,0.85)",
    canvasOverlaySub: isDark
      ? "rgba(255,255,255,0.35)"
      : "rgba(30,25,20,0.5)",
    canvasFadeBg: isDark
      ? "rgba(10, 10, 22,"
      : "rgba(235, 231, 224,",

    playheadColor: isDark
      ? "rgba(255,255,255,0.65)"
      : "rgba(0,0,0,0.55)",
    playheadGlow: isDark
      ? "0 0 10px rgba(255,255,255,0.25)"
      : "0 0 10px rgba(0,0,0,0.12)",

    // volume slider
    sliderTrack: isDark
      ? "rgba(255,255,255,0.08)"
      : "rgba(0,0,0,0.08)",
    sliderFill: isDark
      ? "rgba(255,255,255,0.3)"
      : "rgba(0,0,0,0.25)",
    sliderThumb: isDark
      ? "rgba(255,255,255,0.7)"
      : "rgba(0,0,0,0.55)",

    // share card
    cardBg: isDark ? "#111122" : "#faf8f5",
    cardBorder: isDark
      ? "rgba(255,255,255,0.06)"
      : "rgba(0,0,0,0.06)",

    // map
    mapBg: isDark
      ? "rgba(255,255,255,0.02)"
      : "rgba(0,0,0,0.02)",
    mapWater: isDark
      ? "rgba(80,120,200,0.06)"
      : "rgba(80,120,200,0.05)",

    // recording
    recordRed: "#e63c3c",
  };
}

// ——— Sprint 3a design tokens (DSN-02, STRATEGY §5.4/§5.5) ———

// Five-tier color, keyed by tier index (Easy → Suffocating), carried from the v1 palette (D-19 pending none — Shoro confirmed these hues 2026-08-27). The hue appears on exactly four things: mood word (full), O3 line and playhead (medium), pins (subtle, 3b). Everything else is the text hierarchy on the ground.
export const TIER_COLORS = ["#68d89b", "#e8cf6a", "#e89b6a", "#e86a6a", "#b06ae8"] as const;

// The standard AQI categories (EPA, six), D-23: the graph's AQI line and its legend use these, because visitors read AQI tools against this palette. The five tier colours above remain the piece's own voice on the mood word.
// The colours are the standard hues lifted to pass WCAG 1.4.11 (≥ 3:1 for graphics) against the dark panel (#0e0e1c, the hard case). The standard values fail for the top two: Very Unhealthy #8f3f97 is 3.0:1 and Hazardous #7e0023 is 1.7:1. Measured: Good 11.0, Moderate 17.8, USG 8.2, Unhealthy 6.3, Very Unhealthy 7.3, Hazardous 6.3.
export const AQI_CATEGORIES = [
  { max: 50, color: "#00e400" },
  { max: 100, color: "#ffff00" },
  { max: 150, color: "#ff8c1a" },
  { max: 200, color: "#ff5c5c" },
  { max: 300, color: "#c48ae0" },
  { max: 500, color: "#e0708e" },
] as const;

// ONE colour rule for the AQI line and the bar beside it, so they always agree: each category's colour sits at the middle of its band and blends linearly to the next, the way a standard AQI gauge is drawn. A flat colour per band on the line against a gradient on the bar read as two different legends.
const AQI_STOPS: Array<{ at: number; rgb: [number, number, number] }> = (() => {
  const hex = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  let lo = 0;
  return AQI_CATEGORIES.map((c) => { const at = (lo + c.max) / 2; lo = c.max; return { at, rgb: hex(c.color) }; });
})();
export function aqiScaleColor(aqi: number): string {
  const v = Math.max(0, aqi);
  if (v <= AQI_STOPS[0].at) return `rgb(${AQI_STOPS[0].rgb.join(",")})`;
  for (let i = 1; i < AQI_STOPS.length; i++) {
    const a = AQI_STOPS[i - 1], b = AQI_STOPS[i];
    if (v <= b.at) {
      const t = (v - a.at) / (b.at - a.at);
      const m = a.rgb.map((x, k) => Math.round(x + (b.rgb[k] - x) * t));
      return `rgb(${m.join(",")})`;
    }
  }
  return `rgb(${AQI_STOPS[AQI_STOPS.length - 1].rgb.join(",")})`;
}
// The gradient's stops, on a 0..max scale, for a canvas or CSS gradient drawn with the same rule.
export function aqiScaleStops(max: number): Array<{ offset: number; color: string }> {
  const stops = AQI_STOPS.filter((s) => s.at <= max).map((s) => ({ offset: s.at / max, color: `rgb(${s.rgb.join(",")})` }));
  return [{ offset: 0, color: aqiScaleColor(0) }, ...stops, { offset: 1, color: aqiScaleColor(max) }];
}

// The graph (§5.3 score panel, rebuilt): four labelled tracks on one hour-aligned x-scale, the pulse row beneath, one playhead through all of them.
export const GRAPH = {
  // One tab at a time, so the tab gets real height: the line is the thing being read.
  tabHeight: { laptop: 240, phone: 170 },
  pulseRowHeight: { laptop: 30, phone: 24 },
  axisHeight: 22,
  labelGutter: 6,
  lineWidth: { aqi: 2.5, channel: 1.75 },
  // AQI's y-scale is fixed at the full standard range, 0–500, so the line never rescales between days, nothing is ever clipped (Jun 7 crossed 350 and flatlined at a 300 top), and the bar beside it is the complete ruler including Hazardous.
  aqiScaleMax: 500,
  // The AQI scale bar at the right of the AQI tab: the standard category colours as one smooth vertical gradient on that scale, marker at the current value.
  scaleBarWidth: 14,
  scaleBarGap: 8,
  scaleBarMarker: 4,
} as const;

// Opacity scale (§5.5). Tier color is applied through these, not at arbitrary alphas.
export const opacity = {
  full: 1,
  medium: 0.72,
  subtle: 0.4,
  faint: 0.18,
} as const;

export function tierColorAt(tierIndex: number, level: keyof typeof opacity): string {
  const hex = TIER_COLORS[Math.max(0, Math.min(4, tierIndex))];
  const a = Math.round(opacity[level] * 255).toString(16).padStart(2, "0");
  return level === "full" ? hex : `${hex}${a}`;
}

// Three type families (§5.5). No webfonts this sprint; these are the stacks the shipped build already speaks.
export const families = {
  serifItalic: 'Georgia, "Times New Roman", serif', // editorial serif — borough selected, mood word, mood sentence (styled italic at use)
  data: '"SF Mono", "Roboto Mono", Menlo, monospace', // tabular data face — the number, hour marks
  uiCaps: 'system-ui, "Helvetica Neue", sans-serif', // UI caps — unselected boroughs, source line (uppercase + letterspacing at use)
} as const;

// Named type scale (§5.5): [fontSize, lineHeight].
export const typeScale = {
  display: { size: "96px", line: 1.0 }, // the AQI number
  heading: { size: "34px", line: 1.15 }, // mood word
  body: { size: "15px", line: 1.6 }, // mood sentence
  caption: { size: "12px", line: 1.4 }, // borough row, legend
  micro: { size: "10px", line: 1.4 }, // hour marks and other non-text glyph labels only; running text is never below caption
} as const;

// Spacing tokens.
export const space = {
  xs: "6px",
  sm: "12px",
  md: "20px",
  lg: "36px",
  xl: "64px",
} as const;

// The four motion profiles (§5.4). Everything moves on the 90 BPM grid or not at all; drift is the one continuous exception (particulate, not rhythmic).
export const motion = {
  beatMs: 60000 / 90 / 1, // one beat = one hour = 666.7 ms; playhead advance
  blurMs: 500, // mood word swap at tier boundaries
  crossfadeMs: 300, // borough/day switch on the score
  driftPxPerSec: 4, // haze grain drift speed — continuous
} as const;

// ——— Scene tokens (D-19, §5.2/§5.6) — everything the scene draws is data; these are the only constants the drawing code may use ———

// NYC for the solar-position calculation (§5.2 item 1, amended: the sun runs on the clock).
export const NYC_LAT = 40.7128;
export const NYC_LON = -73.9857;

// PROPOSED parameter ranges for the physically based sky (D-19 rebuild). These are the starting ranges for the /scene-test harness only — Shoro reads the settled values off the sliders and they are replaced here.
// MAPPING (PM2.5 → turbidity + mieCoefficient): aerosol scattering — what smoke does to light.
// MAPPING (O3 → rayleigh + bloom intensity + disc brightness): photochemical intensity — ozone is made by strong sun, so high ozone reads bright and white and low ozone reads deep blue.
// MAPPING (clock → sunPosition + star visibility): the day itself.
// MAPPING (clock → exposure): exposure is clock-only (D-20). Ozone does not touch it; ozone drives rayleigh and bloom. 0.2 is the settled clear-noon value; 0.65 is the settled Preetham night. The schedule lerps between them across SKY_FADE.
export const CLEAR_NOON_EXPOSURE = 0.2;
export const NIGHT_EXPOSURE = 0.65;

// MAPPING (sun elevation → which sky model): Hosek-Wilkie for daylight, Preetham for night, cross-faded over this band of solar elevation (D-20). It ends at 0°, not below, because the Hosek dataset is frozen at the horizon: its coefficients stop changing at exactly 0° elevation, so any blend continuing below would fade between a live Preetham and a stuck Hosek.
export const SKY_FADE = { startDeg: 6, endDeg: 0 } as const;

// The literal sun (§5.1). Preetham draws its own disc; Hosek renders an aureole with no disc, so a sprite supplies one that the bloom pass can pick up. Angular diameter is oversized against the real 0.53° so it reads at phone scale. UNDER BENCHMARK in the harness — not yet in the page.
export const SUN_DISC = {
  angularDiameterDeg: 6, // 2.2° was invisible at page scale (a 35 px dot inside the aureole). Under benchmark: the harness has a size slider; this is the page's value until Shoro settles it.
  haloScale: 3.2,        // the soft halo's diameter as a multiple of the core's — the part the bloom pass lifts
  haloAlpha: 0.55,
  distance: 900,         // inside the default camera far plane (1000); the sky domes draw at the far plane regardless of scale
  coreColor: "#fff6e6",
} as const;

// Which way the scene camera faces (D-22, Shoro's ruling): south, so the sun arcs left to right across the frame. Track-sun was rejected because a centered sun has no arc. Summer noon (67° on Jun 7) sits above the frame's 63.5° top edge; only its aureole shows.
export const CAMERA_FACING = "south" as const;

// Hosek-Wilkie's ground albedo (D-20). Urban surfaces sit below 0.25 and cluster near 0.15: dark asphalt shingles measure 0.04–0.10, light concrete 0.35–0.40 fresh ageing to 0.25–0.30. Investigated as the smoke mechanism and rejected — it was never 0, and moving it barely shifts a smoke day.
export const HOSEK_ALBEDO = 0.15;

// The wildfire plume (D-20): a composited layer above the sky, driven by normalized PM2.5. It darkens and warms what is behind it rather than replacing it, because a plume sits between the observer and the sky.
export const SMOKE = {
  // Two regimes in one layer. ORDINARY HAZE (density up to ~0.5): particulate whitens the sky — Mie scattering flattens the blue toward grey-white, most at the horizon — so the veil is near-neutral and light. WILDFIRE (density toward 1): large particles absorb blue far more than red, so the sky loses its blue and the light arrives reddened while the scene stays bright; brown belongs only near the horizon, where the sight-line is longest. Saturation and lightness therefore move with density; hue barely does.
  hueDeg: 30,
  hueDriftDeg: -6,
  // Alpha rises on a curve steeper than linear at the low end, so a normal day's 0.2–0.4 is visibly hazy rather than nothing: alpha ∝ density^curve.
  curve: 0.6,
  // Which REGIME the veil is in — white haze or orange smoke — keys to ABSOLUTE PM2.5, not the normalized value. Normalization is NYC's own p05→p95 (≈3→20 µg/m³), so a heavy winter traffic day pins at 1.0 exactly like a wildfire day twenty times higher; density (how much veil) rightly uses it, colour must not. The sky visibly discolours when PM2.5 is in the hundreds: neutral at 60, fully orange by 200.
  orange: { fromUgm3: 60, toUgm3: 200 },
  // Attenuation (multiply): a LIGHT tint that strips blue without crushing luminance; nearly neutral when thin, warm when thick. Capped so a full plume at midday is never darker than the clear sky at the same hour.
  attenuation: {
    saturation: { thin: 0.12, thick: 0.55 },
    lightness: { thin: 0.94, thick: 0.74 },
    alphaMax: 0.5,
  },
  // In-scatter (screen): the sunlight the particles throw back at the viewer. White-grey when thin (haze), orange when thick (smoke). Weighted above attenuation, so the sky brightens rather than dims as particulate rises. Deeper toward the horizon.
  inscatter: {
    saturation: { thin: 0.08, thick: 0.85 },
    lightness: { thin: { zenith: 0.78, horizon: 0.7 }, thick: { zenith: 0.6, horizon: 0.46 } },
    alphaMax: 0.92,
  },
  zenithFactor: 0.55,    // fraction of horizon density still present at the top of the frame
  horizonBias: 1.8,      // exponent on the vertical ramp
} as const;

// Colour grade on the rendered sky, applied in the post chain before tone mapping and beneath the plume: the analytic models tone-map to a bluish grey a clear day should not have. Saturation only; hue is the models'. Shoro's ask was "bluer by default" — this is the dial, first pass, with a harness slider.
export const SKY_GRADE = {
  saturation: 0.35, // postprocessing HueSaturation: 0 = as rendered, 1 = fully saturated
  // Under smoke the blue is absorbed before it reaches the eye, so the grade must not put it back: the sky beneath a full plume is DESATURATED (negative), otherwise orange screened over saturated blue comes out muddy purple. Blended by the smoke regime.
  saturationUnderSmoke: -0.5,
} as const;

// Particulate as refraction (§5.2 item 2): a screen-space field of large, wobbling lenses that bends the rendered sky beneath each one — magnified and swirled inside, each colour channel displaced by a different amount so the warp disperses into spectrum, a caustic at the rim. Not objects: the sky itself refracts. Keys to ABSOLUTE PM2.5 for now; this is the coarse-particle effect and moves to PM10 once that is a channel (DAT-13). Drift stops under prefers-reduced-motion (§5.4).
export const PARTICLES = {
  visibleFromUgm3: 35, // nothing below the Unhealthy-for-Sensitive-Groups line
  fullAtUgm3: 150,
  max: 28,                           // lenses in the field at full level
  radius: { min: 0.12, max: 0.42 },  // fraction of frame height; log-uniform — large
  strength: 0.55,                    // displacement at a lens's strongest ring, as a fraction of its radius
  swirl: 0.35,                       // tangential component: the sky inside turns, not only magnifies
  dispersion: 0.8,                   // per-channel displacement difference: red bends most, blue least — heavy spectral split
  wobble: 0.22,                      // the lens outline breathes: radius varies around the rim with angle and time
  wobbleHz: 0.35,
  rimLight: 0.07,                    // caustic brightness at the lens edge
  fallPerSec: 0.012,                 // uv units per second, downward
  swayPerSec: 0.012,
  // Frame-level chromatic aberration in the post chain, rising with the same level.
  aberrationMax: 0.006,
} as const;

// Grain (§5.2 item 2): fine particulate as film grain — per-frame noise in the post chain, rising with ABSOLUTE PM2.5 from ordinary levels, so a moderate day already has texture and a smoke day is rough. The fine-particle effect: stays on PM2.5 when the lenses move to PM10.
export const GRAIN = {
  visibleFromUgm3: 12, // the Good/Moderate line
  fullAtUgm3: 120,
  opacityMax: 0.45,
  curve: 0.8,
} as const;

// Night (D-20 addendum): the analytic models go dark and neutral with the sun down, but a clear night sky reads deep blue — skyglow, airglow and the eye's own shift. A blue gradient is screened over the sky from sunset to −6° (civil twilight's end) and held through the night; particulate damps it, because a hazy night is grey-orange, not blue. FIRST PASS — the harness has a strength slider.
export const NIGHT = {
  zenith: "#0a1e52",
  horizon: "#234a90",
  strength: 1,
  fullBelowDeg: -6,
  smokeDamping: 0.75,
} as const;

export const SKY_RANGES = {
  // Aerosol now covers ORDINARY HAZE only (D-20): the wildfire event is a composited plume, not a turbidity value. 2 = measured clear sky, 6 = Preetham's own hazy-evening figure. Must stay equal to HAZE_PATH in skyParams.ts — skyParamsFor reads these, so a change here without one there renders a different sky than the readout claims.
  turbidity: { clear: 2, suffocating: 6 },
  mieCoefficient: { clear: 0.005, high: 0.02 },
  mieDirectionalG: 0.86, // held, per the brief
  rayleigh: { lowO3: 0.6, highO3: 3.0 },
  bloomIntensity: { lowO3: 0.15, highO3: 1.4 },
  discBrightness: { lowO3: 0.6, highO3: 1.6 },
  starsCount: 2800, // over the whole sphere (the field rotates), so half are above the horizon at any hour: the same density as the 1,400-star hemisphere the sky was judged with
} as const;

// Glass material (§5.3) with the §5.4 accessibility fallbacks. These feed CSS custom properties; index.css holds the .glass rules and the three @media fallbacks.
export const GLASS = {
  blur: "18px",
  saturate: "1.6",
  // One neutral surface at every hour (D-25): a dark translucent fill with light text. Fill alpha is set by the worst case, white text on a white sky: 255·(1−0.62)+10·0.62 ≈ 103 luminance → 4.9:1 against the 0.9-alpha primary, so AA holds under any sky without a tone switch. Adaptive tones (D-24) were tried and dropped as unnecessary.
  fillAlpha: 0.62,
  fill: "10, 10, 22",
  edgeAlpha: 0.35,
  // Frosted (the content material): heavier blur and a touch more fill than the control material.
  frostedBlur: "28px",
  frostedFillAlpha: 0.7,
  // prefers-reduced-transparency: the material goes opaque enough to read without the scene
  fillAlphaOpaque: 0.9,
  blurOpaque: "36px",
} as const;

