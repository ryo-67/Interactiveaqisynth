import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchHistorical, BOROUGHS, type Borough } from "../_lib/aqi";

/**
 * GET /api/aqi/historical?borough=Manhattan
 * Returns 3 years of daily peak AQI data for a borough from EPA AQS.
 * Cached at the CDN for a day per borough (each ?borough= URL is its own
 * cache entry), with stale-while-revalidate for a week.
 *
 * Valid boroughs: Citywide, Manhattan, Brooklyn, Queens, Bronx, Staten Island
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const raw = req.query.borough;
  const borough = (Array.isArray(raw) ? raw[0] : raw) as Borough | undefined;

  if (!borough || !BOROUGHS.includes(borough)) {
    res.setHeader("Cache-Control", "no-store");
    res.status(400).json({
      status: "error",
      error: `Invalid borough. Must be one of: ${BOROUGHS.join(", ")}`,
    });
    return;
  }

  try {
    console.log(`[/aqi/historical] Request for ${borough}`);
    const data = await fetchHistorical(borough);
    console.log(`[/aqi/historical] Success for ${borough}: ${data.length} points`);
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=86400, stale-while-revalidate=604800",
    );
    res.status(200).json({
      status: "ok",
      source: "epa_aqs",
      borough,
      pointCount: data.length,
      dateRange:
        data.length > 0
          ? { from: data[0].date, to: data[data.length - 1].date }
          : null,
      data,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack?.slice(0, 300) : "";
    console.log(`[/aqi/historical] Error for ${borough}: ${msg}\n${stack}`);
    res.setHeader("Cache-Control", "no-store");
    res.status(500).json({
      status: "error",
      error: `Failed to fetch historical data for ${borough}: ${msg}`,
    });
  }
}
