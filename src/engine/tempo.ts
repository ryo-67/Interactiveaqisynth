// tempo.ts — the piece's time grid (D-12): fixed, never data. One beat is one hour and a bar is four beats, so a day is 24 beats in six bars. The engine's transport and every visual beat (theme.ts motion.beatMs: the playhead, the sun's glide, the morphs) read the tempo from here, so the sound and the picture cannot drift apart.
export const BPM = 90;
export const BEAT_S = 60 / BPM; // one beat = one hour = 0.667 s; every parameter ramp uses this (never jump)
export const HOURS_PER_BAR = 4;
