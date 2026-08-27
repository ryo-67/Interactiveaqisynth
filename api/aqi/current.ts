import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchCurrent } from "../_lib/aqi";

/**
 * GET /api/aqi/current
 * Returns current AQI for all NYC boroughs from AirNow.
 * Cached at the CDN for 30 minutes.
 */
export default async function handler(
  _req: VercelRequest,
  res: VercelResponse,
) {
  try {
    const data = await fetchCurrent();
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=1800, stale-while-revalidate=3600",
    );
    res.status(200).json({ status: "ok", source: "airnow", data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`[/aqi/current] Error: ${msg}`);
    res.setHeader("Cache-Control", "no-store");
    res.status(500).json({
      status: "error",
      error: `Failed to fetch current AQI: ${msg}`,
    });
  }
}
