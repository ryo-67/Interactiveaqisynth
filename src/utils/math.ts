// math — the few numeric helpers the page uses everywhere, in one place (2026-10-14). They had been redefined file by file, and a curve that two parts of the page must share (the graph's morph and the routing packets, the sun's glide) is only the same curve if it is the same function.

/** Clamp to 0..1. */
export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** Linear interpolation from a to b; t is not clamped. */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Quadratic ease-in-out over 0..1: slow out, fast through the middle, slow in. */
export const easeInOutQuad = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
