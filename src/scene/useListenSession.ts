// useListenSession — the Listen page's state, shared by the typographic page (App) and the scene (ScenePage) so the two never drift: one data load, one engine, one beat report, one play toggle. Extracted from App.tsx unchanged in behavior.
import { hourOfTs, warnOnce } from "../utils/time";
import { sunAnglesAt, tzOffsetFromTs, type SunAngles } from "./solar";
import { sunAlongPath } from "./sunPath";
import { skyFrameAspect } from "./useSafariWindow";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { SynthEngine, type BeatInfo, type Day, type HourReading } from "../engine/SynthEngine";
import { createPulseFeed, type PulseFeed } from "./pulseFeed";
import { drive } from "./useEased";
import { pageStatus, type PageStatus, type DayFetch } from "./pageStatus";
import { barPattern, barSteps } from "../engine/euclid";
import { HOURS_PER_BAR } from "../engine/tempo";
import { TIERS, detuneSigma, tierIndexOf } from "../engine/scales";
import { pm25ToAQI, pm25Played, isMeasuredHour, seriesAQI } from "../engine/aqi";
import { motion, NYC_LAT, NYC_LON, CAMERA_FACING } from "../utils/theme";
import { normalize, type PollutantAnchors } from "../engine/contour";
import { PHASE0_DAYS, QUEENS_2023_ANCHORS } from "../fixtures/phase0-days";
import { PINS } from "../content";
import { getCurrentAll, forgetLive, getAnchors, getDay, type Borough, type CurrentSnapshot, type DaySeries, getArchiveLastDate, getLatestAvailableDate } from "../utils/nycOpenData";
import { clamp01, easeInOutQuad, wrap, wrapDelta } from "../utils/math";

// The Phase 0 fixture select (?dev=1), on the dev server only: in production the parameter does nothing (2026-10-14; it had worked on the live site for anyone who added it).
export const DEV_FIXTURES = import.meta.env.DEV && new URLSearchParams(window.location.search).has("dev");


// What the monitor page reads (D-43): the engine's state for the hour being heard, from the beat report while playing, and for the held hour at rest through the same engine functions (the tier from PM2.5 alone, §3.4; the bar's k and pattern from euclid.ts; σ from the hour's PM2.5 AQI through scales.ts detuneSigma). Nothing here is a second formula.
export interface MonitorState {
  hour: number | null; // the index the values describe
  tierIndex: number; // the scale ladder's step, and the tone word's
  tierAqi: number | null; // the PM2.5 AQI the tier was chosen from (smoothed while playing): the lit step's colour on the ramp
  scaleName: string; // the engine's own name (scales.ts)
  k: number | null; // the bar's Euclidean density; null = no pulse this bar
  steps: boolean[] | null; // the bar's 16-step pattern
  o3n: number | null; // normalized O3, the lowpass ceiling's input (§3.6)
  o3: number | null; // the hour's O3, ppb
  pm25n: number | null; // normalized PM2.5, the reverb wet's input (§3.6)
  pm25: number | null; // the hour's PM2.5, µg/m³
  no2n: number | null;
  detuneCents: number; // σ of the melody's detune (§3.6)
}

export interface ListenSession {
  borough: Borough;
  setBorough: (b: Borough) => void;
  // A chosen day (YYYY-MM-DD) from the archive or the live-year route; null = live, the last 24 hours (§2.2 scrubbing).
  date: string | null;
  setDate: (d: string | null) => void;
  dayLoading: boolean;
  retryDay: () => void;
  // ONE clock for everything that moves with the phrase: the beat's integer hour eased over one beat (§5.4), wrapping forward at the loop seam. The sun, the playhead and every graph track read this and nothing else.
  latestDate: string | null; // the last day the archive can play; null until known
  playheadHour: number; // eased transport position: an index into the day (fractional while running)
  playheadClock: number; // the same position as a clock hour, from the reading's timestamp: the sun and the stars read this
  sunDay: { date: string; tz: number } | null; // the loaded day's date and offset: what the sun runs on outside a change of day
  sunOverride: { azimuthDeg: number; elevationDeg: number } | null; // during a change of day at rest, the sun's interpolated position; the page uses it instead of the clock
  dissolve: number; // increments on a change of day made while playing: the page dissolves the last rendered sky over the new one (D-32)
  // True after a pause or a seek: the phrase is held at playheadHour rather than at rest.
  paused: boolean;
  // Move the phrase to an hour (fractional), playing or not — the graph's scrub.
  seek: (hour: number) => void;
  snapshot: CurrentSnapshot | null;
  // What the live fetch is doing (D-60, 2026-09-17): "loading" until AirNow answers, "ready" once it has, "unavailable" when it could not be reached. It used to fail into a console warning and an empty page that never said why.
  liveStatus: "loading" | "ready" | "unavailable";
  retryLive: () => void;
  status: PageStatus; // what the line above the footer says, one state at a time in priority order (pageStatus.ts)
  day: Day | null;
  live: boolean;
  playing: boolean;
  beat: BeatInfo | null;
  togglePlay: () => void;
  setVolume: (db: number) => void;
  displayAqi: number | null;
  aqiHours: Array<number | null>; // the loaded day's current AQI hour by hour (engine/aqi.ts): the graph's AQI line
  rest: { reading: HourReading; index: number; hour: number } | null; // the hour the page reads at rest: the paused or seeked hour if the day has it, else latest
  // The category the mood word names and the AQI its colour reads: the current AQI (the composite) at the hour being heard while playing, at the rest hour otherwise, so the word follows the graph line at the playhead. The sound's tier stays PM2.5 alone (§3.4); the word and the number read EPA's category (D-42).
  moodTier: number | null; // null when the hour has no AQI: the card shows no word rather than the first tier's (BUG-63)
  moodAqi: number | null;
  monitor: MonitorState; // the monitor page's readouts (D-43)
  pulses: PulseFeed; // the pulse hits the engine fires, for the monitor's lane to subscribe to (pulseFeed.ts)
  skyChannels: { pm25: number | null; o3: number | null }; // channels for the sky: a null hour holds the last reported value
  devDayKey: string;
  setDevDayKey: (k: string) => void;
}

export function useListenSession(): ListenSession {
  const [borough, setBorough] = useState<Borough>("Citywide");
  const [snapshot, setSnapshot] = useState<CurrentSnapshot | null>(null);
  const [liveStatus, setLiveStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [liveAttempt, setLiveAttempt] = useState(0); // bumped by retryLive, which re-runs the fetch below
  const [anchors, setAnchors] = useState<PollutantAnchors | null>(null);
  // The last day the archive can play (UX-03): the static archive's last day at once, then the last day EPA has published this year when the route answers. Nothing past it is offered anywhere.
  const [latestDate, setLatestDate] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { const d = await getArchiveLastDate(borough); if (!cancelled) setLatestDate((cur) => (cur && cur > d ? cur : d)); } catch { /* the static archive is missing: leave null, the nav waits */ }
      try { const d = await getLatestAvailableDate(borough); if (!cancelled && d) setLatestDate((cur) => (cur && cur > d ? cur : d)); } catch (err) { console.warn("[App] latest available date:", err); }
    })();
    return () => { cancelled = true; };
  }, [borough]);
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState<BeatInfo | null>(null);
  const [devDayKey, setDevDayKey] = useState<string>("live");
  const [date, setDate] = useState<string | null>(null);
  const [chosen, setChosen] = useState<DaySeries | null>(null);

  const engineRef = useRef<SynthEngine | null>(null);
  if (engineRef.current === null) engineRef.current = new SynthEngine(QUEENS_2023_ANCHORS);
  // Torn down with the page (BUG-50, 2026-10-12): an unmount disposes the engine, which silences it and frees its nodes and its repeats on Tone's global transport. That covers the crash screen replacing the page mid-phrase, and development's hot reload, which re-runs this effect and so gets a fresh engine rather than a second one playing over the first. Declared before the effects that register on the engine, so on a remount they register on the new one.
  useEffect(() => {
    if (engineRef.current === null) engineRef.current = new SynthEngine(QUEENS_2023_ANCHORS);
    const engine = engineRef.current;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // First paint loads only the last 24 hours (UX-01); the page renders immediately and fills when it lands. The outcome is reported as liveStatus (D-60): AirNow is down often enough, and missing entirely in a local checkout without the keys, that a silent failure left the page looking simply empty.
  useEffect(() => {
    let cancelled = false;
    setLiveStatus((s) => (s === "ready" ? s : "loading"));
    (async () => {
      try {
        // AirNow alone decides the live line (BUG-60, 2026-10-12): the anchors are our own static file and were awaited alongside, so a failed anchors.json read as "Can't reach AirNow". They load with the day below, and fall back to the bundled ones if they fail.
        const snap = await getCurrentAll();
        if (cancelled) return;
        setSnapshot(snap);
        setLiveStatus("ready");
      } catch (err) {
        console.warn("[App] Live fetch failed:", err);
        if (!cancelled) setLiveStatus("unavailable");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [liveAttempt]);
  const retryLive = useCallback(() => { forgetLive(); setLiveAttempt((n) => n + 1); }, []);

  // A chosen day loads on demand, for this borough; nothing is fetched until asked (BUG-20). A failure is said, not shown as an empty day (2026-10-12): the page carries the empty day (a dash, no plot) and the fetch "failed", which puts the failure on the live line's spot with a retry; a load longer than a beat is said too (the fetch "slow"), since a current-year day from EPA can take a minute and a phone had no sign of it at all.
  const [dayFetch, setDayFetch] = useState<DayFetch>("idle");
  const [dayAttempt, setDayAttempt] = useState(0); // bumped by retryDay; the failed fetch is not cached (nycOpenData.ts), so asking again asks the network
  useEffect(() => {
    if (!date) { setChosen(null); setDayFetch("idle"); return; } // back to live: a fetch still in flight is cancelled and nothing is loading (BUG-73: the flag had stayed on)
    let cancelled = false;
    setDayFetch("loading");
    const slow = window.setTimeout(() => { if (!cancelled) setDayFetch((f) => (f === "loading" ? "slow" : f)); }, motion.beatMs);
    (async () => {
      try {
        const s = await getDay(borough, date);
        if (!cancelled) { setChosen(s); setDayFetch("idle"); }
      } catch (err) {
        console.warn("[App] Day fetch failed:", err);
        if (!cancelled) { setChosen({ hours: [], aqi: { daily: null, current: null, hourly: [] } }); setDayFetch("failed"); }
      } finally {
        window.clearTimeout(slow);
      }
    })();
    return () => { cancelled = true; window.clearTimeout(slow); };
  }, [date, borough, dayAttempt]);
  const retryDay = useCallback(() => setDayAttempt((n) => n + 1), []);


  // Warm the archive year the pins live in once the page is idle, so the first pin does not wait on a fetch (the year file is cached per borough after that). Idle means after the live answer, not during it: the year file is about a megabyte and had been competing with the first paint's one request (2026-10-14).
  const liveSettled = liveStatus !== "loading";
  useEffect(() => {
    if (!liveSettled) return;
    const id = window.setTimeout(() => { void getDay(borough, PINS[0].date).catch(() => undefined); }, 1500);
    return () => window.clearTimeout(id);
  }, [borough, liveSettled]);

  const devFixture = DEV_FIXTURES && devDayKey !== "live" ? PHASE0_DAYS.find((d) => d.key === devDayKey) : undefined;
  const day: Day | null = devFixture ? devFixture.day : date ? (chosen?.hours ?? null) : (snapshot?.series[borough].hours ?? null);
  const live = !devFixture && !date;

  // Feed the engine. A borough switch keeps the phrase position (§2.1: same hour, different air); a dev fixture switch restarts.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !day) return;
    let superseded = false; // a later day or borough has taken over: this one must not reach the engine after it (BUG-71)
    (async () => {
      if (devFixture) {
        engine.setDay(devFixture.day, QUEENS_2023_ANCHORS);
        return;
      }
      // Anchors that fail to load fall back to the bundled ones (BUG-60): the day still plays, normalized against Queens 2023 rather than its borough, instead of the engine silently keeping the previous day.
      const a = await getAnchors(borough).catch((err) => { console.warn("[App] anchors failed, using the bundled ones:", err); return QUEENS_2023_ANCHORS; });
      if (superseded) return;
      // Any switch — borough or day — keeps the phrase position: the music does not stop, the next beat reads the new air (§2.1, §2.2).
      engine.setDay(day, a, { keepPosition: true });
      setAnchors(a);
    })();
    return () => { superseded = true; };
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
  // The pulse hits, for the monitor's lane (D-43): the engine's own 16th-step callback, deferred by the engine to the audible moment like the beat report.
  const [pulses] = useState(createPulseFeed); // a feed, not state: a hit renders the lane alone, not the page (pulseFeed.ts)
  useEffect(() => {
    engineRef.current?.onPulse((info) => pulses.set({ ...info, t: performance.now() }));
    return () => engineRef.current?.onPulse(null);
  }, [pulses]);
  useEffect(() => { if (!playing) pulses.set(null); }, [playing, pulses]); // at rest nothing fires; the lane shows the pattern unlit

  // A seek moves the clock immediately; the next beat report (which arrives after it) takes over again.
  const [seekAt, setSeekAt] = useState<{ hour: number; t: number } | null>(null);
  const seek = useCallback((hour: number) => {
    engineRef.current?.seek(hour);
    setSeekAt({ hour, t: performance.now() });
    setPausedHour(Math.floor(hour)); // at rest, the page reads the day at the seeked hour
  }, []);



  // Play/pause: the sky, the transport button, and Space. The engine is told inside the gesture's own call stack — Tone.start() needs the gesture, and a pause that waited for a render and an effect landed a frame late, which the ear reads as a trailing tail. React state follows.
  const playingRef = useRef(false);
  // Sound that did not start is said, and the button goes back to Play (BUG-61, 2026-10-12): it had stayed on Pause over silence. Two ways it fails: play() rejects (Tone.start or the reverbs' build threw), or the audio context is still not running a second after the press (a browser that holds audio back; Tone.start can then wait without ever settling). Neither can be seen from the page otherwise.
  const [soundFailed, setSoundFailed] = useState(false);
  const togglePlay = useCallback(() => {
    const next = !playingRef.current;
    playingRef.current = next;
    const engine = engineRef.current;
    if (next && engine) {
      setSoundFailed(false);
      const fail = (why: unknown) => {
        if (!playingRef.current) return; // paused in the meantime: nothing to report
        console.warn("[App] Sound did not start:", why);
        playingRef.current = false;
        engine.pause();
        setPlaying(false);
        setSoundFailed(true);
      };
      engine.play().catch(fail); // play() begins with init(), so Tone.start() runs here, in the gesture
      window.setTimeout(() => { if (!engine.running()) fail("audio context not running after 1 s"); }, 1000);
    } else engine?.pause();
    setPlaying(next);
  }, []);

  // A change of day while playing or paused keeps the CLOCK HOUR, not the array index (§2.1, §2.2: same hour, different air). The two are the same on an archive day, but the live window starts where AirNow's window starts, so index 8 is 8 am on an archive day and 11 pm yesterday on the live one; keeping the index sent a bright morning into the night and read as the sun's effects dying. The engine is sought to the new day's index for the old clock hour; if the new day has no such hour the position stands.
  const prevDayRef = useRef<Day | null>(null);
  useEffect(() => {
    const prev = prevDayRef.current;
    prevDayRef.current = day;
    if (!prev || !day || prev === day) return;
    const idx = playing ? beat?.hour : pausedHour;
    if (idx == null) return;
    const k = Math.min(idx, prev.length - 1);
    if (!prev[k]?.ts) return;
    const hour = hourOfTs(prev[k].ts);
    const j = day.findIndex((r) => hourOfTs(r.ts) === hour);
    if (j >= 0 && j !== idx) seek(j);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

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
  const fixtureAqi = useMemo(() => (devFixture && day ? seriesAQI(day) : null), [devFixture, day]); // a fixture day has no neighbours; its windows start at midnight
  const aqi = fixtureAqi ?? series?.aqi ?? null;
  const displayAqi = aqi == null ? null : date || devFixture ? aqi.daily : aqi.current; // a chosen day its official daily AQI, Live the current AQI (D-42)
  const aqiHours = aqi?.hourly ?? EMPTY_HOURS;

  // Latest non-null hour of the loaded day — the resting state before playback.
  // Memoised, along with `rest` below, because both feed the monitor's useMemo and both used to be rebuilt on every render: a fresh object each time meant that memo never held and everything reading it re-ran with it (BUG-51, 2026-09-17; the same shape as BUG-31, where a colour object rebuilt per call cost about a thousand canvas redraws a second).
  const latest = useMemo(() => {
    if (!day) return null;
    for (let i = day.length - 1; i >= 0; i--) {
      if (isMeasuredHour(day[i])) return { reading: day[i], index: i, hour: hourOfTs(day[i].ts) }; // a MEASURED hour (BUG-64): one carrying only the typical NO2 has no AQI to rest on
    }
    return null;
  }, [day]);

  // The beat report describes the hour being heard; a seek made after it (paused or at rest) supersedes it, so the page reads the seeked hour, not the hour the report described.
  const seekHour = seekAt && seekAt.t > beatAtRef.current ? seekAt.hour : null;
  const report = beat && seekHour == null ? beat : null;
  // At rest the page reads one hour of the loaded day: the paused or seeked hour if there is one and the day has it, else the latest reporting hour.
  const rest = useMemo(
    () => (pausedHour != null && day && day[pausedHour] ? { reading: day[pausedHour], index: pausedHour, hour: hourOfTs(day[pausedHour].ts) } : latest),
    [pausedHour, day, latest],
  );
  // Index → clock hour of that reading; identity on an archive day, the window's own hours on the live path. Fractions carry across so the eased position stays smooth.
  const clockOf = (i: number): number => {
    if (!day || day.length === 0) return i;
    const k = Math.min(day.length - 1, Math.max(0, Math.floor(i)));
    return hourOfTs(day[k].ts) + (i - Math.floor(i));
  };

  // Mood inputs: the beat report while playing (it describes what you are hearing); the rest hour otherwise.
  const a = anchors ?? QUEENS_2023_ANCHORS;
  const moodIndex = report ? report.hour : rest?.index;
  const moodAqi = moodIndex == null ? null : (aqiHours[moodIndex] ?? null);
  const moodTier = moodAqi == null ? null : tierIndexOf(moodAqi); // the ladder's lines are EPA's category lines (D-38), so the tier index is the category index; no AQI, no word (BUG-63): it had fallen back to the first tier, "Easy", on a day that never loaded
  // The monitor's state (D-43): the beat report while playing; at rest the held hour through the engine's own functions. The rest tier is the hour's PM2.5 AQI unsmoothed (the smoother has no history at rest), which is what the engine reseeds from when play begins.
  const monitor = useMemo<MonitorState>(() => {
    if (report) {
      return { hour: report.hour, tierIndex: report.tierIndex, tierAqi: report.smoothedAQI, scaleName: report.scaleName, k: report.k, steps: report.steps, o3n: report.o3n, o3: report.o3, pm25n: report.pm25n, pm25: report.pm25, no2n: report.no2n, detuneCents: report.detuneCents };
    }
    const r = rest?.reading ?? null;
    const pm25 = pm25Played(r?.pm25 ?? null);
    const pm25n = normalize(pm25, a.pm25);
    const tierAqi = pm25ToAQI(pm25);
    const tierIndex = tierAqi == null ? 0 : tierIndexOf(tierAqi);
    const bar = rest ? Math.floor(rest.index / HOURS_PER_BAR) : 0;
    const { k, rotation } = day ? barPattern(day, bar, a.no2) : { k: null, rotation: 0 };
    return { hour: rest?.index ?? null, tierIndex, tierAqi, scaleName: TIERS[tierIndex].scaleName, k, steps: barSteps(k, rotation), o3n: normalize(r?.o3 ?? null, a.o3), o3: r?.o3 ?? null, pm25n, pm25, no2n: normalize(r?.no2 ?? null, a.no2), detuneCents: detuneSigma(tierAqi) };
  }, [report, rest, day, a]);
  const clockTarget = seekHour ?? (beat ? beat.hour : (rest?.index ?? 12));
  const playheadHour = useEasedHour(clockTarget, playing);
  // The clock glides where the index cannot: a day switch keeps the transport position but the same index is a different time of day on the new day (live index 23 is 1 pm; an archive day's is 11 pm), and the sun must not jump between them.
  const sunDate = day && day.length > 0 ? day[0].ts.slice(0, 10) : null;
  const sunTz = day && day.length > 0 ? tzOffsetFromTs(day[0].ts) : null;
  const sunDayMemo = useMemo(() => (sunDate != null && sunTz != null ? { date: sunDate, tz: sunTz } : null), [sunDate, sunTz]); // a new object only when the date or the offset changes
  const transition = useSunTransition(clockOf(playheadHour), sunDayMemo, playing);
  const playheadClock = transition.clock;
  const paused = !playing && (pausedHour != null || seekAt != null);
  // The sky's inputs: the same channels, but a channel the current hour lacks holds its last reported value from earlier in the day (looked back through the day, so a rest hour with no O3 yet still carries the afternoon's O3). The engine holds its effects the same way across a null hour (§4.4: no data, no movement). AirNow publishes PM2.5 for the newest hour before O3, so without this the afternoon sky fell to its low-ozone end.
  const held = (ch: "pm25" | "o3"): number | null => {
    if (!day || moodIndex == null) return null; // the hour being read, the same one the mood word reads
    for (let i = Math.min(moodIndex, day.length - 1); i >= 0; i--) {
      const v = day[i][ch];
      if (v != null) return normalize(ch === "pm25" ? pm25Played(v) : v, a[ch]);
    }
    return null;
  };
  const skyChannels = { pm25: held("pm25"), o3: held("o3") };

  const liveEmpty = liveStatus === "ready" && snapshot != null && !snapshot.series.Citywide.hours.some((h) => h.pm25 != null || h.o3 != null); // the citywide series is the mean of every reporting borough, so empty there is empty everywhere
  const status = useMemo(() => pageStatus({ soundFailed, date, dayFetch, live, liveStatus, liveEmpty }), [soundFailed, date, dayFetch, live, liveStatus, liveEmpty]); // memoised, so the page's line is rebuilt only when the state changes

  return {
    borough, setBorough, date, setDate, latestDate, dayLoading: dayFetch === "loading" || dayFetch === "slow", retryDay, status, playheadHour, playheadClock, sunDay: sunDayMemo, sunOverride: transition.sun, dissolve: transition.dissolve, paused, seek,
    snapshot, liveStatus, retryLive, day, live, playing, beat, togglePlay, setVolume,
    displayAqi, aqiHours, rest, moodTier, moodAqi, monitor, pulses, skyChannels, devDayKey, setDevDayKey,
  };
}

// The beat report says hour h has just STARTED. The clock therefore runs from h toward h+1 over the beat, so the playhead crosses each column in time with the sound and the sun glides continuously; the next report lands as it reaches h+1, and any drift between the audio clock and the frame clock is corrected there. (Easing from the previous hour TO h made the playhead arrive a full beat late, so pulse hits flashed a column ahead of the line.) Across the loop seam it runs 23 → 24 (= 0), never backward. Under reduced motion it still moves, because it is the playhead.
// A change of day moves the sun from where it is to where the new day's time puts it over SUN_GLIDE_BEATS beats, ease-in-out, along a path planned in the camera's screen space (sunPath.ts, D-33 amending D-31): straight on screen while the sun is visible, so it never reverses on screen, and in angles while it is unseen. Everything the sky derives from elevation — exposure, the night blue, golden hour, the stars' visibility — follows the interpolated sun, and the clock the stars turn on takes the shortest way round too. No sunset-then-sunrise sequence: 11 am to 7 pm is one arc down and to the right; 11 pm to 3 pm is one arc up. That is the glide AT REST. While PLAYING a change of day is a cut shown as a dissolve (D-32): the target keeps moving during playback, so a glide bends toward a moving point and the sun heads off in arcs that read as arbitrary; the page fades the last rendered frame out over the new sky instead. Outside a change of day the sun is where the clock puts it, exactly — playback, and a scrub in either direction. A target that moves during the glide (playback) is re-read each frame, so the glide lands on it; a second change restarts from where the sun is.
const EMPTY_HOURS: Array<number | null> = [];
const SUN_GLIDE_BEATS = 1.5;
interface SunDay { date: string; tz: number }
interface SunState { clock: number; sun: SunAngles | null; dissolve: number } // sun: the interpolated position during a glide, else null (the page computes it from the day and the clock). dissolve: a counter the page watches — each increment is a change of day made while playing, to be shown as a dissolve of the rendered sky rather than a glide (D-32).
function useSunTransition(target: number, sunDay: SunDay | null, playing: boolean): SunState {
  // Derived during render, not copied into state from an effect (2026-10-14). The effect version set state on every change of target, which while playing is every frame, so the page rendered twice a frame; and it saw a change of day only after that day had committed, so for a frame or two the sky had the new day's sun before the glide pulled it back to where it was (measured: 39° to the destination and back on Rush Hour → Wildfire at rest).
  // A change of day is noticed here, during render, and answered with state set during render (React's way of adjusting state to a new prop): React renders again before committing, so nothing ever commits the new day without its glide, or hands the sky the new day while playing before the dissolve's counter has moved (the page copies the old frame in the same commit, ScenePage).
  const key = (d: SunDay | null) => (d ? `${d.date}|${d.tz}` : "");
  const [seen, setSeen] = useState<SunDay | null>(sunDay);
  const [glide, setGlide] = useState<{ from: SunAngles; fromClock: number; start: number; ms: number } | null>(null);
  const [now, setNow] = useState(0); // the glide's frame time: the only thing that renders per frame, and only while a glide runs
  const [dissolve, setDissolve] = useState(0);
  const shown = useRef<{ clock: number; sun: SunAngles | null }>({ clock: target, sun: null }); // what the last commit showed: a change of day starts from it, and a loading day holds it

  if (sunDay && key(sunDay) !== key(seen)) {
    setSeen(sunDay);
    if (seen && playing) {
      // Playing: the target keeps moving, so a glide bends toward a moving point. Cut instead — the page dissolves the last rendered frame over the new sky.
      setGlide(null);
      setDissolve((n) => n + 1);
    } else if (seen) {
      const from = shown.current.sun ?? sunAnglesAt(seen.date, shown.current.clock, NYC_LAT, NYC_LON, seen.tz); // mid-glide, where the glide had got to
      const start = performance.now();
      setGlide({ from, fromClock: shown.current.clock, start, ms: motion.beatMs * SUN_GLIDE_BEATS });
      setNow(start);
    }
  }

  let out: { clock: number; sun: SunAngles | null };
  if (!sunDay) out = shown.current; // a day is loading: hold
  else if (glide && now - glide.start < glide.ms) {
    const e = easeInOutQuad(Math.max(0, (now - glide.start) / glide.ms));
    const to = sunAnglesAt(sunDay.date, target, NYC_LAT, NYC_LON, sunDay.tz); // the target as of this render: it may be moving
    // The path is planned in the camera's screen space (sunPath.ts, D-33): straight on screen while visible, angles while unseen. In the camera's FRAME, which on an iPhone is the screen below the window's top rather than the whole sky box (useSafariWindow, BUG-57); everywhere else it is the viewport, as it always was.
    const sun = sunAlongPath(glide.from, to, e, { facingDeg: CAMERA_FACING === "south" ? 180 : 0, aspect: skyFrameAspect() });
    out = { clock: wrap(glide.fromClock + wrapDelta(glide.fromClock, target, 24) * e, 24), sun };
  } else out = { clock: target, sun: null }; // outside a glide the sun is where the clock puts it, exactly
  useLayoutEffect(() => { shown.current = out; });

  // The glide's frames: a timestamp per frame until it is over, then no glide.
  useEffect(() => {
    if (!glide) return;
    let raf = 0;
    const tick = (t: number) => {
      if (t - glide.start >= glide.ms) { setGlide(null); return; }
      setNow(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [glide]);

  return useMemo(() => ({ clock: out.clock, sun: out.sun, dissolve }), [out.clock, out.sun, dissolve]);
}

function useEasedHour(target: number, running: boolean): number {
  // The playhead is a small store advanced by the shared frame loop (useEased.ts drive), not React state on a loop of its own, so a frame's playhead and its eased inputs render together.
  const store = useRef<{ value: number; listeners: Set<() => void> } | null>(null);
  if (!store.current) store.current = { value: target, listeners: new Set() };
  const s = store.current;
  const subscribe = useCallback((l: () => void) => { s.listeners.add(l); return () => { s.listeners.delete(l); }; }, [s]);
  const value = useSyncExternalStore(subscribe, () => s.value, () => s.value);
  useEffect(() => {
    if (!Number.isFinite(target)) { warnOnce("playhead target"); return; } // never let a NaN into the eased state: it would never come back
    const notify = () => { for (const l of s.listeners) l(); };
    if (!running) {
      // At rest or paused: glide to the target over half a beat rather than jump. Linear, in the direction of the seek: the transport position is a line from hour 0 to 23, not a circle, so a scrub from 23 to 8 runs back through the afternoon rather than wrapping through midnight (the playhead would appear to jump to the start, and the clock would follow it).
      const from = s.value;
      const to = target % 24;
      const start = performance.now();
      return drive({
        step: (now) => {
          const t = clamp01((now - start) / motion.easeTauMs); // a frame's timestamp can precede the performance.now() that started it by a few ms; never run backwards
          s.value = wrap(from + (to - from) * (1 - Math.pow(1 - t, 3)), 24);
          return t < 1;
        },
        notify,
      });
    }
    const start = performance.now();
    s.value = target % 24;
    notify();
    return drive({
      step: (now) => {
        const t = clamp01((now - start) / motion.beatMs); // same clamp: an early frame timestamp made hour 0 read −0.004 for a frame
        s.value = (target + t) % 24;
        return t < 1;
      },
      notify,
    });
  }, [target, running, s]);
  return value;
}
