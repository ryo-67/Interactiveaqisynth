import { describe, it, expect } from "vitest";
import { pulseSteps, STEPS_PER_HOUR } from "./graphPulse";
import { barK, euclidHit } from "../engine/euclid";
import { normalize } from "../engine/contour";
import { PHASE0_DAYS, QUEENS_2023_ANCHORS } from "../fixtures/phase0-days";

// The graph must draw exactly what the engine plays: same k per bar, same rotation, same Bjorklund.
describe("pulseSteps parity with the engine", () => {
  for (const fx of PHASE0_DAYS) {
    it(`${fx.label}: 4 steps per hour, hits match euclidHit with rotation (bar·4) % 16`, () => {
      const steps = pulseSteps(fx.day, QUEENS_2023_ANCHORS);
      expect(steps.length).toBe(fx.day.length * STEPS_PER_HOUR);
      for (let b = 0; b < Math.ceil(fx.day.length / 4); b++) {
        const hours = fx.day.slice(b * 4, b * 4 + 4);
        const k = barK(hours.map((h) => normalize(h.no2, QUEENS_2023_ANCHORS.no2)));
        for (let s = 0; s < hours.length * 4; s++) {
          const expected = k == null ? null : euclidHit(s, k, 16, (b * 4) % 16);
          expect(steps[b * 16 + s]).toBe(expected);
        }
      }
    });
  }

  it("a bar with k hits has exactly k hits", () => {
    const day = PHASE0_DAYS[0].day;
    const steps = pulseSteps(day, QUEENS_2023_ANCHORS);
    for (let b = 0; b < Math.floor(day.length / 4); b++) {
      const hours = day.slice(b * 4, b * 4 + 4);
      const k = barK(hours.map((h) => normalize(h.no2, QUEENS_2023_ANCHORS.no2)));
      const hits = steps.slice(b * 16, b * 16 + 16).filter((x) => x === true).length;
      expect(hits).toBe(k ?? 0);
    }
  });
});
