import { describe, expect, it } from "vitest";
import { hourOfTs, readingLabel, daysInMonth, addMonths, monthWindow } from "./time";
import { archiveFile } from "./archiveFiles";

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

describe("calendar months", () => {
  it("counts a month's days, leap February included", () => {
    expect([daysInMonth("2026-01"), daysInMonth("2026-02"), daysInMonth("2024-02"), daysInMonth("2026-04")]).toEqual([31, 28, 29, 30]);
  });
  it("steps across a year either way", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-07", 0)).toBe("2026-07");
  });
  it("asks EPA for a month up to yesterday, and not at all before it begins", () => {
    expect(monthWindow("2026-06", "2026-10-13")).toEqual({ from: "2026-06-01", to: "2026-06-30" });
    expect(monthWindow("2026-10", "2026-10-13")).toEqual({ from: "2026-10-01", to: "2026-10-13" });
    expect(monthWindow("2026-11", "2026-10-13")).toBeNull();
  });
});

describe("archive file names", () => {
  it("are the borough in lower case with dashes, then the year", () => {
    expect(archiveFile("Staten Island", 2023)).toBe("staten-island-2023.json");
    expect(archiveFile("Citywide", 2026)).toBe("citywide-2026.json");
  });
});

