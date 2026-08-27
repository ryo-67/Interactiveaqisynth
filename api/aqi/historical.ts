import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  toBoroughHours,
  seriesAQI,
  utcToNyIso,
  addDays,
  BOROUGHS,
  COUNTY_TO_BOROUGH,
  NY_STATE_FIPS,
  type Borough,
  type BoroughSeries,
  type Pollutant,
  type SiteHourRow,
} from "../_lib/aqi";

/**
 * GET /api/aqi/historical?borough=Queens&from=2026-06-01&to=2026-06-07 — hourly days within the CURRENT YEAR only (DAT-03; fixes BUG-15, BUG-16).
 * Anything before January 1 of the current year comes from the static archive under public/data/, never from the API.
 * EPA AQS sampleData/byCounty, all four parameters (88101, 88502, 44201, 42602) in one request per county, all five counties fetched (the citywide mean and D-16 substitution need every borough), paced to stay polite with EPA. O3 arrives in ppm and is converted to ppb; only 1-hour sample durations are kept; null sample_measurement is skipped, never zeroed.
 * "Citywide" is a valid borough value. CDN-cached one day, stale-while-revalidate one week. maxDuration is set explicitly in vercel.json (INF-03, BUG-23).
 */

const EPA_PARAMS = "88101,88502,44201,42602";
const PARAM_TO_POLLUTANT: Record<string, Pollutant> = {
  "88101": "pm25",
  "88502": "pm25",
  "44201": "o3",
  "42602": "no2",
};

interface AQSRow {
  parameter_code: string;
  date_local: string;
  time_local: string;
  date_gmt: string;
  time_gmt: string;
  sample_measurement: number | null;
  sample_duration: string;
  county_code: string;
  state_code: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const email = process.env.EPA_AQS_EMAIL;
  const apiKey = process.env.EPA_AQS_API_KEY;
  if (!email || !apiKey) {
    res.setHeader("Cache-Control", "no-store");
    res.status(500).json({ status: "error", error: "EPA_AQS_EMAIL and EPA_AQS_API_KEY environment variables are required" });
    return;
  }

  const boroughParam = String(req.query.borough ?? "");
  const isCitywide = boroughParam === "Citywide";
  if (!isCitywide && !BOROUGHS.includes(boroughParam as Borough)) {
    res.setHeader("Cache-Control", "no-store");
    res.status(400).json({ status: "error", error: `Invalid borough. Must be one of: Citywide, ${BOROUGHS.join(", ")}` });
    return;
  }

  const year = new Date().getFullYear();
  const from = String(req.query.from ?? "");
  const to = String(req.query.to ?? "");
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRe.test(from) || !dateRe.test(to) || from > to) {
    res.setHeader("Cache-Control", "no-store");
    res.status(400).json({ status: "error", error: "from and to must be YYYY-MM-DD with from <= to" });
    return;
  }
  if (!from.startsWith(`${year}-`) || !to.startsWith(`${year}-`)) {
    res.setHeader("Cache-Control", "no-store");
    res.status(400).json({ status: "error", error: `This route serves the current year (${year}) only; earlier days live in the static archive under /data/` });
    return;
  }

  try {
    // O-12: EPA bounds requests in Local Standard Time, so a wall-clock day's edge hours can live in the neighboring LST date. Pad the request window by one day each side (clamped to the year — AQS rejects cross-year windows), then trim to the requested local range after conversion.
    const paddedFrom = addDays(from, -1) < `${year}-01-01` ? `${year}-01-01` : addDays(from, -1);
    const paddedTo = addDays(to, 1) > `${year}-12-31` ? `${year}-12-31` : addDays(to, 1);
    const bdate = paddedFrom.replaceAll("-", "");
    const edate = paddedTo.replaceAll("-", "");
    const rows: SiteHourRow[] = [];

    // One request per county, sequential with a short gap — EPA asks for pacing, and five requests is the whole fan-out.
    for (const county of Object.keys(COUNTY_TO_BOROUGH)) {
      const url =
        `https://aqs.epa.gov/data/api/sampleData/byCounty?email=${encodeURIComponent(email)}` +
        `&key=${encodeURIComponent(apiKey)}&param=${EPA_PARAMS}&bdate=${bdate}&edate=${edate}` +
        `&state=${NY_STATE_FIPS}&county=${county}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 50000);
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`EPA AQS HTTP ${response.status} for county ${county}`);
        const json = (await response.json()) as { Data?: AQSRow[] };
        for (const r of json.Data ?? []) {
          const pollutant = PARAM_TO_POLLUTANT[r.parameter_code];
          if (!pollutant || r.sample_measurement == null) continue;
          if (!r.sample_duration.startsWith("1 HOUR")) continue;
          rows.push({
            stateFips: r.state_code ?? NY_STATE_FIPS,
            countyFips: r.county_code,
            pollutant,
            ts: localIsoWithOffset(r),
            value: pollutant === "o3" ? r.sample_measurement * 1000 : r.sample_measurement,
          });
        }
      } finally {
        clearTimeout(timer);
      }
      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    // Axis: every local hour actually observed, sorted; grouped into days by local date below.
    const axis = [...new Set(rows.map((r) => r.ts))].sort();
    const result = toBoroughHours(rows, axis);
    const series: BoroughSeries = isCitywide ? result.citywide : result.boroughs[boroughParam as Borough];

    // Split the requested borough's series into local days. DST days genuinely carry 23 or 25 hours.
    const byDate = new Map<string, typeof series.hours>();
    for (const h of series.hours) {
      const date = h.ts.slice(0, 10);
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date)!.push(h);
    }
    const days = [...byDate.entries()]
      .filter(([date]) => date >= from && date <= to) // trim the padding back to the requested range
      .map(([date, hours]) => ({ date, hours, aqi: seriesAQI(hours) }));

    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    res.status(200).json({ status: "ok", source: "epa_aqs", borough: boroughParam, from, to, days });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`[/aqi/historical] Error for ${boroughParam}: ${msg}`);
    res.setHeader("Cache-Control", "no-store");
    res.status(500).json({ status: "error", error: `Failed to fetch historical data for ${boroughParam}: ${msg}` });
  }
}

// EPA reports date_local/time_local in Local STANDARD Time year-round (no DST), which would sit an hour off AirNow's live wall-clock labels every summer. One timestamp rule everywhere: derive the instant from the GMT fields and render it as true America/New_York wall clock with offset.
function localIsoWithOffset(r: AQSRow): string {
  const gmt = Date.UTC(
    Number(r.date_gmt.slice(0, 4)), Number(r.date_gmt.slice(5, 7)) - 1, Number(r.date_gmt.slice(8, 10)),
    Number(r.time_gmt.slice(0, 2)), Number(r.time_gmt.slice(3, 5)),
  );
  return utcToNyIso(new Date(gmt));
}
