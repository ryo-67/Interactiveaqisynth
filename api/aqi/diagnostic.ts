import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * GET /api/aqi/diagnostic
 * Tests env-var presence and EPA AQS connectivity to isolate failures.
 * (The KV-store checks from the Supabase version are gone — caching is
 * now handled by the CDN, so there is no storage layer to test.)
 */
export default async function handler(
  _req: VercelRequest,
  res: VercelResponse,
) {
  const steps: Record<string, unknown> = {};
  const startTime = Date.now();

  // Step 1: Check environment variables
  const epaEmail = process.env.EPA_AQS_EMAIL;
  const epaKey = process.env.EPA_AQS_API_KEY;
  steps.envVars = {
    EPA_AQS_EMAIL: epaEmail ? `set (${epaEmail.length} chars)` : "MISSING",
    EPA_AQS_API_KEY: epaKey ? `set (${epaKey.length} chars)` : "MISSING",
    AIRNOW_API_KEY: process.env.AIRNOW_API_KEY ? "set" : "MISSING",
  };

  // Step 2: Test EPA AQS API connectivity (small request: 1 month of 1 pollutant)
  if (epaEmail && epaKey) {
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
      const response = await fetch(testUrl, { signal: controller.signal });
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
        const headerStatus = json.Header?.[0]?.status || "unknown";
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
  } else {
    steps.epaApi = { status: "skipped", reason: "EPA credentials not set" };
  }

  steps.totalElapsedMs = Date.now() - startTime;

  console.log(`[/aqi/diagnostic] Results: ${JSON.stringify(steps)}`);
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ status: "ok", diagnostic: steps });
}
