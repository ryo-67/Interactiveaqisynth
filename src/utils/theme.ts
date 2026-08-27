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

