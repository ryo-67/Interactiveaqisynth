// icons — the few glyphs the page uses, from Lucide (https://lucide.dev, ISC licence), one consistent set: play, pause, calendar and the chevrons (2026-09-15). The paths are Lucide's own on its 24-unit grid, 2-unit round strokes, drawn inline in currentColor so they take the chip's colour; no icon dependency is added for five glyphs. Sized by the caller.
import React from "react";

interface IconProps { size?: number; strokeWidth?: number; style?: React.CSSProperties }
const base = (size: number, strokeWidth: number, style?: React.CSSProperties) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, focusable: false as const, style: { flex: "0 0 auto", display: "block", ...style } });

// Lucide's play and pause, current shapes (the rounded triangle, the two 5-wide bars), filled with the current colour rather than stroked, so they read as solid glyphs at 16 px. The triangle's visual centre (a third of the way from its flat side) sits left of the box's, so it is shifted right by one unit to read centred in the round button.
export const PlayIcon = ({ size = 16, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size, strokeWidth, style)}><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" fill="currentColor" transform="translate(1 0)" /></svg>
);
export const PauseIcon = ({ size = 16, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size, strokeWidth, style)}><rect x="14" y="3" width="5" height="18" rx="1" fill="currentColor" /><rect x="5" y="3" width="5" height="18" rx="1" fill="currentColor" /></svg>
);
export const CalendarIcon = ({ size = 14, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size, strokeWidth, style)}><path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /></svg>
);
export const ChevronLeftIcon = ({ size = 14, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size, strokeWidth, style)}><path d="m15 18-6-6 6-6" /></svg>
);
export const ChevronRightIcon = ({ size = 14, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size, strokeWidth, style)}><path d="m9 18 6-6-6-6" /></svg>
);
export const ChevronDownIcon = ({ size = 14, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size, strokeWidth, style)}><path d="m6 9 6 6 6-6" /></svg>
);
export const MoveHorizontalIcon = ({ size = 14, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size, strokeWidth, style)}><path d="m18 8 4 4-4 4" /><path d="M2 12h20" /><path d="m6 8-4 4 4 4" /></svg>
);
// The drag's four arrows (D-45): Lucide's move-up, move-down, move-left, move-right, the cursor's glyph while a page drag is far enough to switch on release.
export const MoveUpIcon = ({ size = 14, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size, strokeWidth, style)}><path d="M8 6L12 2L16 6" /><path d="M12 2V22" /></svg>
);
export const MoveDownIcon = ({ size = 14, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size, strokeWidth, style)}><path d="M8 18L12 22L16 18" /><path d="M12 2V22" /></svg>
);
export const MoveLeftIcon = ({ size = 14, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size, strokeWidth, style)}><path d="M6 8L2 12L6 16" /><path d="M2 12H22" /></svg>
);
export const MoveRightIcon = ({ size = 14, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size, strokeWidth, style)}><path d="M18 8L22 12L18 16" /><path d="M2 12H22" /></svg>
);
// The two page icons (D-43): Lucide's cloud-sun for the scene and audio-lines for the monitor.
// Lucide's notebook-text: the bound notebook with ruled lines, stroked, for the Patch notes button (Shoro, 2026-09-16).
export const NotebookTextIcon = ({ size = 16, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size, strokeWidth, style)}><path d="M2 6h4" /><path d="M2 10h4" /><path d="M2 14h4" /><path d="M2 18h4" /><rect width="16" height="20" x="4" y="2" rx="2" /><path d="M9.5 8h5" /><path d="M9.5 12H16" /><path d="M9.5 16H14" /></svg>
);
export const CloudSunIcon = ({ size = 20, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size, strokeWidth, style)}><path d="M12 2v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="M20 12h2" /><path d="m19.07 4.93-1.41 1.41" /><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128" /><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z" /></svg>
);
export const AudioLinesIcon = ({ size = 20, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size, strokeWidth, style)}><path d="M2 10v3" /><path d="M6 6v11" /><path d="M10 3v18" /><path d="M14 8v7" /><path d="M18 5v13" /><path d="M22 10v3" /></svg>
);
export const ChevronUpIcon = ({ size = 14, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size, strokeWidth, style)}><path d="m18 15-6-6-6 6" /></svg>
);
