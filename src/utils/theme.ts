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

// The standard AQI categories (EPA, six), D-23: the graph's AQI line and its legend use these, because visitors read AQI tools against this palette. The five tier colours above remain the piece's own voice on the mood word. Names live in content.ts.
export const AQI_CATEGORIES = [
  { max: 50, color: "#00e400" },
  { max: 100, color: "#ffff00" },
  { max: 150, color: "#ff7e00" },
  { max: 200, color: "#ff0000" },
  { max: 300, color: "#8f3f97" },
  { max: 500, color: "#7e0023" },
] as const;

export function aqiCategoryColor(aqi: number): string {
  for (const c of AQI_CATEGORIES) if (aqi <= c.max) return c.color;
  return AQI_CATEGORIES[AQI_CATEGORIES.length - 1].color;
}

// The graph (§5.3 score panel, rebuilt): four labelled tracks on one hour-aligned x-scale, the pulse row beneath, one playhead through all of them.
export const GRAPH = {
  // One tab at a time, so the tab gets real height: the line is the thing being read.
  tabHeight: { laptop: 240, phone: 170 },
  pulseRowHeight: { laptop: 30, phone: 24 },
  axisHeight: 22,
  labelGutter: 6,
  lineWidth: { aqi: 2.5, channel: 1.75 },
  pulseFlashMs: 140, // a hit mark brightens for this long after the engine fires it
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
  micro: { size: "10px", line: 1.4 }, // hour marks, source line
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
  // Wildfire smoke at midday reads bright orange-tan, not brown: large particles scatter forward and absorb blue far more than red, so the sky loses its blue and the light arrives reddened while the scene stays bright. Brown belongs near the horizon, where the sight-line through the plume is longest.
  hueDeg: 30,            // orange; the hue barely moves — brown is this hue at lower lightness, not a different one
  hueDriftDeg: -6,       // slight drift toward red as the plume thickens
  // Attenuation (multiply): a warm, LIGHT tint. It strips blue without crushing luminance — capped so a full plume at midday is never darker than the clear sky at the same hour.
  attenuation: {
    saturation: 0.55,
    lightness: { thin: 0.94, thick: 0.74 },
    alphaMax: 0.5,
  },
  // In-scatter (screen): the sunlight the plume throws back at the viewer. Weighted above attenuation, so the sky brightens as smoke rises rather than dimming. Deeper and more saturated toward the horizon, which is where it tips into brown.
  inscatter: {
    saturation: { thin: 0.55, thick: 0.85 },
    lightness: { zenith: 0.6, horizon: 0.46 },
    alphaMax: 0.92,
  },
  zenithFactor: 0.55,    // fraction of horizon density still present at the top of the frame: midday smoke fills the whole sky
  horizonBias: 1.8,      // exponent on the vertical ramp
} as const;

export const SKY_RANGES = {
  // Aerosol now covers ORDINARY HAZE only (D-20): the wildfire event is a composited plume, not a turbidity value. 2 = measured clear sky, 6 = Preetham's own hazy-evening figure. Must stay equal to HAZE_PATH in skyParams.ts — skyParamsFor reads these, so a change here without one there renders a different sky than the readout claims.
  turbidity: { clear: 2, suffocating: 6 },
  mieCoefficient: { clear: 0.005, high: 0.02 },
  mieDirectionalG: 0.86, // held, per the brief
  rayleigh: { lowO3: 0.6, highO3: 3.0 },
  bloomIntensity: { lowO3: 0.15, highO3: 1.4 },
  discBrightness: { lowO3: 0.6, highO3: 1.6 },
  starsCount: 1400,
} as const;

// Glass material (§5.3) with the §5.4 accessibility fallbacks. These feed CSS custom properties; index.css holds the .glass rules and the three @media fallbacks.
export const GLASS = {
  blur: "18px",
  saturate: "1.6",
  // The material adapts to its local background (§5.3, as Apple's does): a light fill with dark text over a dark sky, a dark fill with light text over a bright one. Each panel samples the rendered sky under its own rectangle (SkyView's luminance probe) and switches with hysteresis. Fill alpha is set so text holds AA at the worst case for each tone — white text on a white sky through the dark fill: 255·(1−0.62)+10·0.62 ≈ 103 → 4.9:1 against the 0.9-alpha primary.
  fillAlpha: 0.62,
  fillDark: "10, 10, 22",
  fillLight: "255, 255, 255",
  edgeAlpha: 0.35,
  // Frosted (the content material): heavier blur and a touch more fill than the control material.
  frostedBlur: "28px",
  frostedFillAlpha: 0.7,
  // The probe's switch points on relative luminance (0..1) of the sky under the panel, with hysteresis so a panel does not flicker at dusk.
  toLightAbove: 0.5,
  toDarkBelow: 0.38,
  // Sampling is six pixel reads per panel, one GPU sync per sample; at 120 ms that is well inside a beat (667 ms), so a panel answers a sky change before the next hour lands. Reading every frame would stall the pipeline every frame.
  sampleEveryMs: 120,
  transitionMs: 140,
  // prefers-reduced-transparency: both materials go frosted-opaque
  fillAlphaOpaque: 0.85,
  blurOpaque: "36px",
} as const;

