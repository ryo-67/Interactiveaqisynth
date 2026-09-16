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

// 'typical' = live NO2 filled from the archive's typical profile (D-18): New York does not publish live NO2 (BUG-25), so absence in the live window is filled from the borough's mean hourly contour for the month and day type, disclosed in the source line.
export type SourceTag = "own" | "citywide" | "typical";

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

export interface BoroughSeries {
  hours: HourReading[]; // hours only: every AQI on the page is computed on the client from these by one rule (src/engine/aqi.ts, D-42)
}

// ——— AQI breakpoints ———
// The same tables as src/engine/aqi.ts (the two tsconfigs cannot share a file; keep them identical). Here they serve only the zip-code fallback, which receives AQI values from AirNow and must turn them back into concentrations.

type Band = readonly [number, number, number, number]; // concentration low, concentration high, index low, index high

// PM2.5, 24-hour µg/m³, the May 2024 revision.
export const PM25_BANDS: readonly Band[] = [
  [0.0, 9.0, 0, 50],
  [9.1, 35.4, 51, 100],
  [35.5, 55.4, 101, 150],
  [55.5, 125.4, 151, 200],
  [125.5, 225.4, 201, 300],
  [225.5, 325.4, 301, 500],
];
// Ozone, 8-hour ppb.
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

// Equation 1 of the AirNow TAD inverted: the concentration at the same fraction of the band the index sits in. Approximate by nature (an index is a rounded value); enough for sound.
export function reverseAQI(aqi: number, bands: readonly Band[]): number {
  for (const [cLo, cHi, iLo, iHi] of bands) {
    if (aqi <= iHi) return cLo + ((Math.max(aqi, iLo) - iLo) / (iHi - iLo)) * (cHi - cLo);
  }
  return bands[bands.length - 1][1];
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
    boroughs[b] = { hours };
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

  return { boroughs, citywide: { hours: citywideHours } };
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

// ——— Typical NO2 fill (D-18, amends §4.2/§4.4 for live NO2 only) ———
// public/data/typical-no2.json: borough (and Citywide) → month "1".."12" → weekday/weekend → 24 mean hourly NO2 values over 2020–2025, built by scripts/build-archive.ts from the borough's played archive series (already citywide-substituted where the borough has no monitor). The live route calls this after the transform; the historical route never does — EPA carries real NO2 there.

export type DayType = "weekday" | "weekend";
export type TypicalNo2Table = Record<string, Record<string, Record<DayType, Array<number | null>>>>;

export function dayTypeOf(dateIso: string): DayType {
  const dow = new Date(dateIso.slice(0, 10) + "T12:00:00Z").getUTCDay();
  return dow === 0 || dow === 6 ? "weekend" : "weekday";
}

export function fillTypicalNo2(result: TransformResult, table: TypicalNo2Table): void {
  const fill = (name: string, series: BoroughSeries) => {
    for (const h of series.hours) {
      if (h.no2 != null) continue; // real readings (own or citywide-substituted) always win
      const month = String(Number(h.ts.slice(5, 7)));
      const hour = Number(h.ts.slice(11, 13));
      const v = table[name]?.[month]?.[dayTypeOf(h.ts)]?.[hour];
      if (v != null) {
        h.no2 = v;
        h.source.no2 = "typical";
      }
    }
  };
  for (const b of BOROUGHS) fill(b, result.boroughs[b]);
  fill("Citywide", result.citywide);
}

// Calendar-day arithmetic on YYYY-MM-DD (UTC-safe, no wall-clock involvement). Used to pad EPA request windows (O-12).
export function addDays(dateIso: string, n: number): string {
  const d = new Date(dateIso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

