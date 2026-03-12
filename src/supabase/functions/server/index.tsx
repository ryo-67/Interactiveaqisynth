import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import {
  fetchCurrent,
  fetchHistorical,
  type Borough,
  BOROUGHS,
} from "./aqi-service.tsx";

const app = new Hono();

// Enable logger
app.use("*", logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-ca7e1b38/health", (c) => {
  return c.json({ status: "ok" });
});

// ——— AQI Routes ———

/**
 * GET /make-server-ca7e1b38/aqi/current
 * Returns current AQI for all NYC boroughs from AirNow.
 * Cached for 30 minutes.
 */
app.get("/make-server-ca7e1b38/aqi/current", async (c) => {
  try {
    const data = await fetchCurrent();
    return c.json({ status: "ok", source: "airnow", data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`[/aqi/current] Error: ${msg}`);
    return c.json(
      {
        status: "error",
        error: `Failed to fetch current AQI: ${msg}`,
      },
      500,
    );
  }
});

/**
 * GET /make-server-ca7e1b38/aqi/historical?borough=Manhattan
 * Returns 5+ years of daily peak AQI data for a specific borough from EPA AQS.
 * Each borough-year is cached permanently (current year refreshes weekly).
 *
 * Valid boroughs: Citywide, Manhattan, Brooklyn, Queens, Bronx, Staten Island
 */
app.get("/make-server-ca7e1b38/aqi/historical", async (c) => {
  const borough = c.req.query("borough") as Borough | undefined;

  if (!borough || !BOROUGHS.includes(borough)) {
    return c.json(
      {
        status: "error",
        error: `Invalid borough. Must be one of: ${BOROUGHS.join(", ")}`,
      },
      400,
    );
  }

  try {
    console.log(`[/aqi/historical] Request for ${borough}`);
    const data = await fetchHistorical(borough);
    console.log(
      `[/aqi/historical] Success for ${borough}: ${data.length} points`,
    );
    return c.json({
      status: "ok",
      source: "epa_aqs",
      borough,
      pointCount: data.length,
      dateRange:
        data.length > 0
          ? {
              from: data[0].date,
              to: data[data.length - 1].date,
            }
          : null,
      data,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const stack =
      e instanceof Error ? e.stack?.slice(0, 300) : "";
    console.log(
      `[/aqi/historical] Error for ${borough}: ${msg}\n${stack}`,
    );
    return c.json(
      {
        status: "error",
        error: `Failed to fetch historical data for ${borough}: ${msg}`,
      },
      500,
    );
  }
});

/**
 * DELETE /make-server-ca7e1b38/aqi/cache
 * Clears all cached AQI data. Useful for forcing a refresh.
 */
app.delete("/make-server-ca7e1b38/aqi/cache", async (c) => {
  try {
    const boroughNames = [
      "Manhattan",
      "Brooklyn",
      "Queens",
      "Bronx",
      "Staten Island",
    ];
    const currentYear = new Date().getFullYear();
    const keysToDelete: string[] = ["aqi:current:all"];
    for (const b of boroughNames) {
      keysToDelete.push(`aqi:hist:agg:${b}`);
      for (let y = currentYear - 5; y <= currentYear; y++) {
        keysToDelete.push(`aqi:hist:${b}:${y}`);
      }
    }
    keysToDelete.push("aqi:hist:agg:Citywide");
    await kv.mdel(keysToDelete);
    console.log(
      `[/aqi/cache] Cleared ${keysToDelete.length} cache keys`,
    );
    return c.json({
      status: "ok",
      cleared: keysToDelete.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`[/aqi/cache] Error clearing cache: ${msg}`);
    return c.json(
      {
        status: "error",
        error: `Failed to clear cache: ${msg}`,
      },
      500,
    );
  }
});

/**
 * GET /make-server-ca7e1b38/aqi/diagnostic
 * Tests each step of the EPA historical pipeline to isolate failures.
 */
app.get("/make-server-ca7e1b38/aqi/diagnostic", async (c) => {
  const steps: Record<string, any> = {};
  const startTime = Date.now();

  // Step 1: Check environment variables
  const epaEmail = Deno.env.get("EPA_AQS_EMAIL");
  const epaKey = Deno.env.get("EPA_AQS_API_KEY");
  steps.envVars = {
    EPA_AQS_EMAIL: epaEmail
      ? `set (${epaEmail.length} chars)`
      : "MISSING",
    EPA_AQS_API_KEY: epaKey
      ? `set (${epaKey.length} chars)`
      : "MISSING",
    AIRNOW_API_KEY: Deno.env.get("AIRNOW_API_KEY")
      ? "set"
      : "MISSING",
  };

  // Step 2: Test KV store read
  try {
    const testVal = await kv.get("aqi:diagnostic:test");
    steps.kvRead = {
      status: "ok",
      value: testVal ?? "(no entry)",
    };
  } catch (e) {
    steps.kvRead = { status: "error", error: String(e) };
  }

  // Step 3: Test KV store write
  try {
    await kv.set("aqi:diagnostic:test", {
      timestamp: Date.now(),
      msg: "diagnostic ping",
    });
    steps.kvWrite = { status: "ok" };
  } catch (e) {
    steps.kvWrite = { status: "error", error: String(e) };
  }

  // Step 4: Check cache state for Manhattan
  try {
    const currentYear = new Date().getFullYear();
    const cacheStatus: Record<string, string> = {};
    for (let y = currentYear - 5; y <= currentYear; y++) {
      const key = `aqi:hist:Manhattan:${y}`;
      const cached = await kv.get(key);
      if (cached && cached.data) {
        const ageHours = Math.round(
          (Date.now() - cached.cachedAt) / (1000 * 60 * 60),
        );
        cacheStatus[`${y}`] =
          `${cached.data.length} points, ${ageHours}h old`;
      } else {
        cacheStatus[`${y}`] = "empty";
      }
    }
    steps.manhattanCache = { status: "ok", years: cacheStatus };
  } catch (e) {
    steps.manhattanCache = {
      status: "error",
      error: String(e),
    };
  }

  // Step 5: Test EPA AQS API connectivity (small request: 1 month of 1 pollutant)
  if (epaEmail && epaKey) {
    try {
      const testUrl =
        `https://aqs.epa.gov/data/api/dailyData/byCounty` +
        `?email=${encodeURIComponent(epaEmail)}` +
        `&key=${encodeURIComponent(epaKey)}` +
        `&param=88101&bdate=20250101&edate=20250131` +
        `&state=36&county=061`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const epaStart = Date.now();
      try {
        const response = await fetch(testUrl, {
          signal: controller.signal,
        });
        clearTimeout(timer);
        const elapsed = Date.now() - epaStart;

        if (!response.ok) {
          const text = await response.text();
          steps.epaApi = {
            status: "error",
            httpStatus: response.status,
            body: text.slice(0, 300),
            elapsedMs: elapsed,
          };
        } else {
          const json = await response.json();
          const rowCount = json.Data ? json.Data.length : 0;
          const headerStatus =
            json.Header?.[0]?.status || "unknown";
          steps.epaApi = {
            status: "ok",
            headerStatus,
            rows: rowCount,
            elapsedMs: elapsed,
          };
        }
      } catch (fetchErr) {
        clearTimeout(timer);
        steps.epaApi = {
          status: "error",
          error: String(fetchErr),
          elapsedMs: Date.now() - epaStart,
        };
      }
    } catch (e) {
      steps.epaApi = { status: "error", error: String(e) };
    }
  } else {
    steps.epaApi = {
      status: "skipped",
      reason: "EPA credentials not set",
    };
  }

  steps.totalElapsedMs = Date.now() - startTime;

  console.log(
    `[/aqi/diagnostic] Results: ${JSON.stringify(steps)}`,
  );
  return c.json({ status: "ok", diagnostic: steps });
});

Deno.serve(app.fetch);