import { describe, it, expect } from "vitest";
import { channelProvenance, channelSuffixes } from "./channelSource";
import { SOURCE_SUFFIX_CITYWIDE, SOURCE_SUFFIX_TYPICAL } from "../content";
import type { Day, HourReading } from "../engine/SynthEngine";

type Tag = HourReading["source"]["pm25"];
const hour = (pm25: Tag | null, o3: Tag | null, no2: Tag | null): HourReading => ({
  ts: "2026-07-20T12:00:00-04:00",
  pm25: pm25 ? 10 : null,
  o3: o3 ? 30 : null,
  no2: no2 ? 15 : null,
  source: { pm25: pm25 ?? "own", o3: o3 ?? "own", no2: no2 ?? "own" },
});

describe("channel provenance (D-16, D-18)", () => {
  it("reads a channel the borough reports itself as neither borrowed nor typical", () => {
    const day: Day = [hour("own", "own", "own")];
    expect(channelProvenance(day).o3).toEqual({ typical: false, borrowed: false });
    expect(channelSuffixes(day)).toEqual({});
  });
  it("reads a channel carried only as the citywide value as borrowed (Brooklyn's O3)", () => {
    const day: Day = [hour("own", "citywide", "own"), hour("own", "citywide", "own")];
    expect(channelProvenance(day).o3).toEqual({ typical: false, borrowed: true });
    expect(channelSuffixes(day)).toEqual({ o3: SOURCE_SUFFIX_CITYWIDE });
  });
  it("does not call a channel borrowed if any hour is the borough's own", () => {
    const day: Day = [hour("own", "own", "own"), hour("own", "citywide", "own")];
    expect(channelProvenance(day).o3.borrowed).toBe(false);
  });
  it("reports live NO2 as both typical and borrowed, and the suffix names it typical", () => {
    const day: Day = [hour("own", "own", "typical"), hour("own", "own", "citywide")];
    expect(channelProvenance(day).no2).toEqual({ typical: true, borrowed: true });
    expect(channelSuffixes(day)).toEqual({ no2: SOURCE_SUFFIX_TYPICAL });
  });
  it("ignores hours where the channel is absent", () => {
    const day: Day = [hour("own", null, "own"), hour("own", null, "own")];
    expect(channelProvenance(day).o3).toEqual({ typical: false, borrowed: false });
  });
});
