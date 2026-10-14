import { describe, it, expect } from "vitest";
import { pageStatus, mockStatus, type StatusInputs } from "./pageStatus";

const calm: StatusInputs = { soundFailed: false, date: null, dayFailed: false, dayWaiting: false, live: true, liveStatus: "ready", liveEmpty: false };

describe("the page status (D-69)", () => {
  it("says nothing when live has readings", () => {
    expect(pageStatus(calm)).toEqual({ kind: "none" });
  });
  it("puts sound that did not start above everything", () => {
    expect(pageStatus({ ...calm, soundFailed: true, liveStatus: "unavailable" })).toEqual({ kind: "no-sound" });
    expect(pageStatus({ ...calm, soundFailed: true, live: false, date: "2023-06-07", dayFailed: true })).toEqual({ kind: "no-sound" });
  });
  it("hands the live feed's own line to LiveStatus while AirNow is asked or unreachable", () => {
    expect(pageStatus({ ...calm, liveStatus: "loading" })).toEqual({ kind: "live-feed" });
    expect(pageStatus({ ...calm, liveStatus: "unavailable", liveEmpty: true })).toEqual({ kind: "live-feed" });
  });
  it("says a live answer with nothing measured once AirNow has answered", () => {
    expect(pageStatus({ ...calm, liveEmpty: true })).toEqual({ kind: "no-readings" });
  });
  it("puts a failed day above a waiting one, and names the day", () => {
    const day = { ...calm, live: false, date: "2026-08-03" };
    expect(pageStatus({ ...day, dayFailed: true, dayWaiting: true })).toEqual({ kind: "day-failed", date: "2026-08-03" });
    expect(pageStatus({ ...day, dayWaiting: true })).toEqual({ kind: "day-waiting", date: "2026-08-03" });
  });
  it("ignores the live feed's state on a chosen day, and a day's flags on live", () => {
    expect(pageStatus({ ...calm, live: false, date: "2023-06-07", liveStatus: "unavailable", liveEmpty: true })).toEqual({ kind: "none" });
    expect(pageStatus({ ...calm, dayFailed: true, dayWaiting: true })).toEqual({ kind: "none" });
  });
});

describe("the dev mocks", () => {
  it("force their state, naming a fitting day when none is chosen", () => {
    expect(mockStatus("day-failed", null)).toEqual({ kind: "day-failed", date: "2023-06-07" });
    expect(mockStatus("day-loading", "2025-01-02")).toEqual({ kind: "day-waiting", date: "2025-01-02" });
    expect(mockStatus("no-readings", null)).toEqual({ kind: "no-readings" });
  });
  it("leave the screen mocks and no mock to the page", () => {
    expect(mockStatus("crashed", null)).toBeNull();
    expect(mockStatus(null, null)).toBeNull();
  });
});
