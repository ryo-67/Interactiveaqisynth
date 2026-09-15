// graphSeries — per-hour series for the graph. AQI is the hour's PM2.5 through the same breakpoint table the number uses (contour.ts), so the line and the number agree.
import { pm25ToAQI } from "../engine/contour";
import type { Day } from "../engine/SynthEngine";

export function pmToAQISeries(day: Day): Array<number | null> {
  return day.map((h) => (h.pm25 == null ? null : pm25ToAQI(Math.max(0, h.pm25))));
}
