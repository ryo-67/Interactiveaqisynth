// Sanity-pins the solar math against known NYC times (±15 min): June 7 2023 sunrise ~5:25 EDT, sunset ~20:24; Dec 21 sunrise ~7:17 EST, sunset ~16:32.
import { describe, it, expect } from "vitest";
import { solarTimes, tzOffsetFromTs } from "./solar";
import { NYC_LAT, NYC_LON } from "../utils/theme";

describe("solarTimes (NYC)", () => {
  it("June 7: sunrise ~5.4, sunset ~20.4 EDT", () => {
    const t = solarTimes("2023-06-07", NYC_LAT, NYC_LON, -4);
    expect(t.polar).toBeNull();
    expect(Math.abs(t.sunrise - 5.42)).toBeLessThan(0.25);
    expect(Math.abs(t.sunset - 20.4)).toBeLessThan(0.25);
    expect(t.solarNoon).toBeGreaterThan(12.7);
    expect(t.solarNoon).toBeLessThan(13.2);
  });

  it("Dec 21: sunrise ~7.28, sunset ~16.53 EST", () => {
    const t = solarTimes("2023-12-21", NYC_LAT, NYC_LON, -5);
    expect(Math.abs(t.sunrise - 7.28)).toBeLessThan(0.25);
    expect(Math.abs(t.sunset - 16.53)).toBeLessThan(0.25);
  });
});

describe("tzOffsetFromTs", () => {
  it("parses EDT and EST offsets", () => {
    expect(tzOffsetFromTs("2023-06-07T13:00:00-04:00")).toBe(-4);
    expect(tzOffsetFromTs("2023-01-07T13:00:00-05:00")).toBe(-5);
  });
});
