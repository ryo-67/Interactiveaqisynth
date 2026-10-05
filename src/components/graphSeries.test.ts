import { describe, expect, it } from "vitest";
import { monotoneCurve, fitTicks } from "./graphSeries";

describe("monotoneCurve", () => {
  const vals = [10, 12, 30, 80, 200, 180, 60, 40, 42, 41];
  const f = monotoneCurve(vals);
  it("passes through every point", () => {
    vals.forEach((v, i) => expect(f(i)).toBeCloseTo(v, 9));
  });
  it("never overshoots between two points", () => {
    for (let i = 0; i < vals.length - 1; i++) {
      const lo = Math.min(vals[i], vals[i + 1]), hi = Math.max(vals[i], vals[i + 1]);
      for (let t = 0; t <= 1; t += 0.05) { const v = f(i + t)!; expect(v).toBeGreaterThanOrEqual(lo - 1e-9); expect(v).toBeLessThanOrEqual(hi + 1e-9); }
    }
  });
  it("is monotone between two points", () => {
    for (let i = 0; i < vals.length - 1; i++) {
      const dir = Math.sign(vals[i + 1] - vals[i]);
      let prev = f(i)!;
      for (let t = 0.05; t <= 1; t += 0.05) { const v = f(i + t)!; if (dir !== 0) expect(Math.sign(v - prev + 1e-12 * dir)).toBe(dir); prev = v; }
    }
  });
  it("breaks at null hours", () => {
    const g = monotoneCurve([1, 2, null, 4, 5]);
    expect(g(1.5)).toBeNull();
    expect(g(2.5)).toBeNull();
    expect(g(3.5)).toBeCloseTo(4.5, 6);
  });
});

describe("fitTicks", () => {
  const aqi = [50, 100, 150, 200, 300, 500];
  it("keeps every label on a tall plot", () => {
    expect(fitTicks(aqi, 500, 500, 21)).toEqual(aqi); // 50 AQI is 50 px apart: all fit
  });
  it("thins labels on a short plot, keeping the top one", () => {
    // 100 px for 0..500: 50 AQI is 10 px. Top 500 kept; 300 is 40 px below it; 200 is 20 px below 300 (< 21) so dropped; 150 is 30 below 300, kept; 100 and 50 are within 21 of 150 and of each other in turn
    expect(fitTicks(aqi, 500, 100, 21)).toEqual([150, 300, 500]);
  });
  it("always keeps the highest tick that is on the scale", () => {
    expect(fitTicks([50, 100], 100, 10, 21)).toEqual([100]);
    expect(fitTicks([50, 100, 150], 100, 200, 21)).toEqual([50, 100]); // 150 is off a 0..100 scale
  });
  it("returns nothing for no ticks", () => {
    expect(fitTicks([], 100, 200, 21)).toEqual([]);
  });
});
