import { describe, it, expect } from "vitest";
import { barSteps, euclidHit, barK } from "./euclid";
import { detuneSigma } from "./SynthEngine";

describe("barSteps (the monitor's lane is the engine's pattern)", () => {
  it("matches euclidHit step for step, with rotation", () => {
    for (const k of [3, 5, 8, 11]) {
      for (const rotation of [0, 4, 8, 12]) {
        const steps = barSteps(k, rotation)!;
        expect(steps.length).toBe(16);
        expect(steps.filter(Boolean).length).toBe(k);
        steps.forEach((hit, i) => expect(hit).toBe(euclidHit(i, k, 16, rotation)));
      }
    }
  });
  it("is null when the bar has no pulse", () => {
    expect(barSteps(null, 0)).toBeNull();
    expect(barSteps(barK([null, null, null, null]), 0)).toBeNull();
  });
});

describe("detuneSigma (§3.6)", () => {
  it("is 40·min(pm25n, 1.5) cents: in tune on clean air, 60 at the ceiling", () => {
    expect(detuneSigma(0)).toBe(0);
    expect(detuneSigma(null)).toBe(0);
    expect(detuneSigma(0.5)).toBe(20);
    expect(detuneSigma(1.5)).toBe(60);
    expect(detuneSigma(13)).toBe(60); // June 7 sits far off the top; the ceiling holds
  });
});
