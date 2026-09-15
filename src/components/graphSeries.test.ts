import { describe, expect, it } from "vitest";
import { monotoneCurve } from "./graphSeries";

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
