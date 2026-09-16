import { describe, it, expect } from "vitest";
import { pm25ToAQI, nowcastPM25, hourlyAQI, hourlyAQISeries, dailyAQI, seriesAQI } from "./aqi";
import type { Day, HourReading } from "./SynthEngine";

const hour = (i: number, pm25: number | null, o3: number | null = null, no2: number | null = null, date = "2026-07-20"): HourReading => ({
  ts: `${date}T${String(i).padStart(2, "0")}:00:00-04:00`,
  pm25,
  o3,
  no2,
  source: { pm25: "own", o3: "own", no2: "own" },
});
const flat = (pm25: number | null, o3: number | null = null, no2: number | null = null, date?: string): Day => Array.from({ length: 24 }, (_, i) => hour(i, pm25, o3, no2, date));

describe("PM2.5 breakpoints (May 2024 table)", () => {
  it("puts the category lines where EPA does", () => {
    expect(pm25ToAQI(9.0)).toBe(50);
    expect(pm25ToAQI(9.1)).toBe(51);
    expect(pm25ToAQI(35.4)).toBe(100);
    expect(pm25ToAQI(55.5)).toBe(151);
    expect(pm25ToAQI(125.4)).toBe(200);
    expect(pm25ToAQI(225.5)).toBe(301);
    expect(pm25ToAQI(325.4)).toBe(500);
    expect(pm25ToAQI(400)).toBe(500);
  });
  it("truncates to one decimal before lookup and clamps instrument noise at 0", () => {
    expect(pm25ToAQI(9.09)).toBe(50); // 9.09 → 9.0, Good — rounding would have said Moderate
    expect(pm25ToAQI(-0.4)).toBe(0);
    expect(pm25ToAQI(null)).toBeNull();
  });
  it("is what 12.0 µg/m³ now reads: Moderate, not the old table's 50", () => {
    expect(Math.round(pm25ToAQI(12.0)!)).toBe(56);
  });
});

describe("nowcastPM25", () => {
  it("is the 12-hour mean when the air is steady", () => {
    expect(nowcastPM25(Array(12).fill(20))).toBeCloseTo(20, 9);
  });
  it("leans on the recent hours when the air is changing (weight floored at 0.5)", () => {
    // 11 hours at 10 then a jump to 100: range/max = 0.9 → w = 0.1 → floored to 0.5. The current hour carries weight 1, the previous 0.5, then 0.25 … so the NowCast sits well above the mean of 17.5.
    const v = nowcastPM25([...Array(11).fill(10), 100])!;
    const num = 100 + 10 * (0.5 + 0.25 + 0.125 + 0.0625 + 0.03125 + 0.015625 + 0.0078125 + 0.00390625 + 0.001953125 + 0.0009765625 + 0.00048828125);
    const den = 1 + 0.5 + 0.25 + 0.125 + 0.0625 + 0.03125 + 0.015625 + 0.0078125 + 0.00390625 + 0.001953125 + 0.0009765625 + 0.00048828125;
    expect(v).toBeCloseTo(num / den, 9);
    expect(v).toBeGreaterThan(50);
  });
  it("needs two of the last three hours", () => {
    expect(nowcastPM25([10, 10, 10, 10, null, 10, 10])).not.toBeNull();
    expect(nowcastPM25([10, 10, 10, 10, 10, null, 10])).not.toBeNull();
    expect(nowcastPM25([10, 10, 10, 10, 10, null, null])).toBeNull();
    expect(nowcastPM25([10, 10, 10, 10, null, 10, null])).toBeNull();
  });
  it("uses a shorter window at the start of the data and only the last 12 hours otherwise", () => {
    expect(nowcastPM25([30])).toBe(30);
    expect(nowcastPM25([...Array(20).fill(1000), ...Array(12).fill(5)])).toBeCloseTo(5, 9);
  });
});

describe("hourlyAQI: the highest sub-index", () => {
  it("is ozone when ozone is the worst and PM2.5 when particles are", () => {
    const ozone = flat(5, 80, 20); // 8-h mean 80 ppb → 101 + (80−71)/14·49 = 132.5 → 133; PM2.5 5 → 28; NO2 20 → 19
    expect(hourlyAQI(ozone, 12)).toBe(133);
    const smoke = flat(100, 30, 20); // PM2.5 100 → 151 + (100−55.5)/69.9·49 = 182.2 → 182
    expect(hourlyAQI(smoke, 12)).toBe(182);
  });
  it("still reports from ozone and NO2 when PM2.5 is missing, and null when nothing is", () => {
    expect(hourlyAQI(flat(null, 60, null), 12)).toBe(67); // 51 + (60−55)/15·49 = 67.3
    expect(hourlyAQI(flat(null, null, null), 12)).toBeNull();
  });
  it("sees the previous day through the series' prior hours", () => {
    const prior = flat(200, null, null, "2026-07-19");
    const day = flat(10, null, null);
    const withPrior = hourlyAQISeries(day, prior);
    const alone = hourlyAQISeries(day);
    expect(withPrior[0]!).toBeGreaterThan(alone[0]!); // midnight still carries last evening's smoke
    expect(withPrior[23]).toBe(alone[23]); // by 11 pm the 12-hour window is the day's own
    expect(withPrior.length).toBe(24);
    // Ozone needs 6 of its 8 hours: without a previous day the first five hours have no ozone sub-index, with one they do.
    const o3day = flat(null, 80, null);
    expect(hourlyAQISeries(o3day)[4]).toBeNull();
    expect(hourlyAQISeries(o3day)[5]).toBe(133);
    expect(hourlyAQISeries(o3day, flat(null, 80, null, "2026-07-19"))[0]).toBe(133);
  });
});

describe("dailyAQI: EPA's daily statistics", () => {
  it("takes PM2.5 from the 24-hour mean, not the peak hour", () => {
    const day = flat(10).map((h, i) => (i === 14 ? { ...h, pm25: 200 } : h)); // mean 17.9 → 51 + (17.9−9.1)/26.3·49 = 67.4
    expect(dailyAQI(day)).toBe(67);
  });
  it("takes ozone from the highest 8-hour window starting 7 am or later, reaching into the next day", () => {
    const day = flat(0, 40).map((h, i) => (i >= 20 ? { ...h, o3: 90 } : h)); // 8 pm–11 pm at 90
    const next = flat(0, 90, null, "2026-07-21"); // the window starting 8 pm is 8 hours of 90 only with the next morning loaded
    expect(dailyAQI(day)).toBe(108); // best window within the day starts 6 pm: 6 of its 8 hours loaded (EPA's 75%), mean 73.3 → truncated 73 → 101 + (73−71)/14·49 = 108
    expect(dailyAQI(day, next)).toBe(Math.round(151 + ((90 - 86) / 19) * 49)); // 8 pm window at 90 → 161
  });
  it("takes NO2 from the highest hour", () => {
    const day = flat(0, 0, 30).map((h, i) => (i === 8 ? { ...h, no2: 120 } : h)); // 101 + (120−101)/259·49 = 104.6
    expect(dailyAQI(day)).toBe(105);
  });
  it("refuses a PM2.5 mean from a partial day but still reports the other pollutants", () => {
    const partial = flat(300, 40, 10).map((h, i) => (i >= 8 ? { ...h, pm25: null } : h)); // 8 of 24 hours of smoke
    expect(dailyAQI(partial)).toBe(37); // ozone 40 → 37; the morning's particles do not become the day's number
    expect(dailyAQI([])).toBeNull();
  });
});

describe("seriesAQI", () => {
  it("reports current from the latest hour with any reading", () => {
    const day = flat(20, 30, 10).map((h, i) => (i >= 20 ? { ...h, pm25: null, o3: null, no2: null } : h));
    const s = seriesAQI(day);
    expect(s.current).toBe(s.hourly[19]);
    expect(s.hourly.length).toBe(24);
    expect(s.hourly[22]).toBeNull();
    expect(s.daily).not.toBeNull();
  });
});
