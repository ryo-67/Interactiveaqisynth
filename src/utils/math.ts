// math — the few numeric helpers the page uses everywhere, in one place (2026-10-14). They had been redefined file by file, and a curve that two parts of the page must share (the graph's morph and the routing packets, the sun's glide) is only the same curve if it is the same function.

/** Clamp to 0..1. */
export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** Linear interpolation from a to b; t is not clamped. */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Quadratic ease-in-out over 0..1: slow out, fast through the middle, slow in. */
export const easeInOutQuad = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** v wrapped into 0..period (degrees: 360; hours of the day: 24). */
export const wrap = (v: number, period: number): number => ((v % period) + period) % period;

/** The signed step from a to b the short way round a circle of the given period, in −period/2..period/2; exactly half a turn keeps the sign of b − a (11 pm to 11 am goes back 12 hours, 11 am to 11 pm forward). The hue mix, the sun's path and the clock's glide each had their own copy. */
export const wrapDelta = (a: number, b: number, period: number): number => {
  let d = (b - a) % period;
  if (d > period / 2) d -= period;
  if (d < -period / 2) d += period;
  return d;
};
