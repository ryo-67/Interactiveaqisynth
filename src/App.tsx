// App — orchestrator for the Listen page (sprint 3a, STRATEGY §5). One column, no dashboard chrome: controls are words, the score is the picture. State: borough, day, playing, and the engine's beat report. The timeline (3b) and footer lines one–two (3c) land in the reserved space below the score.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { BoroughToggle } from "./components/BoroughToggle";
import { AQINumber } from "./components/AQINumber";
import { MoodLine } from "./components/MoodLine";
import { Score } from "./components/Score";
import { SourceLine } from "./components/SourceLine";
import { SynthEngine, type BeatInfo, type Day } from "./engine/SynthEngine";
import { normalize, pm25ToAQI, type PollutantAnchors } from "./engine/contour";
import { tierIndexOf } from "./engine/scales";
import { PHASE0_DAYS, QUEENS_2023_ANCHORS } from "./fixtures/phase0-days";
import {
  getCurrentAll,
  getAnchors,
  clientSeriesAQI,
  type Borough,
  type CurrentSnapshot,
} from "./utils/nycOpenData";
import { ThemeContext, themeColors, space, type Theme } from "./utils/theme";
import { STATUS_LIVE, STATUS_ARCHIVE } from "./content";

// Dev-only fixture select (?dev=1): never renders for a visitor.
const DEV = new URLSearchParams(window.location.search).has("dev");

export default function App() {
  const [theme] = useState<Theme>("dark"); // dark is the default; light stays reachable through tokens (DSN-06 is Phase 2)
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

  // Play/pause: the score click and Space. Tone.start() must begin inside the gesture's call stack.
  const togglePlay = useCallback(() => {
    void engineRef.current?.init();
    setPlaying((p) => !p);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && !(e.target instanceof HTMLSelectElement)) {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay]);

  // ——— Derived display state ———
  const c = themeColors(theme);
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
  const dominant = (() => {
    const vals = beat
      ? { pm25: beat.pm25n, o3: beat.o3n, no2: beat.no2n }
      : latest
        ? {
            pm25: normalize(latest.reading.pm25 == null ? null : Math.max(0, latest.reading.pm25), a.pm25),
            o3: normalize(latest.reading.o3, a.o3),
            no2: normalize(latest.reading.no2, a.no2),
          }
        : { pm25: null, o3: null, no2: null };
    let best: "pm25" | "o3" | "no2" | null = null;
    for (const ch of ["pm25", "o3", "no2"] as const) {
      const v = vals[ch];
      if (v != null && (best === null || v > (vals[best] ?? -1))) best = ch;
    }
    return best;
  })();

  const lastTs = day?.[day.length - 1]?.ts ?? null;
  const dateLabel = lastTs
    ? new Date(lastTs).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "—";
  const hourLabel = lastTs ? lastTs.slice(11, 16) : "—";

  return (
    <ThemeContext.Provider value={theme}>
      <div style={{ minHeight: "100vh", background: c.bg, color: c.textPrimary }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: `${space.lg} ${space.md}` }}>
          <BoroughToggle
            selected={borough}
            onSelect={setBorough}
            dateLabel={dateLabel}
            hourLabel={hourLabel}
            status={live ? STATUS_LIVE : STATUS_ARCHIVE}
          />

          <div style={{ marginTop: space.xl }}>
            <AQINumber value={displayAqi} />
          </div>

          <div style={{ marginTop: space.lg }}>
            <MoodLine tierIndex={moodTier} hour={moodHour} dominant={dominant} />
          </div>

          <div style={{ marginTop: space.xl }}>
            {day && (
              <Score
                day={day}
                anchors={a}
                tierIndex={moodTier}
                playheadHour={beat ? beat.hour : null}
                live={live}
                onToggle={togglePlay}
              />
            )}
          </div>

          {/* Timeline (3b) and footer lines one–two (3c) land here; the space is reserved, not stubbed. */}
          <div style={{ height: space.xl }} />
          <div style={{ height: space.xl }} />

          {day && <SourceLine borough={borough} hours={day} fallback={snapshot?.fallback ?? null} />}

          {DEV && (
            <div style={{ marginTop: space.lg }}>
              <select value={devDayKey} onChange={(e) => setDevDayKey(e.target.value)}>
                <option value="live">Live: NYC (last 24 h)</option>
                {PHASE0_DAYS.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label} (fixture)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </ThemeContext.Provider>
  );
}
