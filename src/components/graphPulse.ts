// graphPulse — the pulse row's data: the exact hit pattern the engine plays, 16 steps per bar of four hours, six bars a day (§3.2, §3.9). Built from the engine's own barK and euclidHit with the engine's own rotation rule, so the marks are the rhythm rather than a summary of it. Pinned by graphPulse.test.ts against the engine.
import { barK, euclidHit } from "../engine/euclid";
import { normalize, type PollutantAnchors } from "../engine/contour";
import type { Day } from "../engine/SynthEngine";

export const STEPS_PER_BAR = 16;
export const HOURS_PER_BAR = 4;
export const STEPS_PER_HOUR = STEPS_PER_BAR / HOURS_PER_BAR;

// One entry per sixteenth-note step of the day: true = hit, false = rest, null = the bar has no NO2 (no pulse, §4.4).
export function pulseSteps(day: Day, anchors: PollutantAnchors): Array<boolean | null> {
  const out: Array<boolean | null> = [];
  const bars = Math.ceil(day.length / HOURS_PER_BAR);
  for (let b = 0; b < bars; b++) {
    const hours = day.slice(b * HOURS_PER_BAR, b * HOURS_PER_BAR + HOURS_PER_BAR);
    const k = barK(hours.map((h) => normalize(h.no2, anchors.no2)));
    const rotation = (b * HOURS_PER_BAR) % STEPS_PER_BAR; // the engine's rule: SynthEngine.setDay
    const stepsThisBar = hours.length * STEPS_PER_HOUR; // a short final bar on a 23-hour DST day
    for (let s = 0; s < stepsThisBar; s++) out.push(k == null ? null : euclidHit(s, k, STEPS_PER_BAR, rotation));
  }
  return out;
}
