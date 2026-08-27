// api/_lib/aqi.ts — shared data layer: borough maps, the site-hour → HourReading transform (§4.4, D-16), and AQI math (DAT-04, DAT-05).
// One transform for every source (AirNow live, EPA AQS live-year, EPA bulk archive). Nothing here estimates a missing value from a different pollutant; missing is null, never zero. There is no PM10 anywhere (D-07).
// All timestamps are America/New_York local hours with UTC offset (e.g. "2023-06-07T13:00:00-04:00"). DST days genuinely have 23 or 25 local hours; the offset keeps the fall-back duplicate 1 AMs distinct.

export type Borough = "Bronx" | "Brooklyn" | "Manhattan" | "Queens" | "Staten Island";

export const BOROUGHS: Borough[] = ["Bronx", "Brooklyn", "Manhattan", "Queens", "Staten Island"];

// NYC county FIPS (state 36). The AirNow bbox also catches New Jersey (state 34) sites; the transform drops any row whose state is not 36 — a correctness rule, not a nicety.
export const NY_STATE_FIPS = "36";
export const COUNTY_TO_BOROUGH: Record<string, Borough> = {
  "005": "Bronx",
  "047": "Brooklyn",
  "061": "Manhattan",
  "081": "Queens",
  "085": "Staten Island",
};

export type Pollutant = "pm25" | "o3" | "no2";
export const POLLUTANTS: Pollutant[] = ["pm25", "o3", "no2"];

export type SourceTag = "own" | "citywide";

export interface HourReading {
  ts: string; // ISO local hour with offset
  pm25: number | null; // µg/m³, max across sites
  o3: number | null; // ppb
  no2: number | null; // ppb
  source: { pm25: SourceTag; o3: SourceTag; no2: SourceTag };
}

// One raw observation: a site, an hour, a pollutant, a concentration in canonical units (pm25 µg/m³, o3 ppb, no2 ppb).
export interface SiteHourRow {
  stateFips: string;
  countyFips: string;
  pollutant: Pollutant;
  ts: string; // ISO local hour with offset
  value: number;
}

export interface SeriesAQI {
  daily: number | null; // AQI of the 24-h mean PM2.5 (one rule everywhere; EPA's own daily value waits for O-10)
  hourlyMax: number | null; // max hourly PM2.5 AQI — for pin labels only, never the displayed number (BUG-18)
  latestHour: number | null; // AQI of the most recent non-null hour — the Listen-mode number, so the number and the tier agree. AirNow's displayed number is NowCast and may differ; we are not reproducing NowCast.
}

export interface BoroughSeries {
  hours: HourReading[];
  aqi: SeriesAQI;
}

// ——— AQI breakpoint math ———

type Band = readonly [number, number, number, number];

function piecewise(value: number, bands: readonly Band[]): number {
  for (const [cLo, cHi, iLo, iHi] of bands) {
    if (value <= cHi) return Math.round(iLo + ((value - cLo) / (cHi - cLo)) * (iHi - iLo));
  }
  return 500;
}

// EPA PM2.5 breakpoints (24-h averaging basis; we apply them to hourly values for the phrase and to the 24-h mean for the daily number).
const PM25_BANDS: readonly Band[] = [
  [0.0, 12.0, 0, 50],
  [12.1, 35.4, 51, 100],
  [35.5, 55.4, 101, 150],
  [55.5, 150.4, 151, 200],
  [150.5, 250.4, 201, 300],
  [250.5, 500.4, 301, 500],
];

export function pm25ToAQI(conc: number | null): number | null {
  if (conc == null) return null;
  return piecewise(Math.max(0, conc), PM25_BANDS);
}

// O3 sub-index: EPA 8-hour breakpoints (ppb) against the max 8-h rolling mean. Display only; the phrase always plays raw hourly concentrations (BUG-19).
const O3_8H_BANDS: readonly Band[] = [
  [0, 54, 0, 50],
  [55, 70, 51, 100],
  [71, 85, 101, 150],
  [86, 105, 151, 200],
  [106, 200, 201, 300],
];

export function o3SubIndexAQI(hourly: ReadonlyArray<number | null>): number | null {
  let maxMean: number | null = null;
  for (let i = 0; i < hourly.length; i++) {
    const window = hourly.slice(Math.max(0, i - 7), i + 1).filter((v): v is number => v != null);
    if (window.length === 0) continue;
    const mean = window.reduce((s, v) => s + v, 0) / window.length;
    if (maxMean == null || mean > maxMean) maxMean = mean;
  }
  return maxMean == null ? null : piecewise(maxMean, O3_8H_BANDS);
}

// NO2 sub-index: EPA 1-hour breakpoints (ppb) against the max hourly value. Display only.
const NO2_1H_BANDS: readonly Band[] = [
  [0, 53, 0, 50],
  [54, 100, 51, 100],
  [101, 360, 101, 150],
  [361, 649, 151, 200],
  [650, 1249, 201, 300],
];

export function no2SubIndexAQI(hourly: ReadonlyArray<number | null>): number | null {
  const vals = hourly.filter((v): v is number => v != null);
  if (vals.length === 0) return null;
  return piecewise(Math.max(...vals), NO2_1H_BANDS);
}

export function seriesAQI(hours: HourReading[]): SeriesAQI {
  const pm25Vals = hours.map((h) => h.pm25).filter((v): v is number => v != null);
  const daily = pm25Vals.length ? pm25ToAQI(pm25Vals.reduce((s, v) => s + v, 0) / pm25Vals.length) : null;
  const hourlyAQIs = hours.map((h) => pm25ToAQI(h.pm25)).filter((v): v is number => v != null);
  const hourlyMax = hourlyAQIs.length ? Math.max(...hourlyAQIs) : null;
  let latestHour: number | null = null;
  for (let i = hours.length - 1; i >= 0; i--) {
    const a = pm25ToAQI(hours[i].pm25);
    if (a != null) {
      latestHour = a;
      break;
    }
  }
  return { daily, hourlyMax, latestHour };
}

// ——— The transform (§4.4 as amended, D-16) ———
// Per hour, per borough, per pollutant: max across that borough's sites. Citywide: per-hour mean of the boroughs that have their own reading. A borough with no reading for a pollutant takes the citywide value with source = 'citywide'. If no borough reports, the hour is null for everyone and the affected voice rests.

export interface TransformResult {
  boroughs: Record<Borough, BoroughSeries>;
  citywide: BoroughSeries;
}

export function toBoroughHours(rows: SiteHourRow[], hoursAxis: string[]): TransformResult {
  // own[borough][ts][pollutant] = max across sites
  const own = new Map<Borough, Map<string, Partial<Record<Pollutant, number>>>>();
  for (const b of BOROUGHS) own.set(b, new Map());

  for (const row of rows) {
    if (row.stateFips !== NY_STATE_FIPS) continue; // NJ and everyone else out (see COUNTY_TO_BOROUGH note)
    const borough = COUNTY_TO_BOROUGH[row.countyFips];
    if (!borough) continue;
    const byTs = own.get(borough)!;
    const rec = byTs.get(row.ts) ?? {};
    const prev = rec[row.pollutant];
    if (prev == null || row.value > prev) rec[row.pollutant] = row.value;
    byTs.set(row.ts, rec);
  }

  // citywide mean per hour per pollutant over boroughs with own readings
  const citywideByTs = new Map<string, Partial<Record<Pollutant, number>>>();
  for (const ts of hoursAxis) {
    const rec: Partial<Record<Pollutant, number>> = {};
    for (const p of POLLUTANTS) {
      const vals: number[] = [];
      for (const b of BOROUGHS) {
        const v = own.get(b)!.get(ts)?.[p];
        if (v != null) vals.push(v);
      }
      if (vals.length) rec[p] = vals.reduce((s, v) => s + v, 0) / vals.length;
    }
    citywideByTs.set(ts, rec);
  }

  const boroughs = {} as Record<Borough, BoroughSeries>;
  for (const b of BOROUGHS) {
    const hours: HourReading[] = hoursAxis.map((ts) => {
      const mine = own.get(b)!.get(ts) ?? {};
      const city = citywideByTs.get(ts) ?? {};
      const reading: HourReading = {
        ts,
        pm25: null,
        o3: null,
        no2: null,
        source: { pm25: "own", o3: "own", no2: "own" },
      };
      for (const p of POLLUTANTS) {
        if (mine[p] != null) {
          reading[p] = round1(mine[p]!);
        } else if (city[p] != null) {
          reading[p] = round1(city[p]!); // D-16: substitution with provenance, not estimation
          reading.source[p] = "citywide";
        }
        // else: null — no borough reports this pollutant this hour
      }
      return reading;
    });
    boroughs[b] = { hours, aqi: seriesAQI(hours) };
  }

  const citywideHours: HourReading[] = hoursAxis.map((ts) => {
    const city = citywideByTs.get(ts) ?? {};
    return {
      ts,
      pm25: city.pm25 != null ? round1(city.pm25) : null,
      o3: city.o3 != null ? round1(city.o3) : null,
      no2: city.no2 != null ? round1(city.no2) : null,
      source: { pm25: "own", o3: "own", no2: "own" }, // the citywide series IS the citywide value
    } as HourReading;
  });

  return { boroughs, citywide: { hours: citywideHours, aqi: seriesAQI(citywideHours) } };
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

// ——— America/New_York timestamps ———
// AirNow reports UTC; EPA bulk files and AQS carry local time directly. This converts a UTC instant to the local ISO hour with offset, so DST fall-back duplicate 1 AMs stay distinct.
const NY_PARTS = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZoneName: "longOffset",
});

export function utcToNyIso(utc: Date): string {
  const parts: Record<string, string> = {};
  for (const p of NY_PARTS.formatToParts(utc)) parts[p.type] = p.value;
  // Intl longOffset renders "GMT−04:00" with a Unicode minus (U+2212); normalize to ASCII so offsets match the archive's.
  const offset = (parts.timeZoneName!.replace("GMT", "") || "+00:00").replace("−", "-");
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}:00${offset}`;
}
