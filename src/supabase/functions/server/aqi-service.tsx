import * as kv from "./kv_store.tsx";

// ——— Borough mappings ———

export type Borough =
  | "Citywide"
  | "Bronx"
  | "Brooklyn"
  | "Manhattan"
  | "Queens"
  | "Staten Island";
export const BOROUGHS: Borough[] = [
  "Citywide",
  "Manhattan",
  "Brooklyn",
  "Queens",
  "Bronx",
  "Staten Island",
];

// NYC county FIPS codes (state 36 = New York)
const BOROUGH_FIPS: Record<
  Exclude<Borough, "Citywide">,
  string
> = {
  Manhattan: "061", // New York County
  Bronx: "005", // Bronx County
  Brooklyn: "047", // Kings County
  Queens: "081", // Queens County
  "Staten Island": "085", // Richmond County
};

// Representative zip codes for AirNow current observations
const BOROUGH_ZIPS: Record<
  Exclude<Borough, "Citywide">,
  string
> = {
  Manhattan: "10001",
  Brooklyn: "11201",
  Queens: "11101",
  Bronx: "10451",
  "Staten Island": "10301",
};

// EPA AQS pollutant parameter codes
const EPA_PARAM_PM25 = "88101";
const EPA_PARAM_PM10 = "81102";
const EPA_PARAM_O3 = "44201";
const EPA_PARAM_NO2 = "42602";
const EPA_ALL_PARAMS = [
  EPA_PARAM_PM25,
  EPA_PARAM_PM10,
  EPA_PARAM_O3,
  EPA_PARAM_NO2,
].join(",");

// ——— Shared types ———

export interface AQIDataPoint {
  date: string; // "Jan 15, 2024"
  aqi: number;
  category: string;
  mainPollutant: string;
  pm25: number;
  pm10: number;
  o3: number; // ppb
  no2: number; // ppb
}

interface CachedHistorical {
  cachedAt: number;
  data: AQIDataPoint[];
}

interface CachedCurrent {
  cachedAt: number;
  data: Record<string, AQIDataPoint | null>;
}

// ——— AQI breakpoint conversions ———

function pollutantAQI(
  value: number,
  breakpoints: number[][],
  aqiRanges: number[][],
): number {
  for (let i = 0; i < breakpoints.length; i++) {
    const [cLo, cHi] = breakpoints[i];
    const [iLo, iHi] = aqiRanges[i];
    if (value <= cHi) {
      return Math.round(
        ((iHi - iLo) / (cHi - cLo)) * (value - cLo) + iLo,
      );
    }
  }
  return 300;
}

function pm25ToAQI(conc: number): number {
  return pollutantAQI(
    conc,
    [
      [0, 12],
      [12.1, 35.4],
      [35.5, 55.4],
      [55.5, 150.4],
      [150.5, 250.4],
    ],
    [
      [0, 50],
      [51, 100],
      [101, 150],
      [151, 200],
      [201, 300],
    ],
  );
}

function o3ToAQI(ppb: number): number {
  return pollutantAQI(
    ppb,
    [
      [0, 54],
      [55, 70],
      [71, 85],
      [86, 105],
      [106, 200],
    ],
    [
      [0, 50],
      [51, 100],
      [101, 150],
      [151, 200],
      [201, 300],
    ],
  );
}

function no2ToAQI(ppb: number): number {
  return pollutantAQI(
    ppb,
    [
      [0, 53],
      [54, 100],
      [101, 360],
      [361, 649],
      [650, 1249],
    ],
    [
      [0, 50],
      [51, 100],
      [101, 150],
      [151, 200],
      [201, 300],
    ],
  );
}

function aqiCategory(aqi: number): string {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  return "Very Unhealthy";
}

function mainPollutant(
  pm25: number,
  pm10: number,
  o3: number,
  no2: number,
): string {
  const ratios = [
    { name: "PM2.5", ratio: pm25 / 35 },
    { name: "PM10", ratio: pm10 / 150 },
    { name: "O3", ratio: o3 / 70 },
    { name: "NO2", ratio: no2 / 53 },
  ];
  return ratios.sort((a, b) => b.ratio - a.ratio)[0].name;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00"); // noon to avoid timezone issues
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ——— Small delay for rate limiting ———

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getYesterdayYMD(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

// ——— EPA AQS: Historical daily data ———

interface EPARawRecord {
  parameter_code: string;
  date_local: string;
  first_max_value: number;
  aqi: number | null;
  arithmetic_mean: number;
  units_of_measure: string;
}

interface EPAResponse {
  Header: Array<{ status: string; rows: number }>;
  Data: EPARawRecord[];
}

function processEPAData(
  records: EPARawRecord[],
): AQIDataPoint[] {
  // Group by date → aggregate across sites, keep max per pollutant
  const byDate = new Map<
    string,
    {
      pm25: number[];
      pm10: number[];
      o3: number[];
      no2: number[];
      aqis: number[];
    }
  >();

  for (const r of records) {
    if (r.first_max_value == null) continue;
    const date = r.date_local;
    if (!byDate.has(date)) {
      byDate.set(date, {
        pm25: [],
        pm10: [],
        o3: [],
        no2: [],
        aqis: [],
      });
    }
    const day = byDate.get(date)!;

    switch (r.parameter_code) {
      case EPA_PARAM_PM25:
        day.pm25.push(r.first_max_value);
        break;
      case EPA_PARAM_PM10:
        day.pm10.push(r.first_max_value);
        break;
      case EPA_PARAM_O3:
        // EPA reports O3 in ppm, convert to ppb
        day.o3.push(r.first_max_value * 1000);
        break;
      case EPA_PARAM_NO2:
        day.no2.push(r.first_max_value);
        break;
    }
    if (r.aqi != null && r.aqi >= 0) {
      day.aqis.push(r.aqi);
    }
  }

  const result: AQIDataPoint[] = [];
  const sortedDates = [...byDate.keys()].sort();

  for (const date of sortedDates) {
    const vals = byDate.get(date)!;

    const pm25 = vals.pm25.length ? Math.max(...vals.pm25) : 0;
    // PM10 often missing in NYC — estimate from PM2.5 if absent
    const pm10 = vals.pm10.length
      ? Math.max(...vals.pm10)
      : Math.round(pm25 * 1.6 + 5);
    const o3 = vals.o3.length ? Math.max(...vals.o3) : 0;
    const no2 = vals.no2.length ? Math.max(...vals.no2) : 0;

    // Use EPA-provided AQI if available, otherwise compute from concentrations
    const aqi = vals.aqis.length
      ? Math.max(...vals.aqis)
      : Math.max(pm25ToAQI(pm25), o3ToAQI(o3), no2ToAQI(no2));

    result.push({
      date: formatDate(date),
      aqi,
      category: aqiCategory(aqi),
      mainPollutant: mainPollutant(pm25, pm10, o3, no2),
      pm25: Math.round(pm25 * 10) / 10,
      pm10: Math.round(pm10),
      o3: Math.round(o3 * 10) / 10,
      no2: Math.round(no2 * 10) / 10,
    });
  }

  return result;
}

async function fetchEPAYear(
  borough: Exclude<Borough, "Citywide">,
  year: number,
  email: string,
  apiKey: string,
): Promise<AQIDataPoint[]> {
  const county = BOROUGH_FIPS[borough];
  const bdate = `${year}0101`;
  // For current year, fetch up to yesterday; for past years, full year
  const currentYear = new Date().getFullYear();
  const edate =
    year === currentYear ? getYesterdayYMD() : `${year}1231`;

  const url =
    `https://aqs.epa.gov/data/api/dailyData/byCounty` +
    `?email=${encodeURIComponent(email)}` +
    `&key=${encodeURIComponent(apiKey)}` +
    `&param=${EPA_ALL_PARAMS}` +
    `&bdate=${bdate}&edate=${edate}` +
    `&state=36&county=${county}`;

  console.log(
    `[EPA AQS] Fetching ${borough} (county ${county}) year ${year}...`,
  );

  // Per-request timeout: 25 seconds (prevents a single slow EPA call from eating the budget)
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const text = await response.text();
    console.log(
      `[EPA AQS] HTTP ${response.status} for ${borough}/${year}: ${text.slice(0, 200)}`,
    );
    throw new Error(
      `EPA AQS returned HTTP ${response.status} for ${borough} ${year}`,
    );
  }

  const json: EPAResponse = await response.json();
  if (!json.Data || !Array.isArray(json.Data)) {
    console.log(
      `[EPA AQS] No Data array for ${borough}/${year}. Header: ${JSON.stringify(json.Header)}`,
    );
    return [];
  }

  console.log(
    `[EPA AQS] Got ${json.Data.length} records for ${borough}/${year}`,
  );
  return processEPAData(json.Data);
}

/**
 * Fetch 5+ years of historical daily data for a borough.
 * Uses KV cache per borough-year; only fetches missing/stale years.
 */
export async function fetchHistorical(
  borough: Borough,
): Promise<AQIDataPoint[]> {
  const email = Deno.env.get("EPA_AQS_EMAIL");
  const apiKey = Deno.env.get("EPA_AQS_API_KEY");

  if (!email || !apiKey) {
    throw new Error(
      "EPA_AQS_EMAIL and EPA_AQS_API_KEY environment variables are required",
    );
  }

  // ── FAST PATH: aggregate cache (single KV read) ──
  // After the first successful fetch, all subsequent requests return instantly.
  const aggKey = `aqi:hist:agg:${borough}`;
  try {
    const agg = await kv.get(aggKey);
    if (
      agg &&
      agg.data &&
      Array.isArray(agg.data) &&
      agg.data.length > 0
    ) {
      const ageHours =
        (Date.now() - (agg.cachedAt || 0)) / (1000 * 60 * 60);
      // Return cached aggregate if < 20 hours old (refreshes roughly once/day)
      if (ageHours < 20) {
        console.log(
          `[FAST PATH] ${aggKey}: ${agg.data.length} points, ${Math.round(ageHours)}h old`,
        );
        return agg.data;
      }
      console.log(
        `[AGG STALE] ${aggKey}: ${Math.round(ageHours)}h old, rebuilding`,
      );
    }
  } catch (e) {
    console.log(`[AGG ERROR] reading ${aggKey}: ${e}`);
  }

  // ── SLOW PATH: per-year fetch + build aggregate ──
  const now = new Date();
  const currentYear = now.getFullYear();
  const startYear = currentYear - 2;
  const allData: AQIDataPoint[] = [];

  // Deadline: return whatever we have before the Edge Function timeout kills us.
  const deadline = Date.now() + 25000;

  console.log(
    `[fetchHistorical] Slow path for ${borough}: years ${startYear}-${currentYear}, deadline in 25s`,
  );

  // For "Citywide", use Manhattan as a representative proxy
  // (fetching all 5 boroughs × 5 years would exceed Edge Function compute limits)
  const boroughsToFetch: Exclude<Borough, "Citywide">[] =
    borough === "Citywide"
      ? ["Manhattan"]
      : [borough as Exclude<Borough, "Citywide">];

  for (const b of boroughsToFetch) {
    const boroughData: AQIDataPoint[] = [];

    for (let year = startYear; year <= currentYear; year++) {
      // Check deadline before each year
      if (Date.now() > deadline) {
        console.log(
          `[fetchHistorical] ⏱ Deadline reached at ${b}/${year}, returning ${boroughData.length} points so far`,
        );
        break;
      }

      const cacheKey = `aqi:hist:${b}:${year}`;

      // Check cache
      try {
        const cached: CachedHistorical | null =
          await kv.get(cacheKey);
        if (cached && cached.data && cached.data.length > 0) {
          const ageHours =
            (Date.now() - cached.cachedAt) / (1000 * 60 * 60);
          // Past years: cache forever. Current year: refresh weekly.
          if (year < currentYear || ageHours < 24 * 7) {
            console.log(
              `[Cache HIT] ${cacheKey} (${cached.data.length} points, ${Math.round(ageHours)}h old)`,
            );
            boroughData.push(...cached.data);
            continue;
          }
          console.log(
            `[Cache STALE] ${cacheKey} (${Math.round(ageHours)}h old, refreshing)`,
          );
        }
      } catch (e) {
        console.log(`[Cache ERROR] reading ${cacheKey}: ${e}`);
      }

      // Fetch from EPA
      try {
        const yearData = await fetchEPAYear(
          b,
          year,
          email,
          apiKey,
        );
        boroughData.push(...yearData);

        // Cache the result
        if (yearData.length > 0) {
          try {
            await kv.set(cacheKey, {
              cachedAt: Date.now(),
              data: yearData,
            } as CachedHistorical);
            console.log(
              `[Cache SET] ${cacheKey} (${yearData.length} points)`,
            );
          } catch (e) {
            console.log(
              `[Cache ERROR] writing ${cacheKey}: ${e}`,
            );
          }
        }

        // Rate limit: wait 1s between EPA requests
        await delay(1000);
      } catch (e) {
        console.log(
          `[EPA AQS] Error fetching ${b}/${year}: ${e}`,
        );
        // Continue with other years — partial data is better than none
      }
    }

    if (borough === "Citywide") {
      // For citywide, merge later
      allData.push(...boroughData);
    } else {
      allData.push(...boroughData);
    }
  }

  if (borough === "Citywide" && allData.length > 0) {
    const result = aggregateCitywide(allData);
    // Cache the aggregate
    try {
      await kv.set(aggKey, {
        cachedAt: Date.now(),
        data: result,
      });
      console.log(
        `[AGG SET] ${aggKey}: ${result.length} points`,
      );
    } catch (e) {
      console.log(`[AGG ERROR] writing ${aggKey}: ${e}`);
    }
    return result;
  }

  // Sort by date
  allData.sort(
    (a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // Cache the aggregate for fast path on next request
  if (allData.length > 0) {
    try {
      await kv.set(aggKey, {
        cachedAt: Date.now(),
        data: allData,
      });
      console.log(
        `[AGG SET] ${aggKey}: ${allData.length} points`,
      );
    } catch (e) {
      console.log(`[AGG ERROR] writing ${aggKey}: ${e}`);
    }
  }

  return allData;
}

function aggregateCitywide(
  allBoroughData: AQIDataPoint[],
): AQIDataPoint[] {
  // Group by date string → average pollutants, max AQI
  const byDate = new Map<string, AQIDataPoint[]>();
  for (const d of allBoroughData) {
    if (!byDate.has(d.date)) byDate.set(d.date, []);
    byDate.get(d.date)!.push(d);
  }

  const result: AQIDataPoint[] = [];
  for (const [date, points] of byDate.entries()) {
    const pm25 =
      Math.round(
        (points.reduce((s, p) => s + p.pm25, 0) /
          points.length) *
          10,
      ) / 10;
    const pm10 = Math.round(
      points.reduce((s, p) => s + p.pm10, 0) / points.length,
    );
    const o3 =
      Math.round(
        (points.reduce((s, p) => s + p.o3, 0) / points.length) *
          10,
      ) / 10;
    const no2 =
      Math.round(
        (points.reduce((s, p) => s + p.no2, 0) /
          points.length) *
          10,
      ) / 10;
    const aqi = Math.max(...points.map((p) => p.aqi));

    result.push({
      date,
      aqi,
      category: aqiCategory(aqi),
      mainPollutant: mainPollutant(pm25, pm10, o3, no2),
      pm25,
      pm10,
      o3,
      no2,
    });
  }

  result.sort(
    (a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  return result;
}

// ——— AirNow: Current observations ———

interface AirNowObservation {
  DateObserved: string;
  HourObserved: number;
  LocalTimeZone: string;
  ReportingArea: string;
  StateCode: string;
  ParameterName: string;
  AQI: number;
  Category: { Number: number; Name: string };
}

async function fetchAirNowForZip(
  zip: string,
  apiKey: string,
): Promise<AirNowObservation[]> {
  const url =
    `https://www.airnowapi.org/aq/observation/zipCode/current/` +
    `?format=application/json` +
    `&zipCode=${zip}` +
    `&distance=15` +
    `&API_KEY=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    console.log(
      `[AirNow] HTTP ${response.status} for zip ${zip}: ${text.slice(0, 200)}`,
    );
    return [];
  }

  return await response.json();
}

function airNowToDataPoint(
  observations: AirNowObservation[],
): AQIDataPoint | null {
  if (!observations || observations.length === 0) return null;

  let pm25 = 0,
    pm10 = 0,
    o3 = 0,
    no2 = 0,
    maxAqi = 0;
  let dateStr = "";

  for (const obs of observations) {
    if (!dateStr) dateStr = obs.DateObserved;
    if (obs.AQI > maxAqi) maxAqi = obs.AQI;

    // AirNow reports AQI per parameter — we reverse-engineer approximate concentrations
    // This is imprecise but sufficient for sound mapping
    switch (obs.ParameterName) {
      case "PM2.5":
        pm25 = reverseAQI_PM25(obs.AQI);
        break;
      case "PM10":
        pm10 = reverseAQI_PM10(obs.AQI);
        break;
      case "O3":
      case "OZONE":
        o3 = reverseAQI_O3(obs.AQI);
        break;
      case "NO2":
        no2 = reverseAQI_NO2(obs.AQI);
        break;
    }
  }

  // Estimate PM10 from PM2.5 if not reported
  if (pm10 === 0 && pm25 > 0) {
    pm10 = Math.round(pm25 * 1.6 + 5);
  }

  const d = new Date(dateStr.trim() + "T12:00:00");
  const formattedDate = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return {
    date: formattedDate,
    aqi: maxAqi,
    category: aqiCategory(maxAqi),
    mainPollutant: mainPollutant(pm25, pm10, o3, no2),
    pm25: Math.round(pm25 * 10) / 10,
    pm10: Math.round(pm10),
    o3: Math.round(o3 * 10) / 10,
    no2: Math.round(no2 * 10) / 10,
  };
}

// Approximate reverse AQI → concentration for sound mapping
function reverseAQI_PM25(aqi: number): number {
  if (aqi <= 50) return (aqi / 50) * 12;
  if (aqi <= 100) return 12.1 + ((aqi - 51) / 49) * 23.3;
  if (aqi <= 150) return 35.5 + ((aqi - 101) / 49) * 19.9;
  return 55.5 + ((aqi - 151) / 49) * 94.9;
}

function reverseAQI_PM10(aqi: number): number {
  if (aqi <= 50) return (aqi / 50) * 54;
  if (aqi <= 100) return 55 + ((aqi - 51) / 49) * 99;
  return 155 + ((aqi - 101) / 49) * 199;
}

function reverseAQI_O3(aqi: number): number {
  if (aqi <= 50) return (aqi / 50) * 54;
  if (aqi <= 100) return 55 + ((aqi - 51) / 49) * 15;
  return 71 + ((aqi - 101) / 49) * 14;
}

function reverseAQI_NO2(aqi: number): number {
  if (aqi <= 50) return (aqi / 50) * 53;
  if (aqi <= 100) return 54 + ((aqi - 51) / 49) * 46;
  return 101 + ((aqi - 101) / 49) * 259;
}

/**
 * Fetch current AQI for all boroughs from AirNow.
 * Caches for 30 minutes.
 */
export async function fetchCurrent(): Promise<
  Record<string, AQIDataPoint | null>
> {
  const apiKey = Deno.env.get("AIRNOW_API_KEY");
  if (!apiKey) {
    throw new Error(
      "AIRNOW_API_KEY environment variable is required",
    );
  }

  // Check cache
  const cacheKey = "aqi:current:all";
  try {
    const cached: CachedCurrent | null = await kv.get(cacheKey);
    if (cached && cached.data) {
      const ageMin =
        (Date.now() - cached.cachedAt) / (1000 * 60);
      if (ageMin < 30) {
        console.log(
          `[Cache HIT] current AQI (${Math.round(ageMin)}min old)`,
        );
        return cached.data;
      }
    }
  } catch (e) {
    console.log(`[Cache ERROR] reading current: ${e}`);
  }

  // Fetch from AirNow for each borough
  const result: Record<string, AQIDataPoint | null> = {
    Citywide: null,
  };
  const boroughs = Object.keys(BOROUGH_ZIPS) as Exclude<
    Borough,
    "Citywide"
  >[];

  // Fetch all boroughs in parallel (5 requests, within AirNow limits)
  const promises = boroughs.map(async (b) => {
    try {
      const obs = await fetchAirNowForZip(
        BOROUGH_ZIPS[b],
        apiKey,
      );
      const point = airNowToDataPoint(obs);
      return { borough: b, point };
    } catch (e) {
      console.log(`[AirNow] Error fetching ${b}: ${e}`);
      return { borough: b, point: null };
    }
  });

  const results = await Promise.all(promises);
  for (const { borough, point } of results) {
    result[borough] = point;
  }

  // Citywide = average of all boroughs that have data
  const withData = results
    .filter((r) => r.point !== null)
    .map((r) => r.point!);
  if (withData.length > 0) {
    const pm25 =
      Math.round(
        (withData.reduce((s, p) => s + p.pm25, 0) /
          withData.length) *
          10,
      ) / 10;
    const pm10 = Math.round(
      withData.reduce((s, p) => s + p.pm10, 0) /
        withData.length,
    );
    const o3 =
      Math.round(
        (withData.reduce((s, p) => s + p.o3, 0) /
          withData.length) *
          10,
      ) / 10;
    const no2 =
      Math.round(
        (withData.reduce((s, p) => s + p.no2, 0) /
          withData.length) *
          10,
      ) / 10;
    const aqi = Math.max(...withData.map((p) => p.aqi));

    result.Citywide = {
      date: withData[0].date,
      aqi,
      category: aqiCategory(aqi),
      mainPollutant: mainPollutant(pm25, pm10, o3, no2),
      pm25,
      pm10,
      o3,
      no2,
    };
  }

  // Cache
  try {
    await kv.set(cacheKey, {
      cachedAt: Date.now(),
      data: result,
    } as CachedCurrent);
    console.log(
      `[Cache SET] current AQI for ${Object.keys(result).length} boroughs`,
    );
  } catch (e) {
    console.log(`[Cache ERROR] writing current: ${e}`);
  }

  return result;
}