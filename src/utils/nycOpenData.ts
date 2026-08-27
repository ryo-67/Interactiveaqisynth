// nycOpenData.ts — the data client (DAT-04 client side, UX-01, SON-03).
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

// One live fetch for the whole city, cached: the response already carries every borough, so switching boroughs is local (§5.4 crossfade, no spinner).
export interface CurrentSnapshot {
  series: Record<Borough, DaySeries>;
  fetchedAt: string;
  fallback: "zipcode" | null;
}

let currentPromise: Promise<CurrentSnapshot> | null = null;

export function getCurrentAll(): Promise<CurrentSnapshot> {
  currentPromise ??= (async () => {
    const json = await fetchJson<CurrentResponse>("/api/aqi/current");
    if (json.status !== "ok") throw new Error("current route returned an error");
    const fallback = json.fallback ?? null;
    const series = {} as Record<Borough, DaySeries>;
    for (const b of BOROUGHS) {
      const s = b === "Citywide" ? json.citywide : json.boroughs[b];
      series[b] = { hours: s.hours, aqi: s.aqi, fallback, fetchedAt: json.fetchedAt };
    }
    return { series, fetchedAt: json.fetchedAt, fallback };
  })();
  return currentPromise;
}

// Live route: last 24 local hours for one borough.
export async function getLast24h(borough: Borough): Promise<DaySeries> {
  return (await getCurrentAll()).series[borough];
}

// Archive files are one flat HourReading[] per borough-year; cached per URL so a timeline scrub loads each year once.
const archiveCache = new Map<string, Promise<HourReading[]>>();

function archiveYear(borough: Borough, year: number): Promise<HourReading[]> {
  const url = `/data/${slug(borough)}-${year}.json`;
  if (!archiveCache.has(url)) archiveCache.set(url, fetchJson<HourReading[]>(url, 60000));
  return archiveCache.get(url)!;
}

export function clientSeriesAQI(hours: HourReading[]): SeriesAQI {
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
