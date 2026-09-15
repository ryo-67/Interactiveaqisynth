// useListenSession — the Listen page's state, shared by the typographic page (App) and the scene (ScenePage) so the two never drift: one data load, one engine, one beat report, one play toggle. Extracted from App.tsx unchanged in behavior.
import { useCallback, useEffect, useRef, useState } from "react";
import { SynthEngine, type BeatInfo, type Day, type HourReading } from "../engine/SynthEngine";
import { normalize, pm25ToAQI, type PollutantAnchors } from "../engine/contour";
import { tierIndexOf } from "../engine/scales";
import { PHASE0_DAYS, QUEENS_2023_ANCHORS } from "../fixtures/phase0-days";
import { getCurrentAll, getAnchors, clientSeriesAQI, type Borough, type CurrentSnapshot } from "../utils/nycOpenData";

// Dev-only fixture select (?dev=1): never renders for a visitor.
export const DEV = new URLSearchParams(window.location.search).has("dev");

export type Channel = "pm25" | "o3" | "no2";

export interface ListenSession {
  borough: Borough;
  setBorough: (b: Borough) => void;
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

  const engineRef = useRef<SynthEngine | null>(null);
  if (engineRef.current === null) engineRef.current = new SynthEngine(QUEENS_2023_ANCHORS);
  const prevBoroughRef = useRef<Borough>(borough);

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

  const devFixture = DEV && devDayKey !== "live" ? PHASE0_DAYS.find((d) => d.key === devDayKey) : undefined;
  const day: Day | null = devFixture ? devFixture.day : (snapshot?.series[borough].hours ?? null);
  const live = !devFixture;

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
      const keepPosition = prevBoroughRef.current !== borough;
      prevBoroughRef.current = borough;
      engine.setDay(day, a, { keepPosition });
      setAnchors(a);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, borough, devDayKey]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (playing) void engine.play();
    else {
      engine.stop();
      setBeat(null);
    }
  }, [playing]);

  useEffect(() => {
    engineRef.current?.onBeat(setBeat);
    return () => engineRef.current?.onBeat(null);
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
  const series = devFixture ? null : (snapshot?.series[borough] ?? null);
  const displayAqi = devFixture
    ? (day ? clientSeriesAQI(day).daily : null) // archive semantics for fixture days
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
    borough, setBorough, snapshot, anchors: a, day, live, playing, beat, togglePlay, setVolume,
    displayAqi, latest, moodTier, moodHour, dominant, channels, devDayKey, setDevDayKey,
  };
}
