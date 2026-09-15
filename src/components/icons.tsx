// icons — the few glyphs the page uses, from Lucide (https://lucide.dev, ISC licence), one consistent set: play, pause, calendar and the chevrons (2026-09-15). The paths are Lucide's own on its 24-unit grid, 2-unit round strokes, drawn inline in currentColor so they take the chip's colour; no icon dependency is added for five glyphs. Sized by the caller.
import React from "react";

interface IconProps { size?: number; strokeWidth?: number; style?: React.CSSProperties }
const base = (size: number, strokeWidth: number, style?: React.CSSProperties) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, focusable: false as const, style: { flex: "0 0 auto", display: "block", ...style } });

// Lucide's play triangle sits at x 6–20 on the 24 grid; its visual centre (a third of the way from the flat side) is left of the box's, so it is shifted right by one unit to read centred in the round button.
export const PlayIcon = ({ size = 16, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size, strokeWidth, style)}><polygon points="6 3 20 12 6 21 6 3" fill="currentColor" transform="translate(1 0)" /></svg>
);
export const PauseIcon = ({ size = 16, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size, strokeWidth, style)}><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" /><rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" /></svg>
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
export const ChevronUpIcon = ({ size = 14, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size, strokeWidth, style)}><path d="m18 15-6-6-6 6" /></svg>
);
