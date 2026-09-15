// scales.ts — the scale ladder, tier lookup, FM tier table, degree math.
// Ported from prototype/phase0.html V4 (STRATEGY §3.4, §3.5). Tier display names live in content.ts; this module deals in indices and structure.

// Scale ladder (§3.4) + FM parameters and melody articulation per tier. FM: low tier = integer ratios and low index (warm); high tier = irrational ratios and high index (metallic, beating) — dissonance lives at the oscillator, not an external distortion stage (§3.5). Note length shortens with tier: same notes, less air (§3.9).
// Tier boundaries are EPA's category lines (D-38, 2026-09-15): Good ≤ 50, Moderate ≤ 100, Unhealthy for Sensitive Groups ≤ 150, Unhealthy ≤ 200, and the top two categories (Very Unhealthy, Hazardous) share Chromatic — there are five scales and six categories. The Phase 0 values (35, 65, 100, 150) put the ear a category ahead of the page's colours: Moderate on the graph was already Whole Tone.
export interface Tier {
  maxAQI: number;
  scaleName: string;
  semis: readonly number[];
  harmonicity: number;
  modulationIndex: number;
  melodyNoteLength: string;
}

export const TIERS: readonly Tier[] = [
  { maxAQI: 50, scaleName: "Major Pentatonic", semis: [0, 2, 4, 7, 9], harmonicity: 1, modulationIndex: 1, melodyNoteLength: "1n" },
  { maxAQI: 100, scaleName: "Whole Tone", semis: [0, 2, 4, 6, 8, 10], harmonicity: 2, modulationIndex: 3, melodyNoteLength: "2n." },
  { maxAQI: 150, scaleName: "Dorian", semis: [0, 2, 3, 5, 7, 9, 10], harmonicity: 3, modulationIndex: 6, melodyNoteLength: "2n" },
  { maxAQI: 200, scaleName: "Phrygian", semis: [0, 1, 3, 5, 7, 8, 10], harmonicity: 2.76, modulationIndex: 12, melodyNoteLength: "4n" },
  { maxAQI: Infinity, scaleName: "Chromatic", semis: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], harmonicity: 1.414, modulationIndex: 24, melodyNoteLength: "8n" },
];

export function tierIndexOf(aqi: number): number {
  return TIERS.findIndex((t) => aqi <= t.maxAQI);
}

// Build a chord for a 1-indexed degree by stacking every-other degree (root, +2, +4) with octave carry. In Chromatic this collapses toward clusters — that is the wreckage working as intended (§3.4).
export function chordMidi(degree: number, scaleSemis: readonly number[], rootMidi: number): number[] {
  const len = scaleSemis.length;
  return [0, 2, 4].map((step) => {
    const j = (degree - 1) + step;
    return rootMidi + scaleSemis[j % len] + 12 * Math.floor(j / len);
  });
}

export const midiToFreq = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);
