import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as Tone from 'tone';
import { AQIDataPoint, getMusicMapping, getEffectProse, getAQIColor } from '../utils/mockData';
import { useTheme, themeColors } from '../utils/theme';

interface SynthEngineProps {
  aqi: number;
  isPlaying: boolean;
  isTimelapse: boolean;
  pollutantData: Pick<AQIDataPoint, 'pm25' | 'pm10' | 'o3' | 'no2'>;
  volume: number;
  onVolumeChange: (v: number) => void;
}

// ——— Scales ———
const SCALES: Record<string, number[]> = {
  majorPentatonic: [0, 2, 4, 7, 9],
  wholeTone: [0, 2, 4, 6, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

function getScaleForAQI(aqi: number): number[] {
  if (aqi <= 35) return SCALES.majorPentatonic;
  if (aqi <= 65) return SCALES.wholeTone;
  if (aqi <= 100) return SCALES.dorian;
  if (aqi <= 150) return SCALES.phrygian;
  return SCALES.chromatic;
}

function scaleToNotes(scale: number[], baseOctave: number, numOctaves: number): string[] {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const notes: string[] = [];
  for (let oct = baseOctave; oct < baseOctave + numOctaves; oct++) {
    for (const degree of scale) notes.push(`${noteNames[degree]}${oct}`);
  }
  return notes;
}

function getScaleNoteNames(aqi: number): string[] {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return getScaleForAQI(aqi).map(d => noteNames[d]);
}

function nextMelodicNote(currentIdx: number, scaleLen: number, tension: number): number {
  const weights: number[] = [];
  for (let i = 0; i < scaleLen; i++) {
    const dist = Math.abs(i - currentIdx);
    if (dist === 0) weights.push(0.05);
    else if (dist === 1) weights.push(1.2 - tension * 0.4);
    else if (dist === 2) weights.push(0.7 - tension * 0.2);
    else if (dist <= 4) weights.push(0.15 + tension * 0.5);
    else weights.push(0.03 + tension * 0.35);
  }
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) return i; }
  return currentIdx;
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

// ——— Texture control definitions ———
interface TextureControl {
  key: string;
  name: string;
  description: string;
  labelLow: string;
  labelHigh: string;
}

const TEXTURE_CONTROLS: TextureControl[] = [
  {
    key: 'atmosphere',
    name: 'Atmosphere',
    description: 'How thick the air hangs around each note \u2014 PM2.5 as reverb fog',
    labelLow: 'Crystal',
    labelHigh: 'Smog',
  },
  {
    key: 'visibility',
    name: 'Visibility',
    description: 'How far sound travels before the haze swallows it \u2014 ozone as filter',
    labelLow: 'Clear',
    labelHigh: 'Veiled',
  },
  {
    key: 'friction',
    name: 'Urban Friction',
    description: 'The grit of combustion in the city\u2019s voice \u2014 NO\u2082 as distortion',
    labelLow: 'Smooth',
    labelHigh: 'Coarse',
  },
  {
    key: 'echo',
    name: 'Echo Decay',
    description: 'How long sounds linger between buildings \u2014 PM10 as delay trails',
    labelLow: 'Dry',
    labelHigh: 'Cavernous',
  },
];

// ——————————————————————————————————————
// Component
// ——————————————————————————————————————
export function SynthEngine({ aqi, isPlaying, isTimelapse, pollutantData, volume, onVolumeChange }: SynthEngineProps) {
  const theme = useTheme();
  const c = themeColors(theme);
  const isDark = theme === 'dark';
  const accentColor = getAQIColor(aqi);

  const padRef = useRef<Tone.PolySynth | null>(null);
  const melRef = useRef<Tone.PolySynth | null>(null);
  const bassRef = useRef<Tone.PolySynth | null>(null);
  const arpRef = useRef<Tone.PolySynth | null>(null);

  const reverbRef = useRef<Tone.Reverb | null>(null);
  const delayRef = useRef<Tone.FeedbackDelay | null>(null);
  const filterRef = useRef<Tone.Filter | null>(null);
  const distRef = useRef<Tone.Distortion | null>(null);
  const chorusRef = useRef<Tone.Chorus | null>(null);
  const masterRef = useRef<Tone.Volume | null>(null);
  const melFilterRef = useRef<Tone.Filter | null>(null);

  const loopRef = useRef<number>(0);

  const aqiRef = useRef(aqi);
  const pollRef = useRef(pollutantData);
  const [isMuted, setIsMuted] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  // Texture controls state
  const [textures, setTextures] = useState<Record<string, number>>({
    atmosphere: 0,
    visibility: 0,
    friction: 0,
    echo: 0,
  });
  const textureRef = useRef(textures);

  useEffect(() => { textureRef.current = textures; }, [textures]);
  useEffect(() => { aqiRef.current = aqi; pollRef.current = pollutantData; }, [aqi, pollutantData]);

  // Master volume
  useEffect(() => {
    if (masterRef.current) {
      const db = volume <= 0 ? -Infinity : -36 + volume * 36;
      masterRef.current.volume.rampTo(db, 0.1);
    }
  }, [volume]);

  // ——— Effects modulation with texture offsets ———
  useEffect(() => {
    if (!ready) return;
    const pm25n = Math.min(pollutantData.pm25 / 80, 1);
    const pm10n = Math.min(pollutantData.pm10 / 120, 1);
    const o3n = Math.min(pollutantData.o3 / 80, 1);
    const no2n = Math.min(pollutantData.no2 / 70, 1);
    const overall = (pm25n + pm10n + o3n + no2n) / 4;
    const r = isTimelapse ? 0.6 : 1.2;
    const t = textures;

    // PM2.5 → Reverb + atmosphere offset
    if (reverbRef.current) {
      const base = 0.22 + pm25n * 0.48;
      reverbRef.current.wet.rampTo(clamp(base + t.atmosphere * 0.35, 0, 0.95), r);
    }

    // PM10 → Delay + echo offset
    if (delayRef.current) {
      const baseWet = 0.12 + pm10n * 0.38;
      const baseFb = 0.2 + pm10n * 0.45;
      delayRef.current.wet.rampTo(clamp(baseWet + t.echo * 0.3, 0, 0.85), r);
      delayRef.current.feedback.rampTo(clamp(baseFb + t.echo * 0.25, 0, 0.8), r);
    }

    // O3 → Master Filter + visibility offset
    if (filterRef.current) {
      const base = 1200 + (1 - o3n) * 6800;
      filterRef.current.frequency.rampTo(clamp(base + t.visibility * 3500, 200, 14000), r);
    }

    // Melody Filter
    if (melFilterRef.current) melFilterRef.current.frequency.rampTo(2800 + overall * 5200, r);

    // NO2 → Distortion + friction offset
    if (distRef.current) {
      const baseDist = 0.01 + no2n * 0.55;
      const baseWet = no2n * 0.45;
      distRef.current.distortion = clamp(baseDist + t.friction * 0.35, 0, 0.95);
      distRef.current.wet.rampTo(clamp(baseWet + t.friction * 0.3, 0, 0.85), r);
    }

    // Chorus
    if (chorusRef.current) chorusRef.current.wet.rampTo(0.18 + overall * 0.35, r);
  }, [pollutantData, ready, isTimelapse, textures]);

  // ——— Tempo ———
  useEffect(() => {
    if (!ready || !isPlaying) return;
    const bpm = isTimelapse
      ? 100 + (aqi / 200) * 45
      : 72 + (aqi / 200) * 38;
    Tone.getTransport().bpm.value = bpm;
  }, [aqi, ready, isPlaying, isTimelapse]);

  // ——— Init audio engine ———
  useEffect(() => {
    const _origWarn = console.warn;
    console.warn = function (...args: any[]) {
      if (typeof args[0] === 'string' && (args[0].includes('scheduled callbacks') || args[0].includes('polyphony'))) return;
      _origWarn.apply(console, args);
    };

    const init = async () => {
      masterRef.current = new Tone.Volume(-6).toDestination();

      reverbRef.current = new Tone.Reverb({ decay: 5, wet: 0.25 }).connect(masterRef.current);
      await reverbRef.current.generate();

      chorusRef.current = new Tone.Chorus({ frequency: 0.35, delayTime: 12, depth: 0.6, wet: 0.2 })
        .connect(reverbRef.current);
      chorusRef.current.start();

      delayRef.current = new Tone.FeedbackDelay({ delayTime: '4n.', feedback: 0.25, wet: 0.15 })
        .connect(chorusRef.current);

      filterRef.current = new Tone.Filter({ type: 'lowpass', frequency: 8000, Q: 0.7 })
        .connect(delayRef.current);

      distRef.current = new Tone.Distortion({ distortion: 0.01, wet: 0.0 })
        .connect(filterRef.current);

      melFilterRef.current = new Tone.Filter({ type: 'lowpass', frequency: 3000, Q: 1.2 })
        .connect(delayRef.current);

      padRef.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'amsine4' as any },
        envelope: { attack: 1.8, decay: 1.0, sustain: 0.6, release: 2.0 },
        volume: -14,
      }).connect(distRef.current);
      (padRef.current as any).maxPolyphony = 24;

      melRef.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'fatsawtooth' as any, count: 3, spread: 20 },
        envelope: { attack: 0.06, decay: 0.4, sustain: 0.3, release: 0.6 },
        volume: -10,
      }).connect(melFilterRef.current);
      (melRef.current as any).maxPolyphony = 12;

      arpRef.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'fatsine3' as any, count: 2, spread: 10 },
        envelope: { attack: 0.01, decay: 0.15, sustain: 0.05, release: 0.3 },
        volume: -18,
      }).connect(distRef.current);
      (arpRef.current as any).maxPolyphony = 16;

      bassRef.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'fatsquare4' as any, count: 2, spread: 8 },
        envelope: { attack: 0.12, decay: 0.6, sustain: 0.4, release: 0.8 },
        volume: -16,
      }).connect(distRef.current);
      (bassRef.current as any).maxPolyphony = 6;

      setReady(true);
    };

    init();

    return () => {
      console.warn = _origWarn;
      Tone.getTransport().stop();
      Tone.getTransport().cancel();
      [padRef, melRef, arpRef, bassRef].forEach(s => {
        try { s.current?.releaseAll(); s.current?.dispose(); } catch {}
      });
      [reverbRef, delayRef, filterRef, distRef, chorusRef, melFilterRef, masterRef].forEach(n => {
        try { n.current?.dispose(); } catch {}
      });
    };
  }, []);

  // ——— AMBIENT loop ———
  const ambientCallback = useCallback((time: number, step: number) => {
    const currentAqi = aqiRef.current;
    const scale = getScaleForAQI(currentAqi);
    const tension = Math.min(currentAqi / 180, 1);

    const melNotes = scaleToNotes(scale, 4, 2);
    const padNotes = scaleToNotes(scale, 3, 2);
    const bassNotes = scaleToNotes(scale, 2, 1);
    const arpNotes = scaleToNotes(scale, 5, 1);
    const s = step % 32;

    const stutter = () => tension > 0.3 ? (Math.random() - 0.5) * tension * 0.04 : 0;
    const skip = Math.random() < tension * 0.06;

    const PROG = [0, 5, 3, 4, 0, 2, 5, 3];

    if (s % 8 === 0 && padRef.current) {
      padRef.current.releaseAll(time);
      const progIdx = Math.floor(step / 8) % PROG.length;
      const root = PROG[progIdx] % padNotes.length;
      const chord = [padNotes[root], padNotes[(root + 2) % padNotes.length], padNotes[(root + 4) % padNotes.length]];
      if (tension > 0.15) chord.push(padNotes[(root + 5) % padNotes.length]);
      if (tension > 0.6 && root + 6 < padNotes.length) chord.push(padNotes[(root + 6) % padNotes.length]);
      padRef.current.triggerAttackRelease(chord, '1m', time, 0.25 + tension * 0.15);
    }

    const melProb = 0.4 + tension * 0.25;
    if (!skip && Math.random() < melProb && melRef.current) {
      const idx = nextMelodicNote(step % melNotes.length, melNotes.length, tension);
      const durs = tension < 0.3
        ? ['4n', '4n.', '2n']
        : tension < 0.6 ? ['8n', '4n', '4n.'] : ['16n', '8n', '8n.'];
      const dur = durs[Math.floor(Math.random() * durs.length)];
      const vel = 0.25 + tension * 0.3 + Math.random() * 0.08;
      melRef.current.triggerAttackRelease(melNotes[idx], dur, time + stutter(), vel);
    }

    const arpProb = 0.15 + tension * 0.4;
    if (!skip && Math.random() < arpProb && arpRef.current) {
      const pattern = step % arpNotes.length;
      const dur = tension > 0.5 ? '16n' : '8n';
      arpRef.current.triggerAttackRelease(
        arpNotes[pattern], dur, time + stutter(), 0.12 + Math.random() * 0.08 + tension * 0.1
      );
    }

    if (s % 4 === 0 && bassRef.current && !skip) {
      bassRef.current.releaseAll(time);
      const progIdx = Math.floor(step / 8) % PROG.length;
      const root = PROG[progIdx] % bassNotes.length;
      bassRef.current.triggerAttackRelease(
        bassNotes[root], '4n.', time + stutter(), 0.3 + tension * 0.15
      );
    }
    if (s % 4 === 2 && tension > 0.2 && Math.random() < 0.4 + tension * 0.4 && bassRef.current) {
      const idx = Math.floor(Math.random() * bassNotes.length);
      bassRef.current.triggerAttackRelease(
        bassNotes[idx], tension > 0.5 ? '8n' : '4n', time + stutter(), 0.2 + tension * 0.1
      );
    }
  }, []);

  // ——— TIMELAPSE loop ———
  const timelapseCallback = useCallback((time: number, step: number) => {
    const currentAqi = aqiRef.current;
    const scale = getScaleForAQI(currentAqi);
    const tension = Math.min(currentAqi / 180, 1);

    const melNotes = scaleToNotes(scale, 4, 2);
    const arpNotes = scaleToNotes(scale, 4, 2);
    const padNotes = scaleToNotes(scale, 3, 2);
    const bassNotes = scaleToNotes(scale, 2, 1);
    const s = step % 16;

    const stutter = () => tension > 0.3 ? (Math.random() - 0.5) * tension * 0.035 : 0;
    const skip = Math.random() < tension * 0.05;

    if (s % 8 === 0 && padRef.current) {
      padRef.current.releaseAll(time);
      const root = Math.floor(step / 8) % padNotes.length;
      const chord = [padNotes[root], padNotes[(root + 2) % padNotes.length], padNotes[(root + 4) % padNotes.length]];
      if (tension > 0.4) chord.push(padNotes[(root + 5) % padNotes.length]);
      padRef.current.triggerAttackRelease(chord, '2n', time, 0.2 + tension * 0.15);
    }

    if (s % 2 === 0 && arpRef.current && !skip) {
      const len = Math.min(arpNotes.length, 5 + Math.floor(tension * 5));
      const cycle = Math.floor(step / len) % 2;
      const pos = cycle === 0 ? step % len : len - 1 - (step % len);
      arpRef.current.triggerAttackRelease(
        arpNotes[Math.abs(pos) % arpNotes.length],
        tension > 0.5 ? '16n' : '8n',
        time + stutter(),
        0.1 + (Math.abs(pos) / len) * 0.12 + tension * 0.06
      );
    }

    if (s % 3 === 0 && melRef.current && !skip) {
      const idx = nextMelodicNote(step % melNotes.length, melNotes.length, tension);
      melRef.current.triggerAttackRelease(
        melNotes[idx], tension > 0.5 ? '8n' : '4n',
        time + stutter(), 0.2 + tension * 0.2 + Math.random() * 0.08
      );
    }

    if (s % 4 === 0 && bassRef.current) {
      bassRef.current.releaseAll(time);
      bassRef.current.triggerAttackRelease(
        bassNotes[Math.floor(step / 4) % bassNotes.length],
        '4n', time + stutter(), 0.3 + tension * 0.12
      );
    }
  }, []);

  // ——— Start/stop ———
  useEffect(() => {
    if (!ready) return;

    if (!isPlaying || isMuted) {
      Tone.getTransport().stop();
      Tone.getTransport().cancel();
      [padRef, melRef, arpRef, bassRef].forEach(s => { try { s.current?.releaseAll(); } catch {} });
      return;
    }

    let stepCounter = 0;
    const startAudio = async () => {
      if (Tone.getContext().state !== 'running') await Tone.start();

      Tone.getTransport().stop();
      Tone.getTransport().cancel();
      Tone.getTransport().position = 0;

      const cb = isTimelapse ? timelapseCallback : ambientCallback;

      const id = Tone.getTransport().scheduleRepeat((time) => {
        cb(time, stepCounter);
        stepCounter++;
      }, '8n', 0);

      loopRef.current = id;

      const bpm = isTimelapse
        ? 100 + (aqiRef.current / 200) * 45
        : 72 + (aqiRef.current / 200) * 38;
      Tone.getTransport().bpm.value = bpm;
      Tone.getTransport().start('+0.15');
    };

    startAudio();

    return () => {
      Tone.getTransport().stop();
      Tone.getTransport().cancel();
    };
  }, [isPlaying, isMuted, ready, isTimelapse, ambientCallback, timelapseCallback]);

  // ——— Display ———
  const mapping = getMusicMapping(aqi, isTimelapse);
  const scaleNotes = getScaleNoteNames(aqi);
  const effectProse = getEffectProse(pollutantData);
  const moodKey = mapping.mood;

  const handleTextureChange = (key: string, value: number) => {
    setTextures(prev => ({ ...prev, [key]: value }));
  };

  const resetTextures = () => {
    setTextures({ atmosphere: 0, visibility: 0, friction: 0, echo: 0 });
  };

  const hasTextureOverrides = Object.values(textures).some(v => Math.abs(v) > 0.01);

  return (
    <div>
      {/* Mood word + mute button */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1">
          <div className="flex items-baseline gap-3 flex-wrap" style={{ minHeight: '44px' }}>
            <AnimatePresence mode="wait">
              <motion.span
                key={moodKey}
                initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontStyle: 'italic',
                  fontSize: 'clamp(28px, 4.5vw, 38px)',
                  fontWeight: 400,
                  color: accentColor,
                  lineHeight: 1.2,
                  display: 'inline-block',
                }}
              >
                {mapping.mood}
              </motion.span>
            </AnimatePresence>
            <span style={{
              fontSize: '13px',
              color: c.textMuted,
              fontFamily: 'Georgia, serif',
              fontStyle: 'italic',
            }}>
              {mapping.moodDescription}
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-2.5 rounded-full transition-all duration-300 shrink-0 mt-1"
          style={{ background: c.btnBg, border: `1px solid ${c.border}` }}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4" style={{ color: c.textMuted }} />
          ) : (
            <Volume2 className="w-4 h-4" style={{ color: c.textSecondary }} />
          )}
        </button>
      </div>

      {/* Feeling prose */}
      <p
        style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '15px',
          lineHeight: 1.85,
          color: c.textSecondary,
          maxWidth: '580px',
          marginBottom: '18px',
        }}
      >
        {mapping.feeling}
      </p>

      {/* Scale + BPM */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mb-4">
        <span style={{
          fontSize: '12px',
          color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          fontWeight: 500,
        }}>
          {mapping.scale}
        </span>
        <span style={{ color: c.textFaint, fontSize: '12px' }}>/</span>
        {scaleNotes.map((note, i) => (
          <span key={`${note}-${i}`} className="inline-flex items-center gap-x-2">
            <span style={{
              fontSize: '13px',
              color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.38)',
              fontFamily: 'Georgia, serif',
            }}>
              {note}
            </span>
            {i < scaleNotes.length - 1 && (
              <span style={{ color: c.textFaint, fontSize: '8px' }}>&middot;</span>
            )}
          </span>
        ))}
        <span style={{ color: c.textFaint, fontSize: '12px', marginLeft: '4px' }}>/</span>
        <span className="tabular-nums" style={{
          fontSize: '12px',
          color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.38)',
        }}>
          {mapping.bpm} bpm
        </span>
      </div>

      {/* Effect prose */}
      <p
        style={{
          fontSize: '12px',
          lineHeight: 1.75,
          color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.32)',
          fontStyle: 'italic',
          maxWidth: '540px',
          marginBottom: '18px',
        }}
      >
        {effectProse}
      </p>

      {/* Volume slider */}
      <div className="flex items-center gap-3 mb-2">
        <span style={{
          fontSize: '11px',
          color: c.textFaint,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          width: '40px',
          fontWeight: 500,
        }}>
          Vol
        </span>
        <div className="flex-1 relative h-6 flex items-center" style={{ maxWidth: '220px' }}>
          <div className="w-full h-1.5 rounded-full" style={{ background: c.sliderTrack }} />
          <div
            className="absolute left-0 h-1.5 rounded-full transition-all duration-150"
            style={{ width: `${volume * 100}%`, background: c.sliderFill, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={e => onVolumeChange(parseFloat(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
            style={{ margin: 0 }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full transition-all duration-150 pointer-events-none"
            style={{
              left: `calc(${volume * 100}% - 6px)`,
              background: c.sliderThumb,
              boxShadow: `0 0 8px ${c.sliderFill}`,
            }}
          />
        </div>
        <span className="tabular-nums" style={{ fontSize: '11px', color: c.textFaint, width: '32px', textAlign: 'right' }}>
          {Math.round(volume * 100)}%
        </span>
      </div>

      {/* ——— Texture Controls ——— */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span style={{
              fontSize: '11px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: hasTextureOverrides ? accentColor : c.textFaint,
              fontWeight: 500,
            }}>
              Texture Controls
            </span>
            {hasTextureOverrides && (
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: accentColor }}
              />
            )}
          </div>
          {hasTextureOverrides && (
            <button
              onClick={resetTextures}
              className="px-2.5 py-1 rounded-full transition-all duration-200"
              style={{
                fontSize: '9px',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: c.textMuted,
                background: c.bgSurface,
                border: `1px solid ${c.border}`,
              }}
            >
              Reset to data-driven
            </button>
          )}
        </div>

        <p style={{
          fontSize: '12px',
          color: c.textMuted,
          fontFamily: 'Georgia, serif',
          fontStyle: 'italic',
          lineHeight: 1.6,
          maxWidth: '480px',
          marginBottom: '16px',
        }}>
          Shape the sound beyond what the data dictates. Each slider offsets the pollutant-driven
          effect, letting you explore the sonic space between clean air and crisis.
        </p>

        <div className="space-y-4">
          {TEXTURE_CONTROLS.map(ctrl => {
            const value = textures[ctrl.key];
            const pm25n = Math.min(pollutantData.pm25 / 80, 1);
            const pm10n = Math.min(pollutantData.pm10 / 120, 1);
            const o3n = Math.min(pollutantData.o3 / 80, 1);
            const no2n = Math.min(pollutantData.no2 / 70, 1);

            let baseLevel = 0;
            if (ctrl.key === 'atmosphere') baseLevel = pm25n;
            else if (ctrl.key === 'visibility') baseLevel = o3n;
            else if (ctrl.key === 'friction') baseLevel = no2n;
            else if (ctrl.key === 'echo') baseLevel = pm10n;

            return (
              <div key={ctrl.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span style={{
                    fontSize: '12px',
                    color: c.textSecondary,
                    fontWeight: 500,
                    letterSpacing: '0.02em',
                  }}>
                    {ctrl.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span style={{
                      fontSize: '10px',
                      color: c.textFaint,
                      fontStyle: 'italic',
                    }}>
                      data: {Math.round(baseLevel * 100)}%
                    </span>
                    {Math.abs(value) > 0.01 && (
                      <span style={{
                        fontSize: '10px',
                        color: value > 0 ? accentColor : (isDark ? 'rgba(130,180,255,0.7)' : 'rgba(60,100,180,0.7)'),
                        fontWeight: 500,
                      }}>
                        {value > 0 ? '+' : ''}{Math.round(value * 100)}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Bipolar slider */}
                <div className="flex items-center gap-2">
                  <span style={{
                    fontSize: '9px',
                    color: c.textFaint,
                    width: '52px',
                    textAlign: 'right',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}>
                    {ctrl.labelLow}
                  </span>
                  <div className="flex-1 relative h-6 flex items-center">
                    <div className="w-full h-1.5 rounded-full" style={{ background: c.sliderTrack }} />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-px h-3"
                      style={{
                        left: '50%',
                        background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
                      }}
                    />
                    <div
                      className="absolute h-1.5 rounded-full transition-all duration-100"
                      style={{
                        left: value >= 0 ? '50%' : `${50 + value * 50}%`,
                        width: `${Math.abs(value) * 50}%`,
                        background: value >= 0
                          ? `${accentColor}88`
                          : (isDark ? 'rgba(130,180,255,0.4)' : 'rgba(60,100,180,0.4)'),
                        top: '50%',
                        transform: 'translateY(-50%)',
                      }}
                    />
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.02"
                      value={value}
                      onChange={e => handleTextureChange(ctrl.key, parseFloat(e.target.value))}
                      className="absolute inset-0 w-full opacity-0 cursor-pointer"
                      style={{ margin: 0 }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full transition-all duration-100 pointer-events-none"
                      style={{
                        left: `calc(${(value + 1) * 50}% - 6px)`,
                        background: Math.abs(value) > 0.01 ? accentColor : c.sliderThumb,
                        boxShadow: Math.abs(value) > 0.01 ? `0 0 8px ${accentColor}55` : 'none',
                      }}
                    />
                  </div>
                  <span style={{
                    fontSize: '9px',
                    color: c.textFaint,
                    width: '52px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}>
                    {ctrl.labelHigh}
                  </span>
                </div>

                {/* Description */}
                <p style={{
                  fontSize: '11px',
                  color: c.textFaint,
                  fontStyle: 'italic',
                  paddingLeft: '54px',
                  lineHeight: 1.4,
                }}>
                  {ctrl.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}