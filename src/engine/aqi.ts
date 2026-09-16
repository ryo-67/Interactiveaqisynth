// aqi.ts — EPA's Air Quality Index as it is reported, not as one pollutant (D-42, 2026-09-15).
// Source: AirNow, Technical Assistance Document for the Reporting of Daily Air Quality (May 2026 revision), §IV and "How the NowCast is calculated".
// Three rules from it. (1) The AQI is the highest of the pollutant sub-indices; each pollutant has its own breakpoint table and averaging period. (2) The DAILY AQI is built from daily statistics: PM2.5 the 24-hour mean, ozone the highest 8-hour mean of the windows starting 7 am to 11 pm, NO2 the highest hour. (3) Hourly data is not valid for an AQI; what AirNow and the weather apps show as the current AQI is the NowCast: for PM2.5 a weighted mean of the last 12 hours that leans on the recent hours when the air is changing, for NO2 the hour itself (its sub-index is already 1-hour). Ozone's own NowCast is a two-week regression model (github.com/USEPA/O3-NowCast); this file uses the trailing 8-hour mean in its place, a stated simplification.
// Concentrations are truncated before lookup (PM2.5 to one decimal, O3 and NO2 to integers) and each sub-index is rounded to an integer; values off the top of a table read 500.
// The sound does not use this file's composite: the tier is PM2.5 alone (STRATEGY §3.4), through pm25ToAQI below, because particles are the dissonance axis and ozone and NO2 already have voices of their own.

import type { Day, HourReading } from "./SynthEngine";

type Band = readonly [number, number, number, number]; // concentration low, concentration high, index low, index high

// PM2.5, 24-hour µg/m³, the May 2024 revision (Good ends at 9.0, not 12.0; Hazardous begins at 225.5, not 250.5).
export const PM25_BANDS: readonly Band[] = [
  [0.0, 9.0, 0, 50],
  [9.1, 35.4, 51, 100],
  [35.5, 55.4, 101, 150],
  [55.5, 125.4, 151, 200],
  [125.5, 225.4, 201, 300],
  [225.5, 325.4, 301, 500],
];
// Ozone, 8-hour ppb. EPA defines nothing above 200 ppb for 8-hour means (301+ comes from 1-hour values, which this app does not use); higher reads 500 like every table's top.
export const O3_8H_BANDS: readonly Band[] = [
  [0, 54, 0, 50],
  [55, 70, 51, 100],
  [71, 85, 101, 150],
  [86, 105, 151, 200],
  [106, 200, 201, 300],
];
// NO2, 1-hour ppb.
export const NO2_1H_BANDS: readonly Band[] = [
  [0, 53, 0, 50],
  [54, 100, 51, 100],
  [101, 360, 101, 150],
  [361, 649, 151, 200],
  [650, 1249, 201, 300],
  [1250, 2049, 301, 500],
];

// Equation 1 of the TAD, linear within the band that holds the truncated concentration. Unrounded, so the tier smoother has a continuous value; the sub-indices round.
function piecewise(conc: number, bands: readonly Band[], decimals: number): number {
  const scale = Math.pow(10, decimals);
  const c = Math.floor(Math.max(0, conc) * scale) / scale; // truncated, never rounded: 9.05 is Good, not Moderate
  for (const [cLo, cHi, iLo, iHi] of bands) {
    if (c <= cHi) return iLo + ((c - cLo) / (cHi - cLo)) * (iHi - iLo);
  }
  return 500;
}

// PM2.5 alone, for the sound (§3.4): the tier is this value smoothed. Negative PM2.5 is instrument noise, clamped to 0.
export function pm25ToAQI(conc: number | null): number | null {
  return conc == null ? null : piecewise(conc, PM25_BANDS, 1);
}

const subIndex = (conc: number | null, bands: readonly Band[], decimals: number): number | null =>
  conc == null ? null : Math.round(piecewise(conc, bands, decimals));

const maxOf = (subs: Array<number | null>): number | null => {
  const present = subs.filter((v): v is number => v != null);
  return present.length ? Math.max(...present) : null;
};

// The PM NowCast (TAD, updated 2013-08-01). `window` is the last 12 hours oldest first, the last entry the hour being reported; shorter at the start of the loaded data. Two of the last three hours must be present. Weight w = 1 − (max − min) / max floored at 0.5: steady air approaches a 12-hour mean, changing air a 3-hour one, each hour weighted w^(hours ago).
export function nowcastPM25(window: ReadonlyArray<number | null>): number | null {
  const vals = window.slice(-12).map((v) => (v == null ? null : Math.max(0, v)));
  const n = vals.length;
  if (n === 0) return null;
  const tail = vals.slice(-3);
  if (tail.filter((v) => v != null).length < Math.min(2, n)) return null;
  const present = vals.filter((v): v is number => v != null);
  const max = Math.max(...present);
  const min = Math.min(...present);
  const w = max > 0 ? Math.max(0.5, 1 - (max - min) / max) : 1;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const v = vals[i];
    if (v == null) continue;
    const f = Math.pow(w, n - 1 - i);
    num += v * f;
    den += f;
  }
  return num / den;
}

// Mean of an 8-hour window with EPA's 75% completeness: 6 of the 8 hours must be present. A window cut short by the edge of the loaded data (the first hours of a day with no previous day loaded, the last windows of a day with no next day) counts its missing hours as missing, so it reads null rather than a mean of a few hours.
function meanIfComplete(window: ReadonlyArray<number | null>, nominal = 8): number | null {
  const present = window.filter((v): v is number => v != null);
  if (present.length < Math.ceil(0.75 * nominal)) return null;
  return present.reduce((s, v) => s + v, 0) / present.length;
}

// The current AQI for hour i of `all`, as AirNow would have reported it that hour: the highest of the PM2.5 NowCast over the trailing 12 hours, the trailing 8-hour ozone mean and the hour's NO2, each through its own table. Null only when no sub-index can be formed.
export function hourlyAQI(all: ReadonlyArray<HourReading>, i: number): number | null {
  const pm = nowcastPM25(all.slice(Math.max(0, i - 11), i + 1).map((h) => h.pm25));
  const o3 = meanIfComplete(all.slice(Math.max(0, i - 7), i + 1).map((h) => h.o3));
  return maxOf([subIndex(pm, PM25_BANDS, 1), subIndex(o3, O3_8H_BANDS, 0), subIndex(all[i].no2, NO2_1H_BANDS, 0)]);
}

// The graph's AQI line: hourlyAQI for every hour of the day, the previous day's hours in front so the first hours' windows are real rather than truncated.
export function hourlyAQISeries(day: Day, prior: Day = []): Array<number | null> {
  const all = [...prior, ...day];
  return day.map((_, k) => hourlyAQI(all, prior.length + k));
}

const clockHour = (h: HourReading): number => Number(h.ts.slice(11, 13));

// The official daily AQI (TAD §IV, Table 6): PM2.5 from the 24-hour mean, ozone from the highest 8-hour mean among the 17 windows starting 7 am through 11 pm (the late windows run into the next day, whose hours are passed in when loaded), NO2 from the highest hour. The PM2.5 mean needs 75% of the day's hours, as EPA's daily value does; a day with a few hours of particles reads null rather than a number built on a morning.
export function dailyAQI(day: Day, next: Day = []): number | null {
  if (day.length === 0) return null;
  const pmVals = day.map((h) => h.pm25).filter((v): v is number => v != null).map((v) => Math.max(0, v));
  const pmMean = pmVals.length >= Math.ceil(0.75 * day.length) ? pmVals.reduce((s, v) => s + v, 0) / pmVals.length : null;
  const all = [...day, ...next];
  let o3Max: number | null = null;
  for (let s = 0; s < day.length; s++) {
    const hour = clockHour(day[s]);
    if (hour < 7) continue;
    const mean = meanIfComplete(all.slice(s, s + 8).map((h) => h.o3));
    if (mean != null && (o3Max == null || mean > o3Max)) o3Max = mean;
  }
  const no2Max = maxOf(day.map((h) => h.no2));
  return maxOf([subIndex(pmMean, PM25_BANDS, 1), subIndex(o3Max, O3_8H_BANDS, 0), subIndex(no2Max, NO2_1H_BANDS, 0)]);
}

export interface SeriesAQI {
  daily: number | null; // the official daily AQI of the day: a chosen day's number
  current: number | null; // the NowCast composite at the latest reporting hour: the live number, what a weather app's headline shows
  hourly: Array<number | null>; // the current AQI hour by hour: the graph's AQI line and the mood word's category at the hour being heard
}

export function seriesAQI(day: Day, prior: Day = [], next: Day = []): SeriesAQI {
  const hourly = hourlyAQISeries(day, prior);
  let current: number | null = null;
  for (let i = day.length - 1; i >= 0; i--) {
    if (day[i].pm25 != null || day[i].o3 != null || day[i].no2 != null) { current = hourly[i]; break; }
  }
  return { daily: dailyAQI(day, next), current, hourly };
}
