// useListenSession — the Listen page's state, shared by the typographic page (App) and the scene (ScenePage) so the two never drift: one data load, one engine, one beat report, one play toggle. Extracted from App.tsx unchanged in behavior.
import { hourOfTs, warnOnce } from "../utils/time";
import { sunAnglesAt, tzOffsetFromTs, type SunAngles } from "./solar";
import { sunAlongPath } from "./sunPath";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SynthEngine, type BeatInfo, type PulseInfo, type Day, type HourReading } from "../engine/SynthEngine";
import { barK, barSteps } from "../engine/euclid";
import { TIERS, detuneSigma } from "../engine/scales";
import { pm25ToAQI } from "../engine/aqi";
import { motion, NYC_LAT, NYC_LON, CAMERA_FACING } from "../utils/theme";
import { normalize, type PollutantAnchors } from "../engine/contour";
import { tierIndexOf } from "../engine/scales";
import { seriesAQI } from "../engine/aqi";
import { PHASE0_DAYS, QUEENS_2023_ANCHORS } from "../fixtures/phase0-days";
import { PINS } from "../content";
import { getCurrentAll, forgetLive, getAnchors, getDay, type Borough, type CurrentSnapshot, type DaySeries, getArchiveLastDate, getLatestAvailableDate } from "../utils/nycOpenData";

// Dev-only fixture select (?dev=1): never renders for a visitor.
export const DEV = new URLSearchParams(window.location.search).has("dev");

export type Channel = "pm25" | "o3" | "no2";

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
export interface PulseHit extends PulseInfo { t: number } // a pulse the engine fired, with the frame time it landed (the lane lights the step and lets it decay)

export interface ListenSession {
  borough: Borough;
  setBorough: (b: Borough) => void;
  // A chosen day (YYYY-MM-DD) from the archive or the live-year route; null = live, the last 24 hours (§2.2 scrubbing).
  date: string | null;
  setDate: (d: string | null) => void;
  dayLoading: boolean;
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
  anchors: PollutantAnchors; // the engine's anchors (falls back to Queens 2023 until the borough's land)
  day: Day | null;
  live: boolean;
  playing: boolean;
  beat: BeatInfo | null;
  togglePlay: () => void;
  setVolume: (db: number) => void;
  displayAqi: number | null;
  aqiHours: Array<number | null>; // the loaded day's current AQI hour by hour (engine/aqi.ts): the graph's AQI line
  latest: { reading: HourReading; index: number; hour: number } | null; // latest non-null hour of the loaded day: its index and its clock hour
  rest: { reading: HourReading; index: number; hour: number } | null; // the hour the page reads at rest: the paused or seeked hour if the day has it, else latest
  // The category the mood word names and the AQI its colour reads: the current AQI (the composite) at the hour being heard while playing, at the rest hour otherwise, so the word follows the graph line at the playhead. The sound's tier stays PM2.5 alone (§3.4); the word and the number read EPA's category (D-42).
  moodTier: number;
  moodAqi: number | null;
  monitor: MonitorState; // the monitor page's readouts (D-43)
  pulse: PulseHit | null; // the last pulse hit the engine fired, for the monitor's lane
  // Normalized channels for whatever the page is showing right now: the beat while playing, the rest hour otherwise. A null channel is null here (the mood sentence must not name it).
  channels: { pm25: number | null; o3: number | null; no2: number | null };
  skyChannels: { pm25: number | null; o3: number | null; no2: number | null }; // channels for the sky: a null hour holds the last reported value
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
  const [date, setDateState] = useState<string | null>(null);
  const [chosen, setChosen] = useState<DaySeries | null>(null);
  const [dayLoading, setDayLoading] = useState(false);

  const engineRef = useRef<SynthEngine | null>(null);
  if (engineRef.current === null) engineRef.current = new SynthEngine(QUEENS_2023_ANCHORS);
  const prevBoroughRef = useRef<Borough>(borough);
  const prevDateRef = useRef<string | null>(null);

  // First paint loads only the last 24 hours (UX-01); the page renders immediately and fills when it lands. The outcome is reported as liveStatus (D-60): AirNow is down often enough, and missing entirely in a local checkout without the keys, that a silent failure left the page looking simply empty.
  useEffect(() => {
    let cancelled = false;
    setLiveStatus((s) => (s === "ready" ? s : "loading"));
    (async () => {
      try {
        const [snap, a] = await Promise.all([getCurrentAll(), getAnchors("Citywide")]);
        if (cancelled) return;
        setSnapshot(snap);
        setAnchors(a);
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
        if (!cancelled) setChosen({ hours: [], aqi: { daily: null, current: null, hourly: [] }, fallback: null, fetchedAt: null });
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
  // The pulse hits, for the monitor's lane (D-43): the engine's own 16th-step callback, deferred by the engine to the audible moment like the beat report.
  const [pulse, setPulse] = useState<PulseHit | null>(null);
  useEffect(() => {
    engineRef.current?.onPulse((info) => setPulse({ ...info, t: performance.now() }));
    return () => engineRef.current?.onPulse(null);
  }, []);
  useEffect(() => { if (!playing) setPulse(null); }, [playing]); // at rest nothing fires; the lane shows the pattern unlit

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
      if (day[i].pm25 != null || day[i].o3 != null || day[i].no2 != null) return { reading: day[i], index: i, hour: hourOfTs(day[i].ts) };
    }
    return null;
  }, [day]);

  // The beat report describes the hour being heard; a seek made after it (paused or at rest) supersedes it, so the page reads the seeked hour, not the hour the report described.
  const report = beat && !(seekAt && seekAt.t > beatAtRef.current) ? beat : null;
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
  const moodTier = moodAqi == null ? 0 : tierIndexOf(moodAqi); // the ladder's lines are EPA's category lines (D-38), so the tier index is the category index
  // The monitor's state (D-43): the beat report while playing; at rest the held hour through the engine's own functions. The rest tier is the hour's PM2.5 AQI unsmoothed (the smoother has no history at rest), which is what the engine reseeds from when play begins.
  const monitor = useMemo<MonitorState>(() => {
    if (report) {
      return { hour: report.hour, tierIndex: report.tierIndex, tierAqi: report.smoothedAQI, scaleName: report.scaleName, k: report.k, steps: report.steps, o3n: report.o3n, o3: report.o3, pm25n: report.pm25n, pm25: report.pm25, no2n: report.no2n, detuneCents: report.detuneCents };
    }
    const r = rest?.reading ?? null;
    const pm25 = r?.pm25 == null ? null : Math.max(0, r.pm25);
    const pm25n = normalize(pm25, a.pm25);
    const tierAqi = pm25ToAQI(pm25);
    const tierIndex = tierAqi == null ? 0 : tierIndexOf(tierAqi);
    const bar = rest ? Math.floor(rest.index / 4) : 0;
    const k = day ? barK(day.slice(bar * 4, bar * 4 + 4).map((h) => normalize(h.no2, a.no2))) : null;
    return { hour: rest?.index ?? null, tierIndex, tierAqi, scaleName: TIERS[tierIndex].scaleName, k, steps: barSteps(k, (bar * 4) % 16), o3n: normalize(r?.o3 ?? null, a.o3), o3: r?.o3 ?? null, pm25n, pm25, no2n: normalize(r?.no2 ?? null, a.no2), detuneCents: detuneSigma(tierAqi) };
  }, [report, rest, day, a]);
  const clockTarget = seekAt && seekAt.t > beatAtRef.current ? seekAt.hour : beat ? beat.hour : (rest?.index ?? 12);
  const playheadHour = useEasedHour(clockTarget, playing);
  // The clock glides where the index cannot: a day switch keeps the transport position but the same index is a different time of day on the new day (live index 23 is 1 pm; an archive day's is 11 pm), and the sun must not jump between them.
  const sunDayOf = day && day.length > 0 ? { date: day[0].ts.slice(0, 10), tz: tzOffsetFromTs(day[0].ts) } : null;
  const sunDayMemo = useMemo(() => sunDayOf, [sunDayOf?.date, sunDayOf?.tz]); // eslint-disable-line react-hooks/exhaustive-deps
  const transition = useSunTransition(clockOf(playheadHour), sunDayMemo, playing);
  const playheadClock = transition.clock;
  const paused = !playing && (pausedHour != null || seekAt != null);
  // The sky's inputs: the same channels, but a channel the current hour lacks holds its last reported value from earlier in the day (looked back through the day, so a rest hour with no O3 yet still carries the afternoon's O3). The engine holds its effects the same way across a null hour (§4.4: no data, no movement). AirNow publishes PM2.5 for the newest hour before O3, so without this the afternoon sky fell to its low-ozone end.
  const heldIndex = report ? report.hour : rest?.index;
  const held = (ch: "pm25" | "o3" | "no2"): number | null => {
    if (!day || heldIndex == null) return null;
    for (let i = Math.min(heldIndex, day.length - 1); i >= 0; i--) {
      const v = day[i][ch];
      if (v != null) return normalize(ch === "pm25" ? Math.max(0, v) : v, a[ch]);
    }
    return null;
  };
  const skyChannels = { pm25: held("pm25"), o3: held("o3"), no2: held("no2") };
  const channels = report
    ? { pm25: report.pm25n, o3: report.o3n, no2: report.no2n }
    : rest
      ? {
          pm25: normalize(rest.reading.pm25 == null ? null : Math.max(0, rest.reading.pm25), a.pm25),
          o3: normalize(rest.reading.o3, a.o3),
          no2: normalize(rest.reading.no2, a.no2),
        }
      : { pm25: null, o3: null, no2: null };

  return {
    borough, setBorough, date, setDate, latestDate, dayLoading, playheadHour, playheadClock, sunDay: sunDayMemo, sunOverride: transition.sun, dissolve: transition.dissolve, paused, seek,
    snapshot, liveStatus, retryLive, anchors: a, day, live, playing, beat, togglePlay, setVolume,
    displayAqi, aqiHours, latest, rest, moodTier, moodAqi, monitor, pulse, channels, skyChannels, devDayKey, setDevDayKey,
  };
}

// The beat report says hour h has just STARTED. The clock therefore runs from h toward h+1 over the beat, so the playhead crosses each column in time with the sound and the sun glides continuously; the next report lands as it reaches h+1, and any drift between the audio clock and the frame clock is corrected there. (Easing from the previous hour TO h made the playhead arrive a full beat late, so pulse hits flashed a column ahead of the line.) Across the loop seam it runs 23 → 24 (= 0), never backward. Under reduced motion it still moves, because it is the playhead.
// A change of day moves the sun from where it is to where the new day's time puts it over SUN_GLIDE_BEATS beats, ease-in-out, along a path planned in the camera's screen space (sunPath.ts, D-33 amending D-31): straight on screen while the sun is visible, so it never reverses on screen, and in angles while it is unseen. Everything the sky derives from elevation — exposure, the night blue, golden hour, the stars' visibility — follows the interpolated sun, and the clock the stars turn on takes the shortest way round too. No sunset-then-sunrise sequence: 11 am to 7 pm is one arc down and to the right; 11 pm to 3 pm is one arc up. That is the glide AT REST. While PLAYING a change of day is a cut shown as a dissolve (D-32): the target keeps moving during playback, so a glide bends toward a moving point and the sun heads off in arcs that read as arbitrary; the page fades the last rendered frame out over the new sky instead. Outside a change of day the sun is where the clock puts it, exactly — playback, and a scrub in either direction. A target that moves during the glide (playback) is re-read each frame, so the glide lands on it; a second change restarts from where the sun is.
const EMPTY_HOURS: Array<number | null> = [];
const SUN_GLIDE_BEATS = 1.5;
interface SunDay { date: string; tz: number }
interface SunState { clock: number; sun: SunAngles | null; dissolve: number } // sun: the interpolated position during a glide, else null (the page computes it from the day and the clock). dissolve: a counter the page watches — each increment is a change of day made while playing, to be shown as a dissolve of the rendered sky rather than a glide (D-32).
function useSunTransition(target: number, sunDay: SunDay | null, playing: boolean): SunState {
  const [state, setState] = useState<SunState>({ clock: target, sun: null, dissolve: 0 });
  const dissolveRef = useRef(0);
  const clockRef = useRef(target);
  const sunRef = useRef<SunAngles | null>(null); // where the sun is right now, kept so a second change can start from it
  const targetRef = useRef(target);
  targetRef.current = target;
  const seenRef = useRef<SunDay | null>(null);
  const glideRef = useRef<{ from: SunAngles; fromClock: number; start: number; ms: number } | null>(null);
  useEffect(() => {
    if (!sunDay) return; // a day is loading: hold
    const key = (d: SunDay | null) => (d ? `${d.date}|${d.tz}` : "");
    if (key(sunDay) !== key(seenRef.current)) {
      const prev = seenRef.current;
      seenRef.current = sunDay;
      if (prev && playing) {
        // Playing: the target keeps moving, so a glide bends toward a moving point. Cut instead — the page dissolves the last rendered frame over the new sky.
        glideRef.current = null;
        dissolveRef.current += 1;
      } else if (prev) {
        const from = sunRef.current ?? sunAnglesAt(prev.date, clockRef.current, NYC_LAT, NYC_LON, prev.tz);
        glideRef.current = { from, fromClock: clockRef.current, start: performance.now(), ms: motion.beatMs * SUN_GLIDE_BEATS };
      }
    }
    const shortest = (from: number, to: number, period: number) => { let d = (to - from) % period; if (d > period / 2) d -= period; if (d < -period / 2) d += period; return d; };
    const run = glideRef.current;
    if (!run) { clockRef.current = target; sunRef.current = null; setState({ clock: target, sun: null, dissolve: dissolveRef.current }); return; }
    let raf = 0;
    const tick = (now: number) => {
      const g = glideRef.current;
      if (!g) return;
      const t = Math.min(1, (now - g.start) / g.ms);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const to = sunAnglesAt(sunDay.date, targetRef.current, NYC_LAT, NYC_LON, sunDay.tz); // re-read: the target may be moving
      // The path is planned in the camera's screen space (sunPath.ts, D-33): straight on screen while visible, angles while unseen. The sky box fills the viewport, so its aspect is the viewport's.
      const sun = sunAlongPath(g.from, to, e, { facingDeg: CAMERA_FACING === "south" ? 180 : 0, aspect: window.innerWidth / Math.max(1, window.innerHeight) });
      const clock = ((g.fromClock + shortest(g.fromClock, targetRef.current, 24) * e) % 24 + 24) % 24;
      clockRef.current = clock;
      sunRef.current = sun;
      setState({ clock, sun, dissolve: dissolveRef.current });
      if (t < 1) { raf = requestAnimationFrame(tick); return; }
      glideRef.current = null;
      clockRef.current = targetRef.current;
      sunRef.current = null;
      setState({ clock: targetRef.current, sun: null, dissolve: dissolveRef.current });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, sunDay]);
  return state;
}

function useEasedHour(target: number, running: boolean): number {
  const [value, setValue] = useState(target);
  const heldRef = useRef(target);
  useEffect(() => {
    if (!Number.isFinite(target)) { warnOnce("playhead target"); return; } // never let a NaN into the eased state: it would never come back
    if (!running) {
      // At rest or paused: glide to the target over half a beat rather than jump. Linear, in the direction of the seek: the transport position is a line from hour 0 to 23, not a circle, so a scrub from 23 to 8 runs back through the afternoon rather than wrapping through midnight (the playhead would appear to jump to the start, and the clock would follow it).
      const from = heldRef.current;
      const to = target % 24;
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
