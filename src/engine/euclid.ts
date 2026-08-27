// euclid.ts — Euclidean rhythm (Bjorklund) with rotation.
// Ported from prototype/phase0.html V4 (STRATEGY §3.2, §3.9).

// Bjorklund via the Bresenham formulation: step i of n is a hit when the k-count advances. Rotation r shifts the pattern left so the bar's downbeat character follows the hour of day.
export function euclidHit(step: number, k: number, n: number, rotation: number): boolean {
  const i = (step + rotation) % n;
  return Math.floor(((i + 1) * k) / n) - Math.floor((i * k) / n) > 0;
}

// MAPPING (NO2 → pulse density, §3.2/§3.9): mean normalized NO2 of a bar's hours → k = round(3 + 8·v) clamped 3..11 over 16 steps. Metaphor: combustion traffic as rhythmic pressure — rush hour hammers, empty streets tick. Null (no reporting hours) → no pulse that bar (§4.4).
export function barK(no2nValues: ReadonlyArray<number | null>): number | null {
  const vals = no2nValues.filter((v): v is number => v != null);
  if (vals.length === 0) return null;
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
  return Math.min(11, Math.max(3, Math.round(3 + 8 * mean)));
}
