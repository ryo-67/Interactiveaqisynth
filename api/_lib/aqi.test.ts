// Pins the §4.4/D-16 transform rules: per-borough max across sites, citywide mean of reporting boroughs, substitution with provenance, null when nobody reports, and the New York state filter.
import { describe, it, expect } from "vitest";
import { toBoroughHours, seriesAQI, pm25ToAQI, utcToNyIso, type SiteHourRow } from "./aqi";

const H0 = "2026-06-01T00:00:00-04:00";
const H1 = "2026-06-01T01:00:00-04:00";
const AXIS = [H0, H1];

// Three boroughs (Bronx 005, Brooklyn 047, Queens 081), two hours. Brooklyn has no O3 at all (its real monitoring gap). Queens has two PM2.5 sites in hour 0. One New Jersey row must be ignored.
const rows: SiteHourRow[] = [
  { stateFips: "36", countyFips: "005", pollutant: "pm25", ts: H0, value: 10 },
  { stateFips: "36", countyFips: "005", pollutant: "o3", ts: H0, value: 30 },
  { stateFips: "36", countyFips: "047", pollutant: "pm25", ts: H0, value: 20 },
  { stateFips: "36", countyFips: "081", pollutant: "pm25", ts: H0, value: 12 },
  { stateFips: "36", countyFips: "081", pollutant: "pm25", ts: H0, value: 18 }, // second Queens site, same hour
  { stateFips: "36", countyFips: "081", pollutant: "o3", ts: H0, value: 40 },
  { stateFips: "36", countyFips: "005", pollutant: "pm25", ts: H1, value: 11 },
  { stateFips: "36", countyFips: "081", pollutant: "no2", ts: H1, value: 25 },
  // New Jersey (state 34) — inside the AirNow bbox, must never count (correctness rule, not a nicety)
  { stateFips: "34", countyFips: "017", pollutant: "pm25", ts: H0, value: 999 },
];

const result = toBoroughHours(rows, AXIS);

describe("toBoroughHours", () => {
  it("takes the max across a borough's sites per hour", () => {
    expect(result.boroughs.Queens.hours[0].pm25).toBe(18);
    expect(result.boroughs.Queens.hours[0].source.pm25).toBe("own");
  });

  it("computes citywide as the per-hour mean of reporting boroughs only", () => {
    // hour 0 pm25: Bronx 10, Brooklyn 20, Queens 18 → mean 16; the NJ 999 must not move it
    expect(result.citywide.hours[0].pm25).toBe(16);
    // hour 0 o3: Bronx 30, Queens 40 → mean 35; Brooklyn does not contribute a zero (BUG-14)
    expect(result.citywide.hours[0].o3).toBe(35);
  });

  it("substitutes the citywide value with provenance where a borough has no reading (D-16)", () => {
    expect(result.boroughs.Brooklyn.hours[0].o3).toBe(35);
    expect(result.boroughs.Brooklyn.hours[0].source.o3).toBe("citywide");
    // Manhattan reported nothing at all this fixture: everything it carries is borrowed
    expect(result.boroughs.Manhattan.hours[0].pm25).toBe(16);
    expect(result.boroughs.Manhattan.hours[0].source.pm25).toBe("citywide");
  });

  it("leaves the hour null for everyone when no borough reports the pollutant", () => {
    // no NO2 anywhere in hour 0
    expect(result.citywide.hours[0].no2).toBeNull();
    expect(result.boroughs.Queens.hours[0].no2).toBeNull();
    expect(result.boroughs.Brooklyn.hours[0].no2).toBeNull();
  });

  it("ignores rows from outside New York state", () => {
    for (const b of Object.values(result.boroughs)) {
      for (const h of b.hours) expect(h.pm25).not.toBe(999);
    }
  });
});

describe("utcToNyIso", () => {
  it("renders an ASCII-minus offset, not Intl's Unicode minus", () => {
    const iso = utcToNyIso(new Date("2023-06-07T16:00:00Z"));
    expect(iso).toBe("2023-06-07T12:00:00-04:00");
    expect(iso.includes("−")).toBe(false);
  });

  it("crosses DST correctly", () => {
    expect(utcToNyIso(new Date("2023-01-15T16:00:00Z"))).toBe("2023-01-15T11:00:00-05:00");
  });
});

describe("seriesAQI", () => {
  it("computes daily from the 24-h mean, hourlyMax from the peak hour, latestHour from the last non-null hour", () => {
    const hours = result.boroughs.Bronx.hours; // pm25 10 then 11
    const aqi = seriesAQI(hours);
    expect(aqi.daily).toBe(pm25ToAQI(10.5));
    expect(aqi.hourlyMax).toBe(pm25ToAQI(11));
    expect(aqi.latestHour).toBe(pm25ToAQI(11));
  });
});
