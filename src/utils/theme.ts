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
    textSecondary: isDark
      ? "rgba(255,255,255,0.58)"
      : "rgba(0,0,0,0.58)",
    textMuted: isDark
      ? "rgba(255,255,255,0.35)"
      : "rgba(0,0,0,0.38)",
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

// 24 sky stops, one per clock hour: [zenith, mid, horizon]. Authored from photographic intuition (V1, to be tuned by eye); dawn 4–6 and dusk 18–20 are the least confident ramps.
export const SKY_STOPS: ReadonlyArray<readonly [string, string, string]> = [
  ["#050510", "#0a0a1c", "#12122a"], // 0 — deep night
  ["#04040e", "#090919", "#101026"], // 1
  ["#04040e", "#090919", "#101026"], // 2
  ["#050511", "#0a0a1b", "#131230"], // 3
  ["#070818", "#101334", "#2a2450"], // 4 — first light
  ["#0b1230", "#23305e", "#6a5378"], // 5
  ["#12305e", "#4a6a9e", "#c98d6e"], // 6 — dawn
  ["#2a5a96", "#6f95c4", "#e8b98a"], // 7
  ["#3c74b4", "#82a9d4", "#c9d4e4"], // 8
  ["#4482c4", "#8fb4dc", "#c2d6ea"], // 9
  ["#4a8ad0", "#96bce2", "#c8dcf0"], // 10
  ["#4e90d8", "#9cc2e8", "#cce0f4"], // 11
  ["#5094dc", "#a0c6ec", "#d0e4f8"], // 12 — noon cerulean
  ["#5092da", "#9ec4ea", "#cee2f6"], // 13
  ["#4c8cd2", "#98bee4", "#cadef2"], // 14
  ["#4682c6", "#8fb2da", "#c4d6ec"], // 15
  ["#3f76b6", "#84a2cc", "#c2c8dc"], // 16
  ["#3a66a4", "#7e92be", "#d0b49a"], // 17 — light starts to warm
  ["#2f5490", "#7079aa", "#e0a072"], // 18 — dusk
  ["#1e3a70", "#54588e", "#d87d52"], // 19 — sunset amber
  ["#101c48", "#2c2c60", "#84486a"], // 20 — civil dusk
  ["#080a20", "#141438", "#2c2050"], // 21
  ["#050512", "#0b0b20", "#161232"], // 22
  ["#050510", "#0a0a1c", "#12122a"], // 23 — night
];

// Haze color-temperature ramp (§5.2 item 2): clear → white-gray → amber, driven by PM2.5, not tier. tintAlphaCap keeps the sun visible at any density.
export const HAZE_RAMP = {
  stops: ["#bcd4e8", "#c8c4bc", "#c07d3a"] as const,
  tintAlphaCap: 0.42,
  contrastFlattenCap: 0.5, // horizon-weighted contrast falloff at max PM2.5
} as const;

// Particle budget (§5.6, O-14). Phone is half the laptop budget by rule.
export const PARTICLE_BUDGET = { laptop: 900, phone: 450 } as const;

// Sun geometry (§5.2 item 1). Apex fraction is of viewport height above the horizon line at normalized O3 = 1.
export const SUN = {
  radiusFrac: 0.045, // of min(viewport w, h)
  bloomScale: 3.2, // bloom radius as a multiple of the disc
  bloomAlpha: 0.35,
  apexFrac: 0.667, // top of arc reaches the upper third at o3n = 1
  nightDim: 0.25, // disc alpha as it sits at the horizon at night stops
} as const;

// City band (§5.2 item 3, O-15: abstract blocks, not a recognizable skyline).
export const CITY = {
  bandFrac: 0.2, // bottom fifth
  blockCount: 26,
  silhouette: "#07070e",
  lightColor: "#ffd98a",
  trafficColor: "#e8a05a",
  flashMs: 90, // pulse-hit flicker duration
} as const;

// Glass material (§5.3) with the §5.4 accessibility fallbacks. These feed CSS custom properties; index.css holds the .glass rules and the three @media fallbacks.
export const GLASS = {
  blur: "18px",
  saturate: "1.6",
  fillAlpha: 0.16,
  edgeAlpha: 0.35,
  // prefers-reduced-transparency: both materials go frosted-opaque
  fillAlphaOpaque: 0.85,
  blurOpaque: "36px",
} as const;

