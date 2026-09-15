import { describe, expect, it } from "vitest";
import { hourOfTs, readingLabel } from "./time";

const thisYear = new Date().getFullYear();

describe("readingLabel", () => {
  it("time only", () => {
    expect(readingLabel("2026-09-14T14:00:00-04:00", false)).toBe("2pm");
    expect(readingLabel("2026-09-15T00:00:00-04:00", false)).toBe("12am");
    expect(readingLabel("2026-09-15T12:00:00-04:00", false)).toBe("12pm");
  });
  it("date and time, year only when it is not this year", () => {
    expect(readingLabel(`${thisYear}-09-14T14:00:00-04:00`, true)).toBe("Sep 14, 2pm");
    expect(readingLabel("2023-06-07T04:00:00-04:00", true)).toBe("Jun 7, 2023, 4am");
  });
  it("hour from the timestamp, not the index", () => {
    expect(hourOfTs("2026-09-14T23:00:00-04:00")).toBe(23);
  });
});
