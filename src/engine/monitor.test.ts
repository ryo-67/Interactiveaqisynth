import { describe, it, expect } from "vitest";
import { barSteps, euclidHit, barK } from "./euclid";
import { detuneSigma, tierIndexOf, TIERS } from "./scales";

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

describe("detuneSigma (§3.6, D-44): piecewise-linear in the hour's PM2.5 AQI", () => {
  it("passes through the anchors and holds above the last", () => {
    expect(detuneSigma(0)).toBe(0);
    expect(detuneSigma(null)).toBe(0);
    expect(detuneSigma(100)).toBe(10);
    expect(detuneSigma(150)).toBe(20);
    expect(detuneSigma(200)).toBe(40);
    expect(detuneSigma(300)).toBe(60);
    expect(detuneSigma(400)).toBe(100);
    expect(detuneSigma(500)).toBe(100);
  });
  it("slopes inside a tier: 101 and 149 do not share a σ", () => {
    expect(detuneSigma(101)).toBeCloseTo(10.2, 5);
    expect(detuneSigma(149)).toBeCloseTo(19.8, 5);
    expect(detuneSigma(250)).toBe(50);
  });
});

describe("six tiers on EPA's lines (D-44)", () => {
  it("steps at 50, 100, 150, 200, 300", () => {
    expect(TIERS.length).toBe(6);
    expect([0, 50, 51, 100, 101, 150, 151, 200, 201, 300, 301, 500].map(tierIndexOf)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });
  it("orders the scales by loss of centre and rings only the top tier", () => {
    expect(TIERS.map((t) => t.scaleName)).toEqual(["Major", "Major Pentatonic", "Dorian", "Phrygian", "Whole Tone", "Chromatic"]); // D-46: Good is Major, Moderate its pentatonic
    expect(TIERS.map((t) => t.melodyRelease)).toEqual([0.3, 0.3, 0.3, 0.3, 0.3, 1.2]);
  });
});
