// nycOpenData.ts — the data client (DAT-04 client side, UX-01, SON-03).
// Three calls, nothing speculative: getLast24h (live route), getDay (static archive for past years, live-year route for the current year — the EPA API is only ever asked about the current year), getAnchors (archive percentiles, §3.10). First paint calls only getLast24h; nothing else loads until asked (BUG-20).

import type { Day, HourReading } from "../engine/SynthEngine";
import type { PollutantAnchors } from "../engine/contour";
import { seriesAQI, type SeriesAQI } from "../engine/aqi";
export type { SeriesAQI };

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
  boroughs: Record<Exclude<Borough, "Citywide">, { hours: Day }>;
  citywide: { hours: Day };
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
      series[b] = { hours: s.hours, aqi: seriesAQI(s.hours), fallback, fetchedAt: json.fetchedAt }; // the routes ship hours only; every AQI on the page is computed here by one rule (D-42). The live window is 24 hours, so the NowCast's first hours see a shorter window.
    }
    return { series, fetchedAt: json.fetchedAt, fallback };
  })();
  return currentPromise;
}

// Live route: last 24 local hours for one borough.
export async function getLast24h(borough: Borough): Promise<DaySeries> {
  return (await getCurrentAll()).series[borough];
}

// Archive files are one flat HourReading[] per borough-year; cached per URL so a timeline scrub loads each year once. The current year has a snapshot file too (scripts/build-current-year.ts, D-41): the year so far, rebuilt when EPA publishes more; a year without a file resolves to no hours, so a fresh January before the first snapshot still works through the route.
const archiveCache = new Map<string, Promise<HourReading[]>>();

function archiveYear(borough: Borough, year: number): Promise<HourReading[]> {
  const url = `/data/${slug(borough)}-${year}.json`;
  if (!archiveCache.has(url)) archiveCache.set(url, fetchJson<HourReading[]>(url, 60000).catch((e) => { if (year === new Date().getFullYear()) return []; throw e; }));
  return archiveCache.get(url)!;
}
// The last day the current year's snapshot holds, or null when there is none.
async function snapshotLastDate(borough: Borough): Promise<string | null> {
  const hours = await archiveYear(borough, new Date().getFullYear());
  return hours.length ? hours[hours.length - 1].ts.slice(0, 10) : null;
}

// The last day the archive offers. Held at 2026-07-20 for now (Shoro, 2026-09-15): EPA's PM2.5 for New York stops at 07:00 on July 21 while ozone and NO2 run to August 1, and a day without particles has no tier to play. The snapshot still holds the later days; they are served if asked (as the NowCast context for July 20's evening) but never offered. Lift when the snapshot is rebuilt with later PM2.5.
export const ARCHIVE_LAST_DATE = "2026-07-20";

interface HistoricalResponse {
  status: string;
  days: Array<{ date: string; hours: Day }>;
}

// Current-year days are loaded a MONTH at a time and kept for the session: one request to the EPA route serves every day of that month, the CDN caches the month URL for everyone (s-maxage a day, stale a week), and paging day by day within a month costs nothing. Per-day requests made every step a fresh EPA round trip of many seconds. The current month's URL ends at yesterday and so changes daily; past months are stable.
const monthCache = new Map<string, Promise<Map<string, Day>>>();
function monthDays(borough: Borough, ym: string): Promise<Map<string, Day>> {
  const key = `${borough}|${ym}`;
  if (!monthCache.has(key)) {
    const [y, m] = ym.split("-").map(Number);
    const lastOfMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const from = `${ym}-01`;
    const to = `${ym}-${String(lastOfMonth).padStart(2, "0")}` > yesterday ? yesterday : `${ym}-${String(lastOfMonth).padStart(2, "0")}`;
    const p = from > to
      ? Promise.resolve(new Map())
      : fetchJson<HistoricalResponse>(`/api/aqi/historical?borough=${encodeURIComponent(borough)}&from=${from}&to=${to}`, 120000)
          .then((json) => new Map(json.days.map((d) => [d.date, d.hours])));
    p.catch(() => monthCache.delete(key)); // a failed month is not remembered as empty
    monthCache.set(key, p);
  }
  return monthCache.get(key)!;
}

// The hours of one local day. Past years come from the static archive, and so does the current year up to its snapshot's last day (D-41); only days after that come from the route, a month at a time. DST days genuinely have 23 or 25 hours.
async function hoursOf(borough: Borough, date: string): Promise<Day> {
  const year = Number(date.slice(0, 4));
  const currentYear = new Date().getFullYear();
  const snapshotLast = year === currentYear ? await snapshotLastDate(borough) : null;
  if (year < currentYear || (snapshotLast != null && date <= snapshotLast)) {
    return (await archiveYear(borough, year)).filter((h) => h.ts.startsWith(date));
  }
  return (await monthDays(borough, date.slice(0, 7))).get(date) ?? [];
}

const shiftDate = (date: string, days: number): string => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

// One local day with its AQI. The neighbouring days are loaded with it because the AQI reaches across midnight (engine/aqi.ts): the NowCast at 1 am weighs the previous evening, and the day's ozone windows starting after 4 pm run into the next morning. A neighbour that cannot be loaded (before the archive begins, or not yet published) is simply absent and the windows shorten.
export async function getDay(borough: Borough, date: string): Promise<DaySeries> {
  const [hours, prior, next] = await Promise.all([
    hoursOf(borough, date),
    hoursOf(borough, shiftDate(date, -1)).catch(() => []),
    hoursOf(borough, shiftDate(date, 1)).catch(() => []),
  ]);
  return { hours, aqi: seriesAQI(hours, prior, next), fallback: null, fetchedAt: null };
}

// The last day the archive can play, in two stages. The static archive's last day answers at once (its last hour's date); the current year then refines it to the last day EPA has published, which lags real time by days to weeks, by loading months backwards from the current one until one has data (the same loads getDay uses, so the month a visitor lands in is already in memory). Yesterday is never assumed: a day is available only if it has hours.
export async function getArchiveLastDate(borough: Borough): Promise<string> {
  const snap = await snapshotLastDate(borough);
  if (snap) return snap < ARCHIVE_LAST_DATE ? snap : ARCHIVE_LAST_DATE;
  const year = new Date().getFullYear() - 1;
  const hours = await archiveYear(borough, year);
  return hours.length ? hours[hours.length - 1].ts.slice(0, 10) : `${year}-12-31`;
}
// The route is asked only about months the snapshot does not already cover: from this month back to the snapshot's own month, and no further, since everything before is on the CDN.
export async function getLatestAvailableDate(borough: Borough): Promise<string | null> {
  const now = new Date();
  const year = now.getFullYear();
  const snap = await snapshotLastDate(borough);
  if (snap && snap >= ARCHIVE_LAST_DATE) return ARCHIVE_LAST_DATE; // the hold: nothing past it is offered, so the route is not asked
  const floorYm = snap ? snap.slice(0, 7) : null;
  for (let k = 0; k < 4; k++) {
    const d = new Date(Date.UTC(year, now.getMonth() - k, 1));
    if (d.getUTCFullYear() < year) break;
    const ym = d.toISOString().slice(0, 7);
    if (floorYm && ym < floorYm) break;
    const days = [...(await monthDays(borough, ym)).entries()].filter(([, v]) => v.length > 0).map(([date]) => date).filter((date) => (!snap || date > snap) && date <= ARCHIVE_LAST_DATE).sort();
    if (days.length) {
      // Warm the month before it, so the first step back across the month edge is as instant as the steps within it; not when the snapshot already holds it.
      const prev = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
      const prevYm = prev.toISOString().slice(0, 7);
      if (prev.getUTCFullYear() === year && (!floorYm || prevYm >= floorYm)) void monthDays(borough, prevYm).catch(() => undefined);
      return days[days.length - 1];
    }
  }
  return snap;
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
