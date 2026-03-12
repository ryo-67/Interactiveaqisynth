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