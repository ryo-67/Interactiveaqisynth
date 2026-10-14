import { describe, it, expect } from "vitest";
import { wrap, wrapDelta } from "./math";

describe("the short way round a circle", () => {
  it("takes the shorter step, either way", () => {
    expect(wrapDelta(23, 1, 24)).toBe(2);
    expect(wrapDelta(1, 23, 24)).toBe(-2);
    expect(wrapDelta(350, 10, 360)).toBe(20);
  });
  it("keeps the sign of b − a at exactly half a turn, so the clock glides the way the hours run", () => {
    expect(wrapDelta(11, 23, 24)).toBe(12);
    expect(wrapDelta(23, 11, 24)).toBe(-12);
  });
  it("wraps into one turn", () => {
    expect(wrap(25, 24)).toBe(1);
    expect(wrap(-1, 24)).toBe(23);
    expect(wrap(-30, 360)).toBe(330);
  });
});
