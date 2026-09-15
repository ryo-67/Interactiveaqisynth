// useListenSession — the Listen page's state, shared by the typographic page (App) and the scene (ScenePage) so the two never drift: one data load, one engine, one beat report, one play toggle. Extracted from App.tsx unchanged in behavior.
import { hourOfTs } from "../utils/time";
import { useCallback, useEffect, useRef, useState } from "react";
import { SynthEngine, type BeatInfo, type Day, type HourReading } from "../engine/SynthEngine";
import { motion } from "../utils/theme";
import { normalize, pm25ToAQI, type PollutantAnchors } from "../engine/contour";
import { tierIndexOf } from "../engine/scales";
import { PHASE0_DAYS, QUEENS_2023_ANCHORS } from "../fixtures/phase0-days";
import { PINS } from "../content";
import { getCurrentAll, getAnchors, getDay, clientSeriesAQI, type Borough, type CurrentSnapshot, type DaySeries } from "../utils/nycOpenData";

// Dev-only fixture select (?dev=1): never renders for a visitor.
export const DEV = new URLSearchParams(window.location.search).has("dev");

export type Channel = "pm25" | "o3" | "no2";

export interface ListenSession {
  borough: Borough;
  setBorough: (b: Borough) => void;
  // A chosen day (YYYY-MM-DD) from the archive or the live-year route; null = live, the last 24 hours (§2.2 scrubbing).
  date: string | null;
  setDate: (d: string | null) => void;
  dayLoading: boolean;
  // ONE clock for everything that moves with the phrase: the beat's integer hour eased over one beat (§5.4), wrapping forward at the loop seam. The sun, the playhead and every graph track read this and nothing else.
  playheadHour: number; // eased transport position: an index into the day (fractional while running)
  playheadClock: number; // the same position as a clock hour, from the reading's timestamp: the sun and the stars read this
  // True after a pause or a seek: the phrase is held at playheadHour rather than at rest.
  paused: boolean;
  // Move the phrase to an hour (fractional), playing or not — the graph's scrub.
  seek: (hour: number) => void;
  snapshot: CurrentSnapshot | null;
  anchors: PollutantAnchors; // the engine's anchors (falls back to Queens 2023 until the borough's land)
  day: Day | null;
  live: boolean;
  playing: boolean;
  beat: BeatInfo | null;
  togglePlay: () => void;
  setVolume: (db: number) => void;
  displayAqi: number | null;
  latest: { reading: HourReading; index: number; hour: number } | null; // latest non-null hour of the loaded day: its index and its clock hour
  rest: { reading: HourReading; index: number; hour: number } | null; // the hour the page reads at rest: the paused or seeked hour if the day has it, else latest
  moodTier: number;
  moodHour: number;
  // The AQI the mood word describes: the smoothed AQI the tier is computed from while playing, the latest hour's AQI at rest.
  moodAqi: number | null;
  dominant: Channel | null;
  // Normalized channels for whatever the page is showing right now: the beat while playing, the latest hour at rest. The scene reads its sky from these.
  channels: { pm25: number | null; o3: number | null; no2: number | null };
  devDayKey: string;
  setDevDayKey: (k: string) => void;
}

export function useListenSession(): ListenSession {
  const [borough, setBorough] = useState<Borough>("Citywide");
  const [snapshot, setSnapshot] = useState<CurrentSnapshot | null>(null);
  const [anchors, setAnchors] = useState<PollutantAnchors | null>(null);
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState<BeatInfo | null>(null);
  const [devDayKey, setDevDayKey] = useState<string>("live");
  const [date, setDateState] = useState<string | null>(null);
  const [chosen, setChosen] = useState<DaySeries | null>(null);
  const [dayLoading, setDayLoading] = useState(false);

  const engineRef = useRef<SynthEngine | null>(null);
  if (engineRef.current === null) engineRef.current = new SynthEngine(QUEENS_2023_ANCHORS);
  const prevBoroughRef = useRef<Borough>(borough);
  const prevDateRef = useRef<string | null>(null);

  // First paint loads only the last 24 hours (UX-01); the page renders immediately and fills when it lands.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [snap, a] = await Promise.all([getCurrentAll(), getAnchors("Citywide")]);
        if (cancelled) return;
        setSnapshot(snap);
        setAnchors(a);
      } catch (err) {
        console.warn("[App] Live fetch failed:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // A chosen day loads on demand, for this borough; nothing is fetched until asked (BUG-20).
  useEffect(() => {
    if (!date) { setChosen(null); return; }
    let cancelled = false;
    setDayLoading(true);
    (async () => {
      try {
        const s = await getDay(borough, date);
        if (!cancelled) setChosen(s);
      } catch (err) {
        console.warn("[App] Day fetch failed:", err);
        if (!cancelled) setChosen({ hours: [], aqi: { daily: null, hourlyMax: null, latestHour: null }, fallback: null, fetchedAt: null });
      } finally {
        if (!cancelled) setDayLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [date, borough]);

  const setDate = useCallback((d: string | null) => setDateState(d), []);

  // Warm the archive year the pins live in once the page is idle, so the first pin does not wait on a fetch (the year file is cached per borough after that).
  useEffect(() => {
    const id = window.setTimeout(() => { void getDay(borough, PINS[0].date).catch(() => undefined); }, 1500);
    return () => window.clearTimeout(id);
  }, [borough]);

  const devFixture = DEV && devDayKey !== "live" ? PHASE0_DAYS.find((d) => d.key === devDayKey) : undefined;
  const day: Day | null = devFixture ? devFixture.day : date ? (chosen?.hours ?? null) : (snapshot?.series[borough].hours ?? null);
  const live = !devFixture && !date;

  // Feed the engine. A borough switch keeps the phrase position (§2.1: same hour, different air); a dev fixture switch restarts.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !day) return;
    (async () => {
      if (devFixture) {
        engine.setDay(devFixture.day, QUEENS_2023_ANCHORS);
        return;
      }
      const a = await getAnchors(borough);
      // Any switch — borough or day — keeps the phrase position: the music does not stop, the next beat reads the new air (§2.1, §2.2).
      prevBoroughRef.current = borough;
      prevDateRef.current = date;
      engine.setDay(day, a, { keepPosition: true });
      setAnchors(a);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, borough, devDayKey, date]);

  // Pause, not stop: the transport holds its position, so play resumes from it. The paused HOUR is remembered separately from the beat report, because the report describes the day that was playing — when the day changes while paused, the report is stale and is cleared, and the page reads the NEW day at the paused hour, so the sky eases to the new data in place instead of freezing on the old.
  const [pausedHour, setPausedHour] = useState<number | null>(null);
  useEffect(() => {
    if (!playing) setPausedHour((h) => beat?.hour ?? h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);
  useEffect(() => {
    if (!playing) setBeat(null); // a new day while paused or at rest: the last report described the old one
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  const beatAtRef = useRef(0);
  useEffect(() => {
    engineRef.current?.onBeat((info) => { beatAtRef.current = performance.now(); setBeat(info); });
    return () => engineRef.current?.onBeat(null);
  }, []);

  // A seek moves the clock immediately; the next beat report (which arrives after it) takes over again.
  const [seekAt, setSeekAt] = useState<{ hour: number; t: number } | null>(null);
  const seek = useCallback((hour: number) => {
    engineRef.current?.seek(hour);
    setSeekAt({ hour, t: performance.now() });
    setPausedHour(Math.floor(hour)); // at rest, the page reads the day at the seeked hour
  }, []);



  // Play/pause: the sky, the transport button, and Space. The engine is told inside the gesture's own call stack — Tone.start() needs the gesture, and a pause that waited for a render and an effect landed a frame late, which the ear reads as a trailing tail. React state follows.
  const playingRef = useRef(false);
  const togglePlay = useCallback(() => {
    const next = !playingRef.current;
    playingRef.current = next;
    const engine = engineRef.current;
    if (next) void engine?.play(); // play() begins with init(), so Tone.start() runs here, in the gesture
    else engine?.pause();
    setPlaying(next);
  }, []);

  const setVolume = useCallback((db: number) => engineRef.current?.setVolume(db), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if (e.code === "Space" && !(t instanceof HTMLSelectElement) && !(t instanceof HTMLInputElement) && !(t instanceof HTMLButtonElement)) {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay]);

  // ——— Derived display state ———
  const series = devFixture ? null : date ? chosen : (snapshot?.series[borough] ?? null);
  const displayAqi = devFixture
    ? (day ? clientSeriesAQI(day).daily : null) // archive semantics for fixture days
    : date
      ? (series?.aqi.daily ?? null) // a chosen day shows its daily AQI (§4: daily from EPA where present, else the 24-h mean)
      : (series?.aqi.latestHour ?? null);

  // Latest non-null hour of the loaded day — the resting state before playback.
  const latest = (() => {
    if (!day) return null;
    for (let i = day.length - 1; i >= 0; i--) {
      if (day[i].pm25 != null || day[i].o3 != null || day[i].no2 != null) return { reading: day[i], index: i, hour: hourOfTs(day[i].ts) };
    }
    return null;
  })();

  // At rest the page reads one hour of the loaded day: the paused or seeked hour if there is one and the day has it, else the latest reporting hour.
  const rest = pausedHour != null && day && day[pausedHour] ? { reading: day[pausedHour], index: pausedHour, hour: hourOfTs(day[pausedHour].ts) } : latest;
  // Index → clock hour of that reading; identity on an archive day, the window's own hours on the live path. Fractions carry across so the eased position stays smooth.
  const clockOf = (i: number): number => {
    if (!day || day.length === 0) return i;
    const k = Math.min(day.length - 1, Math.max(0, Math.floor(i)));
    return hourOfTs(day[k].ts) + (i - Math.floor(i));
  };

  // Mood inputs: the beat report while playing (it describes what you are hearing); the rest hour otherwise.
  const a = anchors ?? QUEENS_2023_ANCHORS;
  const moodTier = beat
    ? beat.tierIndex
    : rest?.reading.pm25 != null
      ? tierIndexOf(pm25ToAQI(Math.max(0, rest.reading.pm25))!)
      : 0;
  const moodHour = beat ? clockOf(beat.hour) : (rest?.hour ?? 0);
  const moodAqi = beat
    ? beat.smoothedAQI
    : rest?.reading.pm25 != null
      ? pm25ToAQI(Math.max(0, rest.reading.pm25))
      : null;
  const clockTarget = seekAt && seekAt.t > beatAtRef.current ? seekAt.hour : beat ? beat.hour : (rest?.index ?? 12);
  const playheadHour = useEasedHour(clockTarget, playing);
  // The clock glides where the index cannot: a day switch keeps the transport position but the same index is a different time of day on the new day (live index 23 is 1 pm; an archive day's is 11 pm), and the sun must not jump between them.
  const playheadClock = useGlidingClock(clockOf(playheadHour));
  const paused = !playing && (pausedHour != null || seekAt != null);
  const channels = beat
    ? { pm25: beat.pm25n, o3: beat.o3n, no2: beat.no2n }
    : rest
      ? {
          pm25: normalize(rest.reading.pm25 == null ? null : Math.max(0, rest.reading.pm25), a.pm25),
          o3: normalize(rest.reading.o3, a.o3),
          no2: normalize(rest.reading.no2, a.no2),
        }
      : { pm25: null, o3: null, no2: null };
  const dominant = (() => {
    let best: Channel | null = null;
    for (const ch of ["pm25", "o3", "no2"] as const) {
      const v = channels[ch];
      if (v != null && (best === null || v > (channels[best] ?? -1))) best = ch;
    }
    return best;
  })();

  return {
    borough, setBorough, date, setDate, dayLoading, playheadHour, playheadClock, paused, seek,
    snapshot, anchors: a, day, live, playing, beat, togglePlay, setVolume,
    displayAqi, latest, rest, moodTier, moodHour, moodAqi, dominant, channels, devDayKey, setDevDayKey,
  };
}

// The beat report says hour h has just STARTED. The clock therefore runs from h toward h+1 over the beat, so the playhead crosses each column in time with the sound and the sun glides continuously; the next report lands as it reaches h+1, and any drift between the audio clock and the frame clock is corrected there. (Easing from the previous hour TO h made the playhead arrive a full beat late, so pulse hits flashed a column ahead of the line.) Across the loop seam it runs 23 → 24 (= 0), never backward. Under reduced motion it still moves, because it is the playhead.
// Follows a clock-hour target exactly while it moves continuously (playback: a fraction of an hour per frame) and, when it jumps (a day switch, a seek), runs FORWARD to it at CLOCK_GLIDE_S_PER_HOUR seconds per hour of clock (floor one beat), ease-in-out. Forward only, never the shortest way: facing south the sun rises on the left and sets on the right, and time in this piece does not run backwards — 11 pm to 1 pm passes through a sunrise, 1 pm to 11 pm through a sunset. A rate rather than a fixed duration, because a sunset spans about forty minutes of clock: at ten hours per second it was a thirty-millisecond flash; at this rate it is a visible moment. A moving target during the glide (playing) is re-read each frame, so the glide still lands on it.
const CLOCK_GLIDE_S_PER_HOUR = 0.15; // 10 h → 1.5 s, a full day → 3.6 s
function useGlidingClock(target: number): number {
  const [value, setValue] = useState(target);
  const valueRef = useRef(target);
  const targetRef = useRef(target);
  targetRef.current = target;
  const glideRef = useRef<{ from: number; start: number; ms: number; target: number } | null>(null);
  useEffect(() => {
    const forward = (from: number, to: number) => ((to - from) % 24 + 24) % 24;
    const near = (from: number, to: number) => { const d = forward(from, to); return d < 0.25 || d > 23.75; };
    if (!glideRef.current && near(valueRef.current, target)) { valueRef.current = target; setValue(target); return; }
    // A target that moves a little during a glide (playback: a fraction of an hour per frame) is absorbed; one that jumps again (a second day switch before the first glide has landed) restarts the glide from where the clock is now, with its own duration — reusing the old glide's clock would cram the new distance into whatever time the old one had left.
    if (glideRef.current && !near(glideRef.current.target, target)) glideRef.current = null;
    if (!glideRef.current) {
      const hours = forward(valueRef.current, target);
      glideRef.current = { from: valueRef.current, start: performance.now(), ms: Math.max(motion.beatMs, hours * CLOCK_GLIDE_S_PER_HOUR * 1000), target };
    }
    glideRef.current.target = target;
    let raf = 0;
    const tick = (now: number) => {
      const g = glideRef.current!;
      const t = Math.min(1, (now - g.start) / g.ms);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // ease-in-out: the day turns, it does not lurch
      const v = (g.from + forward(g.from, targetRef.current) * e) % 24;
      valueRef.current = v;
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(tick);
      else { glideRef.current = null; valueRef.current = targetRef.current; setValue(targetRef.current); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return value;
}

function useEasedHour(target: number, running: boolean): number {
  const [value, setValue] = useState(target);
  const heldRef = useRef(target);
  useEffect(() => {
    if (!running) {
      // At rest or paused: glide to the target over half a beat rather than jump, so a day switch moves the sun instead of cutting it. A seek lands the same way.
      const from = heldRef.current;
      let to = target % 24;
      if (Math.abs(to - from) > 12) to += to < from ? 24 : -24; // shortest way round the day
      const start = performance.now();
      let raf = 0;
      const tick = (now: number) => {
        const t = Math.min(1, Math.max(0, (now - start) / (motion.beatMs * 0.5))); // a frame's timestamp can precede the performance.now() that started it by a few ms; never run backwards
        const e = 1 - Math.pow(1 - t, 3);
        const v = ((from + (to - from) * e) % 24 + 24) % 24;
        heldRef.current = v;
        setValue(v);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / motion.beatMs)); // same clamp: an early frame timestamp made hour 0 read −0.004 for a frame
      heldRef.current = (target + t) % 24;
      setValue(heldRef.current);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    heldRef.current = target % 24;
    setValue(target % 24);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, running]);
  return value;
}
