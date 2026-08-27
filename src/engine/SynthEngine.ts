// SynthEngine.ts — V1, ported from prototype/phase0.html V4 (the Phase 0 reference engine).
// STRATEGY §3 is the spec; §3.5/§3.6 hold the locked voice identities and effect values. No UI in this file.
// Clock: 90 BPM, 4/4. One hour = one beat. One day = 24 beats = 6 bars, looped (§3.3, §3.9). The transport never encodes data (D-12).
// Carried from Phase 0 engineering: offset start (never pre-set .position while stopped — a stopped transport replays skipped events in one same-time burst), loop-boundary dedup (Tone fires the wrap event at both "6m" and "0"), two-reverb crossfade (Tone.Reverb cannot ramp decay), private bass lowpass, one-beat parameter ramps throughout.

import * as Tone from "tone";
import { normalize, pm25ToAQI, SmoothedAQI, melodyMidi, type PollutantAnchors } from "./contour";
import { euclidHit, barK } from "./euclid";
import { TIERS, tierIndexOf, chordMidi, midiToFreq } from "./scales";

export type SourceTag = "own" | "citywide";

export interface HourReading {
  ts: string; // ISO local hour
  pm25: number | null; // µg/m³, max across sites
  o3: number | null; // ppb
  no2: number | null; // ppb
  source: { pm25: SourceTag; o3: SourceTag; no2: SourceTag };
}

export type Day = HourReading[];

export interface BeatInfo {
  hour: number;
  tierIndex: number;
  scaleName: string;
  k: number | null; // current bar's Euclidean density; null = no pulse this bar (§4.4)
  borrowed: { pm25: boolean; o3: boolean; no2: boolean };
  smoothedAQI: number | null;
  pm25: number | null;
  o3: number | null;
  no2: number | null;
}

const BEAT_S = 60 / 90; // one beat = one hour = 0.667 s; every parameter ramp uses this (never jump)
const MELODY_ROOT_MIDI = 48; // C3; melody spans two octaves to C5 (§3.2)
const CHORD_ROOT_MIDI = 60; // C4; bed triads stack upward from here

interface BarState {
  k: number | null;
  rotation: number;
}

export class SynthEngine {
  private anchors: PollutantAnchors;
  private bedDegrees: number[] = [1, 5, 4, 1, 5, 1]; // Phase 0 placeholder bed (§3.8); the real bed is SON-10 and arrives via setBed
  private day: Day | null = null;
  private bars: BarState[] = [];
  private smoother = new SmoothedAQI(0.3);
  private curTier = 0;
  private curChordRootMidi = CHORD_ROOT_MIDI;
  private curBarK: number | null = null;
  private startHour = 0;
  private beatCallback: ((info: BeatInfo) => void) | null = null;
  private initPromise: Promise<void> | null = null;

  // Loop-wrap dedup: each callback drops a second firing closer than half its own interval; reset on every (re)start so a day switch never swallows its first events.
  private lastBeatTime = -1;
  private lastStepTime = -1;

  private melody!: Tone.FMSynth;
  private pulse!: Tone.FMSynth;
  private bass!: Tone.FMSynth;
  private bedVoices!: Tone.FMSynth[];
  private filter!: Tone.Filter;
  private dryGain!: Tone.Gain;
  private revShortGain!: Tone.Gain;
  private revLongGain!: Tone.Gain;

  constructor(anchors: PollutantAnchors) {
    this.anchors = anchors;
  }

  // Must be called from a user gesture the first time (Tone.start()). Single-flight: concurrent calls share one build.
  init(): Promise<void> {
    return (this.initPromise ??= this.buildAudio());
  }

  private async buildAudio(): Promise<void> {
    await Tone.start();

    // Shared effects chain, uniform across voices (§3.6): every voice → lowpass → reverb → destination.
    // MAPPING (O3 → lowpass ceiling): cutoff = 2500 Hz at normalized O3 = 0 up to 12000 Hz at 1. Metaphor: visibility — O3 peaks with sunlight; overnight titrated O3 near zero holds the piece dark, which is NO titration rendered as arrangement (§3.6).
    this.filter = new Tone.Filter(2500, "lowpass");
    // MAPPING (PM2.5 → reverb, §3.6): wet = 0.15 + 0.6·pm25n (clamp 0.9); "decay" 1.5 s → 7.5 s is a crossfade between two static reverbs because Tone.Reverb cannot ramp decay. Metaphor: fog — particulates scatter the sound field.
    this.dryGain = new Tone.Gain(0.85);
    this.revShortGain = new Tone.Gain(0.15);
    this.revLongGain = new Tone.Gain(0);
    const revShort = new Tone.Reverb({ decay: 1.5, wet: 1 });
    const revLong = new Tone.Reverb({ decay: 7.5, wet: 1 });
    await Promise.all([revShort.ready, revLong.ready]);
    this.filter.connect(this.dryGain);
    this.dryGain.toDestination();
    this.filter.connect(this.revShortGain);
    this.revShortGain.connect(revShort);
    revShort.toDestination();
    this.filter.connect(this.revLongGain);
    this.revLongGain.connect(revLong);
    revLong.toDestination();

    // Four FM voices (§3.5), all through the shared chain. Envelope and volume values are mix choices from Phase 0, not data mappings.
    this.melody = new Tone.FMSynth({ volume: -8, envelope: { attack: 0.02, decay: 0.1, sustain: 0.7, release: 0.3 } }).connect(this.filter);
    // Pulse identity (locked V3): fixed harmonicity 7 so it reads as click/mallet, not a tone; 1 ms attack, 80 ms decay, no sustain. A one-octave-down pitch envelope over the first 30 ms is applied per hit. Soft tick at Easy, hammer at Suffocating via the tier's full modulation index.
    this.pulse = new Tone.FMSynth({ volume: -12, harmonicity: 7, envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 }, modulationEnvelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.05 } }).connect(this.filter);
    // Bass identity (locked V3): a sub that never goes metallic — 40 ms attack, 0.8 s release, private 400 Hz lowpass before the shared chain so it stays a floor.
    this.bass = new Tone.FMSynth({ volume: -10, envelope: { attack: 0.04, decay: 0.2, sustain: 0.6, release: 0.8 } });
    const bassFloor = new Tone.Filter(400, "lowpass");
    this.bass.connect(bassFloor);
    bassFloor.connect(this.filter);
    // Bed pad is three mono FMSynths (one per triad note) instead of PolySynth so harmonicity/modulationIndex can ramp, not jump.
    this.bedVoices = [0, 1, 2].map(() => new Tone.FMSynth({ volume: -16, envelope: { attack: 0.4, decay: 0.3, sustain: 0.8, release: 1.2 } }).connect(this.filter));

    const transport = Tone.getTransport();
    transport.bpm.value = 90;
    transport.timeSignature = 4;
    transport.loop = true;
    transport.loopStart = 0;
    transport.loopEnd = "6m";
    transport.scheduleRepeat((t) => this.onBeatTick(t), "4n", 0);
    transport.scheduleRepeat((t) => this.onStep16(t), "16n", 0);
  }

  // Precompute per-bar Euclidean state from the day's NO2. Rotation = bar-start hour mod 16 (§3.5).
  setDay(day: Day, anchors?: PollutantAnchors): void {
    if (anchors) this.anchors = anchors;
    this.day = day;
    this.bars = [];
    for (let b = 0; b < 6; b++) {
      const no2n = day.slice(b * 4, b * 4 + 4).map((h) => normalize(h.no2, this.anchors.no2));
      this.bars.push({ k: barK(no2n), rotation: (b * 4) % 16 });
    }
    const wasPlaying = Tone.getTransport().state === "started";
    Tone.getTransport().stop();
    this.smoother.reset(); // new day = new seed (raw AQI at the start hour); within a day the state carries across the wrap
    if (wasPlaying) this.startTransport();
  }

  setBed(degrees: number[]): void {
    this.bedDegrees = degrees;
  }

  setStartHour(hour: number): void {
    this.startHour = Math.min(23, Math.max(0, Math.floor(hour)));
  }

  setVolume(db: number): void {
    Tone.getDestination().volume.rampTo(db, 0.1);
  }

  onBeat(cb: ((info: BeatInfo) => void) | null): void {
    this.beatCallback = cb;
  }

  async play(): Promise<void> {
    await this.init();
    if (!this.day || Tone.getTransport().state === "started") return;
    this.smoother.reset();
    this.startTransport();
  }

  stop(): void {
    Tone.getTransport().stop();
  }

  private startTransport(): void {
    this.lastBeatTime = this.lastStepTime = -1;
    const pos = `${Math.floor(this.startHour / 4)}:${this.startHour % 4}:0`;
    Tone.getTransport().start("+0.05", pos);
  }

  private onBeatTick(time: number): void {
    const day = this.day;
    if (!day) return;
    if (time - this.lastBeatTime < 0.3) return;
    this.lastBeatTime = time;

    const transport = Tone.getTransport();
    const ticks = transport.getTicksAtTime(time);
    const hour = Math.round(ticks / transport.PPQ) % 24;
    const bar = Math.floor(hour / 4);
    const beatInBar = hour % 4;

    const reading = day[hour];
    // Negative PM2.5 is instrument noise, clamped to 0 (§4.1 audit).
    const pm25 = reading.pm25 == null ? null : Math.max(0, reading.pm25);
    const pm25n = normalize(pm25, this.anchors.pm25);
    const o3n = normalize(reading.o3, this.anchors.o3);
    const no2n = normalize(reading.no2, this.anchors.no2);

    // MAPPING (PM2.5 → AQI tier → scale ladder, §3.2/§3.4): smoothed hourly AQI selects the scale for every voice.
    const smoothed = this.smoother.update(pm25ToAQI(pm25));
    if (smoothed != null) this.curTier = tierIndexOf(smoothed);
    const tier = TIERS[this.curTier];

    // MAPPING (PM2.5 → FM harmonicity/modulationIndex by tier, §3.5): timbral degradation at the oscillator. Melody and bed take the tier table; pulse keeps fixed harmonicity and full index; bass harmonicity rises only 1 (Easy) → 2 (Suffocating), linear, at 0.5× index — it stays a sub. MAPPING (NO2 → modulation depth, §3.6): pulse and bass index raised up to +50% at normalized NO2 = 1 — combustion grit. All ramped over one beat, never jumped.
    const no2Boost = 1 + 0.5 * Math.min(1, no2n ?? 0);
    for (const v of [this.melody, ...this.bedVoices]) {
      v.harmonicity.rampTo(tier.harmonicity, BEAT_S, time);
      v.modulationIndex.rampTo(tier.modulationIndex, BEAT_S, time);
    }
    this.pulse.modulationIndex.rampTo(tier.modulationIndex * no2Boost, BEAT_S, time);
    this.bass.harmonicity.rampTo(1 + this.curTier * 0.25, BEAT_S, time);
    this.bass.modulationIndex.rampTo(0.5 * tier.modulationIndex * no2Boost, BEAT_S, time);

    // Effects follow the current hour; a null hour holds the previous value (no data, no movement — §4.4).
    if (o3n != null) this.filter.frequency.rampTo(2500 + 9500 * Math.min(1, o3n), BEAT_S, time);
    if (pm25n != null) {
      const wet = Math.min(0.9, 0.15 + 0.6 * pm25n);
      const x = Math.min(1, pm25n); // 0 → all short reverb (1.5 s), 1 → all long (7.5 s): the decay rule as a crossfade
      this.dryGain.gain.rampTo(1 - wet, BEAT_S, time);
      this.revShortGain.gain.rampTo(wet * (1 - x), BEAT_S, time);
      this.revLongGain.gain.rampTo(wet * x, BEAT_S, time);
    }

    // Bed (§3.8): one chord per bar, the bed cycling with the day. From Ragged up, the progression advances on beats 1 and 3 — harmonic rhythm doubles, acceleration without a tempo change (§3.9).
    const bedLen = this.bedDegrees.length;
    const fastBed = this.curTier >= 3;
    let chordIdx: number | null = null;
    if (beatInBar === 0) chordIdx = bar % bedLen;
    else if (beatInBar === 2 && fastBed) chordIdx = (bar + 1) % bedLen;
    if (chordIdx != null) {
      const notes = chordMidi(this.bedDegrees[chordIdx], tier.semis, CHORD_ROOT_MIDI);
      this.curChordRootMidi = notes[0];
      const dur = fastBed ? "2n" : "1m";
      this.bedVoices.forEach((v, i) => v.triggerAttackRelease(midiToFreq(notes[i]), dur, time));
    }

    // Bass: the bed's chord root two octaves below on beat 1; again on beat 3 when the bar's k ≥ 8. NO2 drives its density and modulation depth, not its pitch — the bass agrees with the composed identity (D-16 discussion; beat-1 belongs to the bed). A whole-bar-null NO2 drops the beat-3 hit but keeps beat 1.
    this.curBarK = this.bars[bar]?.k ?? null;
    if (beatInBar === 0 || (beatInBar === 2 && this.curBarK != null && this.curBarK >= 8)) {
      this.bass.triggerAttackRelease(midiToFreq(this.curChordRootMidi - 24), "2n", time);
    }

    // Melody (§3.2): one note per beat from O3; null hour = rest, never interpolated (§4.4). Note length by tier (§3.9).
    if (o3n != null) {
      // MAPPING (PM2.5 → Brownian detune, §3.6): per-note cents from N(0, σ), σ = 40·min(pm25n, 1.5). Clean days are in tune; June 7 (σ = 60) is out of tune. Particulate jitter on the line.
      const sigma = 40 * Math.min(1.5, pm25n ?? 0);
      this.melody.detune.setValueAtTime(sigma * randNormal(), time);
      this.melody.triggerAttackRelease(midiToFreq(melodyMidi(o3n, tier.semis, MELODY_ROOT_MIDI)), tier.melodyNoteLength, time);
    }

    this.beatCallback?.({
      hour,
      tierIndex: this.curTier,
      scaleName: tier.scaleName,
      k: this.curBarK,
      borrowed: {
        pm25: reading.source.pm25 === "citywide",
        o3: reading.source.o3 === "citywide",
        no2: reading.source.no2 === "citywide",
      },
      smoothedAQI: smoothed,
      pm25: reading.pm25,
      o3: reading.o3,
      no2: reading.no2,
    });
  }

  // Pulse (§3.2): FM percussive hit on each Euclidean step, pitched at the current chord root +1 octave so it always agrees with the bed. k = null (whole bar of missing NO2) = silence (§4.4).
  private onStep16(time: number): void {
    if (!this.day) return;
    if (time - this.lastStepTime < 0.08) return;
    this.lastStepTime = time;

    const transport = Tone.getTransport();
    const ticks = transport.getTicksAtTime(time);
    const step = Math.round(ticks / (transport.PPQ / 4)) % 16;
    const bar = Math.floor(Math.round(ticks / transport.PPQ) / 4) % 6;
    const barState = this.bars[bar];
    if (!barState || barState.k == null) return;
    if (euclidHit(step, barState.k, 16, barState.rotation)) {
      // Pitch envelope (locked V3): start an octave above the target and fall to it over the first 30 ms — percussive snap rather than pitch.
      const f = midiToFreq(this.curChordRootMidi + 12);
      this.pulse.triggerAttackRelease(f * 2, "32n", time);
      this.pulse.frequency.exponentialRampToValueAtTime(f, time + 0.03);
    }
  }
}

// Box-Muller standard normal, for Brownian detune draws.
function randNormal(): number {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
