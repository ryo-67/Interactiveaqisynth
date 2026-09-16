// scales.ts — the scale ladder, tier lookup, FM tier table, degree math.
// Ported from prototype/phase0.html V4 (STRATEGY §3.4, §3.5). Tier display names live in content.ts; this module deals in indices and structure.

// Scale ladder (§3.4) + FM parameters and melody articulation per tier. FM: low tier = integer ratios and low index (warm); high tier = irrational ratios and high index (metallic, beating) — dissonance lives at the oscillator, not an external distortion stage (§3.5). Note length shortens with tier: same notes, less air (§3.9).
// Tier boundaries are EPA's category lines: Good ≤ 50, Moderate ≤ 100, Unhealthy for Sensitive Groups ≤ 150, Unhealthy ≤ 200, Very Unhealthy ≤ 300, Hazardous above (D-44; D-38 had the top two sharing Chromatic; Phase 0's 35, 65, 100, 150 put the ear a category ahead of the page's colours).
export interface Tier {
  maxAQI: number;
  scaleName: string;
  semis: readonly number[];
  harmonicity: number;
  modulationIndex: number;
  melodyNoteLength: string;
  melodyRelease: number; // seconds; the melody's envelope release at this tier (§3.5): 0.3 everywhere but Hazardous, where 1.2 rings each note under the next two so the chromatic notes pile into a cluster (D-44)
}

// Six tiers, one per EPA grade, on EPA's lines (D-44, 2026-09-16, amending D-02, D-17, D-38). The scales are ordered on one axis, loss of tonal centre: Major, Pentatonic, Dorian, Phrygian, Locrian, Chromatic. Good is the full major scale and Moderate its pentatonic (D-46, Shoro, 2026-09-16, swapping D-44's first two). Very Unhealthy is Locrian, not whole tone (D-47, Shoro's listening pass, 2026-09-16): whole tone floated, ambiguous rather than severe; Locrian is the darkest diatonic step before chromatic, the diminished fifth on the root. Only the scales change; the timbre, note length and σ columns stay with their grades.
// The timbre axis is DISTANCE FROM AN INTEGER RATIO, not the harmonicity number: 1, 2, 2, 3 are integers, so the partials line up and the tone is clean; 2.76 is 0.24 from 3; 1.414 is 0.414 from 1 and 0.586 from 2, further from any integer than 2.76 is. So inharmonicity runs one way up the ladder although the raw number drops at the last step, and the index doubling makes the inharmonic partials louder at each step. The 2.76/12 and 1.414/24 pairs are the ones Phase 0 approved by ear, moved up two grades.
export const TIERS: readonly Tier[] = [
  { maxAQI: 50, scaleName: "Major", semis: [0, 2, 4, 5, 7, 9, 11], harmonicity: 1, modulationIndex: 1, melodyNoteLength: "1n", melodyRelease: 0.3 },
  { maxAQI: 100, scaleName: "Major Pentatonic", semis: [0, 2, 4, 7, 9], harmonicity: 2, modulationIndex: 2, melodyNoteLength: "2n.", melodyRelease: 0.3 },
  { maxAQI: 150, scaleName: "Dorian", semis: [0, 2, 3, 5, 7, 9, 10], harmonicity: 2, modulationIndex: 3, melodyNoteLength: "2n", melodyRelease: 0.3 },
  { maxAQI: 200, scaleName: "Phrygian", semis: [0, 1, 3, 5, 7, 8, 10], harmonicity: 3, modulationIndex: 6, melodyNoteLength: "4n", melodyRelease: 0.3 },
  { maxAQI: 300, scaleName: "Locrian", semis: [0, 1, 3, 5, 6, 8, 10], harmonicity: 2.76, modulationIndex: 12, melodyNoteLength: "8n", melodyRelease: 0.3 },
  { maxAQI: Infinity, scaleName: "Chromatic", semis: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], harmonicity: 1.414, modulationIndex: 24, melodyNoteLength: "8n", melodyRelease: 1.2 },
];

export function tierIndexOf(aqi: number): number {
  return TIERS.findIndex((t) => aqi <= t.maxAQI);
}

// MAPPING (PM2.5 → Brownian detune σ, §3.6, D-44): σ in cents is piecewise-linear in the HOUR'S OWN PM2.5 AQI (the raw hour, not the smoothed tier) through these anchors, held above the last. So the jitter grows all the way up the ladder while only the scale steps; at 400 σ is a full semitone. Metaphor: particulate jitter on the line. A null hour draws nothing.
const DETUNE_ANCHORS: ReadonlyArray<readonly [number, number]> = [[0, 0], [100, 10], [150, 20], [200, 40], [300, 60], [400, 100]];
export const DETUNE_MAX_CENTS = DETUNE_ANCHORS[DETUNE_ANCHORS.length - 1][1]; // the ceiling σ holds at: a full semitone; the monitor's detune band is drawn to it
export function detuneSigma(aqi: number | null): number {
  if (aqi == null) return 0;
  const v = Math.max(0, aqi);
  for (let i = 1; i < DETUNE_ANCHORS.length; i++) {
    const [a0, s0] = DETUNE_ANCHORS[i - 1], [a1, s1] = DETUNE_ANCHORS[i];
    if (v <= a1) return s0 + ((v - a0) / (a1 - a0)) * (s1 - s0);
  }
  return DETUNE_ANCHORS[DETUNE_ANCHORS.length - 1][1];
}

// Build a chord for a 1-indexed degree by stacking every-other degree (root, +2, +4) with octave carry. In Chromatic this collapses toward clusters — that is the wreckage working as intended (§3.4).
// The bed's voicing (§3.8, D-47, Shoro's listening pass, 2026-09-16): stacked fourths, the degree and the notes three and six scale degrees above it (1-4-7 on a seven-note scale), not the every-other-degree triad (1-3-5). Triads made the major bed read as pop and gave it a major-triad cadence; quartal chords carry the scale's colour without the cadence. The same rule is applied in every scale by degree, so the placeholder progression transposes as before.
// By degree, not by interval, and the two edge cases are intended (Shoro, 2026-09-16): in the pentatonic three degrees up is a fifth, so Moderate's chords are stacked fifths (C G D), open and undecided; in the chromatic it is a minor third, so Hazardous's chords are diminished triads (C D# F#), the darkest thing three notes can be. A by-interval rule would put quartal chords in chromatic, and quartal is neutral, which is wrong at the top.
export const CHORD_STEPS: readonly number[] = [0, 3, 6];
export function chordMidi(degree: number, scaleSemis: readonly number[], rootMidi: number): number[] {
  const len = scaleSemis.length;
  return CHORD_STEPS.map((step) => {
    const j = (degree - 1) + step;
    return rootMidi + scaleSemis[j % len] + 12 * Math.floor(j / len);
  });
}

export const midiToFreq = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);
