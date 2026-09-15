import { describe, it, expect } from "vitest";
import { barAndStep, euclidHit } from "./euclid";

const PPQ = 192;

describe("barAndStep", () => {
  it("the last two sixteenths of a bar stay in that bar", () => {
    // beat 3.5 and 3.75 of bar 0 (ticks 672, 720) used to round to beat 4 → bar 1.
    expect(barAndStep(3.5 * PPQ, PPQ)).toEqual({ bar: 0, step: 14 });
    expect(barAndStep(3.75 * PPQ, PPQ)).toEqual({ bar: 0, step: 15 });
    expect(barAndStep(4 * PPQ, PPQ)).toEqual({ bar: 1, step: 0 });
  });
  it("a scheduler that fires a hair early still lands on the intended step", () => {
    expect(barAndStep(4 * PPQ - 3, PPQ)).toEqual({ bar: 1, step: 0 });
    expect(barAndStep(3.75 * PPQ + 3, PPQ)).toEqual({ bar: 0, step: 15 });
  });
  it("wraps after six bars", () => {
    expect(barAndStep(24 * PPQ, PPQ)).toEqual({ bar: 0, step: 0 });
    expect(barAndStep(23.75 * PPQ, PPQ)).toEqual({ bar: 5, step: 15 });
  });
  it("Bjorklund places exactly k hits", () => {
    for (let k = 3; k <= 11; k++) {
      let hits = 0;
      for (let s = 0; s < 16; s++) if (euclidHit(s, k, 16, 4)) hits++;
      expect(hits).toBe(k);
    }
  });
});
