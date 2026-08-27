// contour.ts — normalization, AQI breakpoints, tier smoothing, melody quantization.
// Ported from prototype/phase0.html V4 (STRATEGY §3.10, §3.4, §3.6).

// Corpus normalization (§3.10): p05 → 0, p95 → 1, clamped at 0 below. Values above 1 are left unclamped here; each mapping applies its own ceiling so extreme days sit off the top (June 7 PM2.5 normalizes to ~13 against the 2023 Queens anchors — that is the point).
export interface NormAnchors {
  p05: number;
  p95: number;
}

export interface PollutantAnchors {
  pm25: NormAnchors;
  o3: NormAnchors;
  no2: NormAnchors;
}

export function normalize(value: number | null, anchors: NormAnchors): number | null {
  if (value == null) return null;
  return Math.max(0, (value - anchors.p05) / (anchors.p95 - anchors.p05));
}

// EPA PM2.5 AQI breakpoints, linear within each band. Negative PM2.5 is instrument noise, clamped to 0 before conversion.
const AQI_BP: ReadonlyArray<readonly [number, number, number, number]> = [
  [0.0, 12.0, 0, 50],
  [12.1, 35.4, 51, 100],
  [35.5, 55.4, 101, 150],
  [55.5, 150.4, 151, 200],
  [150.5, 250.4, 201, 300],
  [250.5, 500.4, 301, 500],
];

export function pm25ToAQI(conc: number | null): number | null {
  if (conc == null) return null;
  const c = Math.max(0, conc);
  for (const [cLo, cHi, iLo, iHi] of AQI_BP) {
    if (c <= cHi) return iLo + ((c - cLo) / (cHi - cLo)) * (iHi - iLo);
  }
  return 500;
}

// MAPPING (PM2.5 → AQI tier, §3.4): hourly AQI exponentially smoothed (α = 0.3) so tier does not flicker hour to hour. State carries across the loop wrap — Listen mode is a rolling window with no seam. A null hour holds the last value (§4.4: never estimated). reset() on day switch or play reseeds from the next reported hour.
export class SmoothedAQI {
  private state: number | null = null;
  private readonly alpha: number;

  constructor(alpha = 0.3) {
    this.alpha = alpha;
  }

  update(rawAQI: number | null): number | null {
    if (rawAQI != null) {
      this.state = this.state == null ? rawAQI : this.alpha * rawAQI + (1 - this.alpha) * this.state;
    }
    return this.state;
  }

  get value(): number | null {
    return this.state;
  }

  reset(): void {
    this.state = null;
  }
}

// MAPPING (O3 → melody pitch, §3.2): normalized O3 spans two octaves above the root, quantized to the nearest degree of the current scale. The contour is preserved across scales — the same arch, wrecked — which is the mechanism by which June 7 reads as the same piece.
export function melodyMidi(o3n: number, scaleSemis: readonly number[], rootMidi: number): number {
  const target = rootMidi + Math.min(1, o3n) * 24;
  let best = rootMidi;
  let bestDist = Infinity;
  for (let oct = 0; oct <= 2; oct++) {
    for (const s of scaleSemis) {
      const m = rootMidi + 12 * oct + s;
      if (m > rootMidi + 24) continue;
      const d = Math.abs(m - target);
      if (d < bestDist) {
        bestDist = d;
        best = m;
      }
    }
  }
  return best;
}
