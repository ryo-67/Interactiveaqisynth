// nycOpenData.ts — borough geometry for the map, and the sprint-2 data client (DAT-04 client side, UX-01, SON-03).
// Three calls, nothing speculative: getLast24h (live route), getDay (static archive for past years, live-year route for the current year — the EPA API is only ever asked about the current year), getAnchors (archive percentiles, §3.10). First paint calls only getLast24h; nothing else loads until asked (BUG-20).

import type { Day, HourReading } from "../engine/SynthEngine";
import type { PollutantAnchors } from "../engine/contour";
import { pm25ToAQI } from "../engine/contour";

// ——— Borough types & map geometry ———

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

export const BOROUGH_CENTERS: Record<Borough, { x: number; y: number }> = {
  Citywide: { x: 150, y: 170 },
  Manhattan: { x: 123, y: 142 },
  Bronx: { x: 170, y: 60 },
  Brooklyn: { x: 175, y: 245 },
  Queens: { x: 230, y: 155 },
  "Staten Island": { x: 60, y: 290 },
};

export const BOROUGH_PATHS: Record<Exclude<Borough, "Citywide">, string> = {
  Manhattan:
    "M119,82 L125,78 L132,82 L138,90 L141,105 L143,125 L142,145 L140,165 L136,180 L130,195 L125,200 L120,195 L117,180 L115,165 L114,145 L115,125 L116,105 L117,90 Z",
  Bronx:
    "M143,20 L160,15 L180,18 L200,25 L215,35 L225,50 L228,68 L222,82 L210,90 L195,95 L178,95 L162,92 L150,85 L143,75 L140,60 L138,40 Z",
  Queens:
    "M178,95 L195,95 L215,98 L235,105 L255,115 L270,130 L278,150 L280,170 L275,190 L265,210 L250,225 L235,232 L218,235 L200,230 L185,220 L175,205 L170,188 L168,170 L170,152 L172,135 L174,115 Z",
  Brooklyn:
    "M130,200 L145,195 L160,198 L175,205 L185,220 L192,238 L195,258 L190,278 L180,295 L165,305 L148,310 L132,305 L120,295 L112,278 L110,258 L112,240 L118,222 L125,210 Z",
  "Staten Island":
    "M40,245 L55,238 L72,240 L85,250 L92,265 L95,282 L90,300 L80,315 L65,325 L48,328 L35,320 L28,305 L25,288 L28,270 L33,255 Z",
};

// ——— Data client ———

export interface SeriesAQI {
  daily: number | null;
  hourlyMax: number | null;
  latestHour: number | null; // the Listen-mode number: the sound and the number agree (not NowCast)
}

export interface DaySeries {
  hours: Day;
  aqi: SeriesAQI;
  fallback: "zipcode" | null; // set when the live route fell back to AirNow's area reading — the source line says "AirNow area reading", no borough named
  fetchedAt: string | null;
}

export type DataSource = "loading" | "live" | "mock";

const slug = (b: Borough) => b.toLowerCase().replace(/ /g, "-");

async function fetchJson<T>(url: string, timeoutMs = 30000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

interface CurrentResponse {
  status: string;
  fallback?: "zipcode";
  fetchedAt: string;
  boroughs: Record<Exclude<Borough, "Citywide">, { hours: Day; aqi: SeriesAQI }>;
  citywide: { hours: Day; aqi: SeriesAQI };
}

// Live route: last 24 local hours for the borough (already D-16-substituted and flagged server-side).
export async function getLast24h(borough: Borough): Promise<DaySeries> {
  const json = await fetchJson<CurrentResponse>("/api/aqi/current");
  if (json.status !== "ok") throw new Error("current route returned an error");
  const series = borough === "Citywide" ? json.citywide : json.boroughs[borough];
  return { hours: series.hours, aqi: series.aqi, fallback: json.fallback ?? null, fetchedAt: json.fetchedAt };
}

// Archive files are one flat HourReading[] per borough-year; cached per URL so a timeline scrub loads each year once.
const archiveCache = new Map<string, Promise<HourReading[]>>();

function archiveYear(borough: Borough, year: number): Promise<HourReading[]> {
  const url = `/data/${slug(borough)}-${year}.json`;
  if (!archiveCache.has(url)) archiveCache.set(url, fetchJson<HourReading[]>(url, 60000));
  return archiveCache.get(url)!;
}

function clientSeriesAQI(hours: HourReading[]): SeriesAQI {
  const vals = hours.map((h) => h.pm25).filter((v): v is number => v != null);
  const daily = vals.length ? pm25ToAQI(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
  const hourly = hours.map((h) => pm25ToAQI(h.pm25)).filter((v): v is number => v != null);
  const hourlyMax = hourly.length ? Math.max(...hourly) : null;
  let latestHour: number | null = null;
  for (let i = hours.length - 1; i >= 0; i--) {
    const a = pm25ToAQI(hours[i].pm25);
    if (a != null) { latestHour = a; break; }
  }
  return {
    daily: daily == null ? null : Math.round(daily),
    hourlyMax: hourlyMax == null ? null : Math.round(hourlyMax),
    latestHour: latestHour == null ? null : Math.round(latestHour),
  };
}

interface HistoricalResponse {
  status: string;
  days: Array<{ date: string; hours: Day; aqi: SeriesAQI }>;
}

// One local day of hourly readings. Past years come from the static archive; the current year from the live-year route. DST days genuinely have 23 or 25 hours.
export async function getDay(borough: Borough, date: string): Promise<DaySeries> {
  const year = Number(date.slice(0, 4));
  const currentYear = new Date().getFullYear();
  if (year < currentYear) {
    const hours = (await archiveYear(borough, year)).filter((h) => h.ts.startsWith(date));
    return { hours, aqi: clientSeriesAQI(hours), fallback: null, fetchedAt: null };
  }
  const json = await fetchJson<HistoricalResponse>(
    `/api/aqi/historical?borough=${encodeURIComponent(borough)}&from=${date}&to=${date}`,
    120000,
  );
  const day = json.days.find((d) => d.date === date);
  return { hours: day?.hours ?? [], aqi: day?.aqi ?? { daily: null, hourlyMax: null, latestHour: null }, fallback: null, fetchedAt: null };
}

// Normalization anchors from the archive build (p05/p95 per borough per pollutant over 2020–2025, §3.10).
let anchorsPromise: Promise<Record<string, PollutantAnchors>> | null = null;

export async function getAnchors(borough: Borough): Promise<PollutantAnchors> {
  anchorsPromise ??= fetchJson<Record<string, PollutantAnchors>>("/data/anchors.json");
  const all = await anchorsPromise;
  const a = all[borough];
  if (!a) throw new Error(`No anchors for ${borough}`);
  return a;
}
