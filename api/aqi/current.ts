import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  toBoroughHours,
  utcToNyIso,
  pm25ToAQI,
  BOROUGHS,
  type SiteHourRow,
  type Pollutant,
  type TransformResult,
  type HourReading,
} from "../_lib/aqi";

/**
 * GET /api/aqi/current — last 24 local hours for every borough (DAT-01; fixes BUG-11, BUG-12, BUG-13).
 * AirNow data endpoint (/aq/data/): NYC bounding box, O3 + PM2.5 + NO2, hourly concentrations, per monitoring site. Sites map to boroughs by the county digits of FullAQSCode (9-digit AQS state+county+site); the bbox also catches New Jersey sites, which the shared transform drops by state FIPS.
 * Response: { boroughs, citywide, fetchedAt, fallback? }. CDN-cached 30 minutes.
 */

const NYC_BBOX = "-74.30,40.45,-73.65,40.95";
const AIRNOW_PARAM_TO_POLLUTANT: Record<string, Pollutant> = {
  "PM2.5": "pm25",
  OZONE: "o3",
  O3: "o3",
  NO2: "no2",
};

interface AirNowDataRow {
  UTC: string;
  Parameter: string;
  Value: number;
  FullAQSCode: string;
  Unit: string;
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.AIRNOW_API_KEY;
  if (!apiKey) {
    res.setHeader("Cache-Control", "no-store");
    res.status(500).json({ status: "error", error: "AIRNOW_API_KEY environment variable is required" });
    return;
  }

  try {
    // Last 24 complete UTC hours; the axis below is built from the local hours they map to.
    const end = new Date();
    end.setUTCMinutes(0, 0, 0);
    const start = new Date(end.getTime() - 24 * 3600 * 1000);
    const fmt = (d: Date) => d.toISOString().slice(0, 13);
    const url =
      `https://www.airnowapi.org/aq/data/?startDate=${fmt(start)}&endDate=${fmt(end)}` +
      `&parameters=OZONE,PM25,NO2&BBOX=${NYC_BBOX}&dataType=C&format=application/json` +
      `&verbose=1&monitorType=0&includerawconcentrations=0&API_KEY=${encodeURIComponent(apiKey)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    let raw: AirNowDataRow[];
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`AirNow data endpoint HTTP ${response.status}`);
      raw = (await response.json()) as AirNowDataRow[];
    } finally {
      clearTimeout(timer);
    }

    const rows: SiteHourRow[] = [];
    for (const r of raw) {
      const pollutant = AIRNOW_PARAM_TO_POLLUTANT[r.Parameter];
      const code = r.FullAQSCode ?? "";
      if (!pollutant || code.length < 5 || r.Value == null || r.Value < 0) continue;
      rows.push({
        stateFips: code.slice(0, 2),
        countyFips: code.slice(2, 5),
        pollutant,
        ts: utcToNyIso(new Date(r.UTC + ":00Z")),
        value: r.Value,
      });
    }

    const nyRows = rows.filter((r) => r.stateFips === "36");
    if (nyRows.length === 0) {
      // Whole-response fallback only: the data endpoint returned nothing for New York (outage or empty window). The zip-code endpoint cannot tell boroughs apart (BUG-12), so its area reading is flagged citywide on every channel and the response says so.
      const fallback = await zipCodeFallback(apiKey);
      res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=3600");
      res.status(200).json({ status: "ok", source: "airnow", fallback: "zipcode", fetchedAt: new Date().toISOString(), ...fallback });
      return;
    }

    // Axis: the distinct local hours seen, sorted, capped to the latest 24.
    const axis = [...new Set(rows.map((r) => r.ts))].sort().slice(-24);
    const result = toBoroughHours(rows, axis);

    res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=3600");
    res.status(200).json({ status: "ok", source: "airnow", fetchedAt: new Date().toISOString(), ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`[/aqi/current] Error: ${msg}`);
    res.setHeader("Cache-Control", "no-store");
    res.status(500).json({ status: "error", error: `Failed to fetch current AQI: ${msg}` });
  }
}

// ——— Zip-code fallback (whole-response only) ———
// AirNow observation/zipCode/current returns one AQI per parameter for one reporting area covering all of NYC. Concentrations are reverse-engineered from the AQI bands (imprecise, sufficient for sound); only the latest hour is populated, earlier hours stay null.

interface AirNowObservation {
  DateObserved: string;
  HourObserved: number;
  ParameterName: string;
  AQI: number;
}

async function zipCodeFallback(apiKey: string): Promise<TransformResult> {
  const url =
    `https://www.airnowapi.org/aq/observation/zipCode/current/?format=application/json` +
    `&zipCode=10001&distance=25&API_KEY=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url);
  const obs: AirNowObservation[] = response.ok ? await response.json() : [];

  let pm25: number | null = null;
  let o3: number | null = null;
  let no2: number | null = null;
  for (const o of obs) {
    if (o.ParameterName === "PM2.5") pm25 = reverseAQI_PM25(o.AQI);
    if (o.ParameterName === "O3" || o.ParameterName === "OZONE") o3 = reverseAQI_O3(o.AQI);
    if (o.ParameterName === "NO2") no2 = reverseAQI_NO2(o.AQI);
  }

  const hour: HourReading = {
    ts: utcToNyIso(new Date()),
    pm25,
    o3,
    no2,
    source: { pm25: "citywide", o3: "citywide", no2: "citywide" },
  };
  const series = {
    hours: [hour],
    aqi: { daily: null, hourlyMax: null, latestHour: pm25ToAQI(pm25) },
  };
  const boroughs = Object.fromEntries(BOROUGHS.map((b) => [b, series])) as TransformResult["boroughs"];
  return { boroughs, citywide: series };
}

// Approximate reverse AQI → concentration for the fallback path only.
function reverseAQI_PM25(aqi: number): number {
  if (aqi <= 50) return (aqi / 50) * 12;
  if (aqi <= 100) return 12.1 + ((aqi - 51) / 49) * 23.3;
  if (aqi <= 150) return 35.5 + ((aqi - 101) / 49) * 19.9;
  return 55.5 + ((aqi - 151) / 49) * 94.9;
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
