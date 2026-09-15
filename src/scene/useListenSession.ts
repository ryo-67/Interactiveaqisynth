// useListenSession — the Listen page's state, shared by the typographic page (App) and the scene (ScenePage) so the two never drift: one data load, one engine, one beat report, one play toggle. Extracted from App.tsx unchanged in behavior.
import { useCallback, useEffect, useRef, useState } from "react";
import { SynthEngine, type BeatInfo, type Day, type HourReading } from "../engine/SynthEngine";
import { motion } from "../utils/theme";
import { normalize, pm25ToAQI, type PollutantAnchors } from "../engine/contour";
import { tierIndexOf } from "../engine/scales";
import { PHASE0_DAYS, QUEENS_2023_ANCHORS } from "../fixtures/phase0-days";
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
  playheadHour: number;
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
  latest: { reading: HourReading; hour: number } | null; // latest non-null hour: the resting state before playback
  moodTier: number;
  moodHour: number;
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

  // Pause, not stop: the transport holds its position and the last beat report stays, so the page shows where it paused and play resumes from there.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (playing) void engine.play();
    else engine.pause();
  }, [playing]);

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
  }, []);



  // Play/pause: the score click, the transport, and Space. Tone.start() must begin inside the gesture's call stack.
  const togglePlay = useCallback(() => {
    void engineRef.current?.init();
    setPlaying((p) => !p);
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
      if (day[i].pm25 != null || day[i].o3 != null || day[i].no2 != null) return { reading: day[i], hour: Number(day[i].ts.slice(11, 13)) };
    }
    return null;
  })();

  // Mood inputs: the beat report while playing (it describes what you are hearing); the latest hour at rest.
  const a = anchors ?? QUEENS_2023_ANCHORS;
  const moodTier = beat
    ? beat.tierIndex
    : latest?.reading.pm25 != null
      ? tierIndexOf(pm25ToAQI(Math.max(0, latest.reading.pm25))!)
      : 0;
  const moodHour = beat ? beat.hour : (latest?.hour ?? 0);
  const clockTarget = seekAt && seekAt.t > beatAtRef.current ? seekAt.hour : beat ? beat.hour : (latest?.hour ?? 12);
  const playheadHour = useEasedHour(clockTarget, playing);
  const paused = !playing && (beat != null || seekAt != null);
  const channels = beat
    ? { pm25: beat.pm25n, o3: beat.o3n, no2: beat.no2n }
    : latest
      ? {
          pm25: normalize(latest.reading.pm25 == null ? null : Math.max(0, latest.reading.pm25), a.pm25),
          o3: normalize(latest.reading.o3, a.o3),
          no2: normalize(latest.reading.no2, a.no2),
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
    borough, setBorough, date, setDate, dayLoading, playheadHour, paused, seek,
    snapshot, anchors: a, day, live, playing, beat, togglePlay, setVolume,
    displayAqi, latest, moodTier, moodHour, dominant, channels, devDayKey, setDevDayKey,
  };
}

// The beat report says hour h has just STARTED. The clock therefore runs from h toward h+1 over the beat, so the playhead crosses each column in time with the sound and the sun glides continuously; the next report lands as it reaches h+1, and any drift between the audio clock and the frame clock is corrected there. (Easing from the previous hour TO h made the playhead arrive a full beat late, so pulse hits flashed a column ahead of the line.) Across the loop seam it runs 23 → 24 (= 0), never backward. Under reduced motion it still moves, because it is the playhead.
function useEasedHour(target: number, running: boolean): number {
  const [value, setValue] = useState(target);
  useEffect(() => {
    if (!running) { setValue(target % 24); return; } // paused: hold (a seek jumps it); a fresh play resumes the run from the next beat report
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / motion.beatMs);
      setValue((target + t) % 24);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    setValue(target % 24);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, running]);
  return value;
}
