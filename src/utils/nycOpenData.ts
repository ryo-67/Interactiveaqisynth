import { AQIDataPoint } from "./mockData";

// ——— Borough types & map data (unchanged) ———

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

export const BOROUGH_CENTERS: Record<
  Borough,
  { x: number; y: number }
> = {
  Citywide: { x: 150, y: 170 },
  Manhattan: { x: 123, y: 142 },
  Bronx: { x: 170, y: 60 },
  Brooklyn: { x: 175, y: 245 },
  Queens: { x: 230, y: 155 },
  "Staten Island": { x: 60, y: 290 },
};

export const BOROUGH_PATHS: Record<
  Exclude<Borough, "Citywide">,
  string
> = {
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

// ——— AQI breakpoint conversions (kept for client-side use in mockData) ———

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

export function pm25ToAQI(conc: number): number {
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

export function o3ToAQI(ppb: number): number {
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

export function no2ToAQI(ppb: number): number {
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

// ——— API client ———

// Same-origin Vercel serverless functions (see /api at the repo root).
// No auth headers needed — same origin, no CORS, keys stay server-side.
// Note: `npm run dev` serves only the frontend; without the functions the
// app falls back to mock data. Use `vercel dev` to run both locally.
const API_BASE = "/api";

/**
 * Fetch with timeout via AbortController.
 * Historical EPA fetches can take 60+ seconds on cold cache (5 years × rate limiting).
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 120000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Retry wrapper with exponential backoff for transient network failures
 * (cold starts, worker pool exhaustion, timeouts, etc.)
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {},
  maxRetries = 3,
  baseDelayMs = 2000,
): Promise<Response> {
  const urlLabel = url.split("/").pop()?.split("?")[0] || url;
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
        console.log(
          `[fetchWithRetry] Retry ${attempt}/${maxRetries} for ${urlLabel} after ${delayMs}ms`,
        );
        await new Promise((r) => setTimeout(r, delayMs));
      }
      const response = await fetchWithTimeout(url, options);
      if (attempt > 0) {
        console.log(
          `[fetchWithRetry] ${urlLabel} succeeded on attempt ${attempt + 1}`,
        );
      }
      return response;
    } catch (err) {
      lastError =
        err instanceof Error ? err : new Error(String(err));
      const msg = lastError.message.toLowerCase();
      const errName = (lastError.name || "").toLowerCase();
      // Retryable: abort/timeout, network failures, generic fetch failures
      const isRetryable =
        errName === "aborterror" ||
        msg.includes("abort") ||
        msg.includes("failed to fetch") ||
        msg.includes("network") ||
        msg.includes("timeout") ||
        msg.includes("signal") ||
        msg.includes("load failed");
      if (!isRetryable) {
        throw lastError;
      }
      console.warn(
        `[fetchWithRetry] ${urlLabel} attempt ${attempt + 1} failed (${lastError.name}: ${lastError.message})`,
      );
    }
  }
  throw lastError || new Error("All retry attempts failed");
}

export type DataSource =
  | "loading"
  | "live-current"
  | "live-historical"
  | "mock";

/**
 * Aggregate data points by date (used for computing citywide from boroughs).
 * Exported for use in the preload pipeline.
 */
export function aggregateByDate(
  allData: AQIDataPoint[],
): AQIDataPoint[] {
  const byDate = new Map<string, AQIDataPoint[]>();
  for (const d of allData) {
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

    let category: string;
    if (aqi <= 50) category = "Good";
    else if (aqi <= 100) category = "Moderate";
    else if (aqi <= 150)
      category = "Unhealthy for Sensitive Groups";
    else if (aqi <= 200) category = "Unhealthy";
    else category = "Very Unhealthy";

    const ratios = [
      { name: "PM2.5", ratio: pm25 / 35 },
      { name: "PM10", ratio: pm10 / 150 },
      { name: "O3", ratio: o3 / 70 },
      { name: "NO2", ratio: no2 / 53 },
    ];
    const mainPollutant = ratios.sort(
      (a, b) => b.ratio - a.ratio,
    )[0].name;

    result.push({
      date,
      aqi,
      category,
      mainPollutant,
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

/**
 * Run the server-side diagnostic to test EPA pipeline health.
 * Logs results to console and returns them.
 */
export async function runDiagnostic(): Promise<any> {
  try {
    console.log(
      "[Diagnostic] Running EPA pipeline diagnostic...",
    );
    const response = await fetchWithTimeout(
      `${API_BASE}/aqi/diagnostic`,
      { timeoutMs: 30000 },
    );
    if (!response.ok) {
      const text = await response.text();
      console.error(
        `[Diagnostic] HTTP ${response.status}: ${text.slice(0, 500)}`,
      );
      return {
        error: `HTTP ${response.status}`,
        body: text.slice(0, 500),
      };
    }
    const json = await response.json();
    console.log(
      "[Diagnostic] Results:",
      JSON.stringify(json.diagnostic, null, 2),
    );
    return json.diagnostic;
  } catch (err) {
    console.error("[Diagnostic] Failed:", err);
    return { error: String(err) };
  }
}

/**
 * Warm up the Edge Function with a lightweight health check.
 * Returns true if the function is responsive, false otherwise.
 */
export async function warmupEdgeFunction(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE}/health`,
      { timeoutMs: 20000 },
    );
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch current AQI for all boroughs from AirNow (via our proxy).
 * Returns null values for boroughs with no data.
 */
export async function fetchCurrentAQI(): Promise<
  Record<Borough, AQIDataPoint | null>
> {
  const response = await fetchWithRetry(
    `${API_BASE}/aqi/current`,
    { timeoutMs: 30000 },
  );

  if (!response.ok) {
    const body = await response.text();
    console.error(
      `[fetchCurrentAQI] HTTP ${response.status}: ${body.slice(0, 300)}`,
    );
    throw new Error(
      `Current AQI fetch failed: HTTP ${response.status}`,
    );
  }

  const json = await response.json();
  if (json.status !== "ok") {
    console.error(`[fetchCurrentAQI] API error: ${json.error}`);
    throw new Error(
      json.error || "Unknown API error fetching current AQI",
    );
  }

  // Normalize the response into our Borough-keyed format
  const result: Record<Borough, AQIDataPoint | null> = {
    Citywide: null,
    Manhattan: null,
    Brooklyn: null,
    Queens: null,
    Bronx: null,
    "Staten Island": null,
  };

  for (const borough of BOROUGHS) {
    result[borough] = json.data[borough] ?? null;
  }

  return result;
}

/**
 * Fetch 5+ years of daily peak AQI data for a specific borough from EPA AQS (via our proxy).
 * The server handles all years sequentially with KV caching per borough-year.
 * Cached years return instantly; uncached years take 5-10s each.
 */
export async function fetchHistoricalAQI(
  borough: Borough,
): Promise<AQIDataPoint[]> {
  const response = await fetchWithRetry(
    `${API_BASE}/aqi/historical?borough=${encodeURIComponent(borough)}`,
    { timeoutMs: 150000 }, // generous — cold EPA fetch takes 3 years × rate limiting
  );

  if (!response.ok) {
    const body = await response.text();
    console.error(
      `[fetchHistoricalAQI] HTTP ${response.status} for ${borough}: ${body.slice(0, 500)}`,
    );
    // Try to parse the error body for a descriptive message
    let detail = `HTTP ${response.status}`;
    try {
      const errJson = JSON.parse(body);
      if (errJson.error) detail = errJson.error;
    } catch {
      /* not JSON */
    }
    throw new Error(
      `EPA historical fetch failed for ${borough}: ${detail}`,
    );
  }

  const json = await response.json();
  if (json.status !== "ok") {
    console.error(
      `[fetchHistoricalAQI] API error for ${borough}: ${json.error}`,
    );
    throw new Error(
      json.error ||
        `Unknown API error fetching historical data for ${borough}`,
    );
  }

  console.log(
    `[fetchHistoricalAQI] ${borough}: ${json.pointCount} data points`,
    json.dateRange
      ? `(${json.dateRange.from} → ${json.dateRange.to})`
      : "(no data)",
  );

  return json.data as AQIDataPoint[];
}

/**
 * Get the latest AQI snapshot per borough (for map coloring).
 * Works with current data (Record<Borough, point|null>) directly.
 */
export function getLatestByBorough(
  currentData: Record<Borough, AQIDataPoint | null>,
): Record<Borough, AQIDataPoint | null> {
  return currentData;
}

/**
 * Fetch true citywide historical data by fetching boroughs SEQUENTIALLY
 * (not parallel — parallel requests overwhelm the Edge Function worker pool)
 * and aggregating client-side.
 *
 * Accepts an optional pre-populated cache so we can skip boroughs the App
 * has already fetched individually.
 */
export async function fetchCitywideHistorical(
  existingCache?: Record<string, AQIDataPoint[]>,
  onProgress?: (
    current: number,
    total: number,
    borough: string,
  ) => void,
): Promise<AQIDataPoint[]> {
  const realBoroughs: Exclude<Borough, "Citywide">[] = [
    "Manhattan",
    "Brooklyn",
    "Queens",
    "Bronx",
    "Staten Island",
  ];

  const allData: AQIDataPoint[] = [];
  const succeeded: string[] = [];
  const total = realBoroughs.length;

  // Sequential requests — one borough at a time
  for (let i = 0; i < realBoroughs.length; i++) {
    const b = realBoroughs[i];
    onProgress?.(i, total, b);

    // Reuse data the App already fetched for individual boroughs
    if (existingCache && existingCache[b]?.length > 0) {
      allData.push(...existingCache[b]);
      succeeded.push(`${b} (cached)`);
      continue;
    }

    try {
      console.log(`[fetchCitywideHistorical] Fetching ${b}...`);
      const data = await fetchHistoricalAQI(b);
      if (data.length > 0) {
        allData.push(...data);
        succeeded.push(b);
      }
    } catch (err) {
      console.warn(
        `[fetchCitywideHistorical] ${b} failed:`,
        err,
      );
      // Continue — partial citywide data is better than none
    }
  }

  onProgress?.(total, total, "Done");

  console.log(
    `[fetchCitywideHistorical] Aggregating ${allData.length} points from ${succeeded.join(", ")}`,
  );
  if (allData.length === 0)
    throw new Error("No historical data from any borough");

  return aggregateByDate(allData);
}

/**
 * Pre-load historical data for ALL boroughs on app startup.
 * Fetches each borough sequentially, then computes a citywide aggregate.
 * Returns a Record<boroughName, AQIDataPoint[]> including "Citywide".
 *
 * After the first successful run, the server's aggregate KV cache makes
 * every subsequent call nearly instant (single KV read per borough).
 */
export async function preloadAllHistorical(
  onProgress?: (
    borough: string,
    index: number,
    total: number,
  ) => void,
): Promise<Record<string, AQIDataPoint[]>> {
  const realBoroughs: Exclude<Borough, "Citywide">[] = [
    "Manhattan",
    "Brooklyn",
    "Queens",
    "Bronx",
    "Staten Island",
  ];

  const result: Record<string, AQIDataPoint[]> = {};
  const total = realBoroughs.length;

  for (let i = 0; i < realBoroughs.length; i++) {
    const b = realBoroughs[i];
    onProgress?.(b, i, total);

    try {
      const data = await fetchHistoricalAQI(b);
      if (data.length > 0) {
        result[b] = data;
        console.log(
          `[preload] ${b}: ${data.length} data points`,
        );
      }
    } catch (err) {
      console.warn(`[preload] ${b} failed:`, err);
      // Continue — partial data is better than none
    }
  }

  // Compute citywide aggregate from all boroughs that succeeded
  const allData: AQIDataPoint[] = [];
  for (const b of realBoroughs) {
    if (result[b]) allData.push(...result[b]);
  }
  if (allData.length > 0) {
    result["Citywide"] = aggregateByDate(allData);
    console.log(
      `[preload] Citywide: ${result["Citywide"].length} aggregated points from ${Object.keys(result).filter((k) => k !== "Citywide").length} boroughs`,
    );
  }

  onProgress?.("Done", total, total);
  return result;
}