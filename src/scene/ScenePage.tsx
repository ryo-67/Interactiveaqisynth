// ScenePage — the /scene prototype (D-19 task 2): one full-bleed scene, the existing engine and sound, a minimal glass transport, and nothing else. Dev-only day select and state readout behind ?dev=1. The deployed / page is untouched.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Scene } from "./Scene";
import { Transport } from "./Transport";
import { SynthEngine, type BeatInfo, type Day } from "../engine/SynthEngine";
import type { PollutantAnchors } from "../engine/contour";
import { getCurrentAll, getAnchors, getDay, type Borough } from "../utils/nycOpenData";
import { GLASS, families, typeScale, space } from "../utils/theme";
import { TIER_NAMES } from "../content";

const DEV = new URLSearchParams(window.location.search).has("dev");

const DAY_OPTIONS = [
  { key: "live", label: "Live: NYC (last 24 h)" },
  { key: "2023-10-29", label: "Oct 29, cleanest" },
  { key: "2023-07-12", label: "Jul 12, ozone" },
  { key: "2023-02-09", label: "Feb 9, rush hour" },
  { key: "2023-06-07", label: "Jun 7, the smoke" },
];

export default function ScenePage() {
  const [dayKey, setDayKey] = useState("live");
  const [day, setDay] = useState<Day | null>(null);
  const [anchors, setAnchors] = useState<PollutantAnchors | null>(null);
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState<BeatInfo | null>(null);
  const [volume, setVolume] = useState(0.65);
  const [devStartHour, setDevStartHour] = useState(14);

  const engineRef = useRef<SynthEngine | null>(null);
  const pulseFlashRef = useRef(0);
  const frameTimes = useRef<number[]>([]);

  useEffect(() => {
    // Glass parameters flow from theme.ts into CSS custom properties; index.css holds the material and its fallbacks.
    const root = document.documentElement.style;
    root.setProperty("--glass-blur", GLASS.blur);
    root.setProperty("--glass-saturate", GLASS.saturate);
    root.setProperty("--glass-fill-alpha", String(GLASS.fillAlpha));
    root.setProperty("--glass-edge-alpha", String(GLASS.edgeAlpha));
    root.setProperty("--glass-fill-alpha-opaque", String(GLASS.fillAlphaOpaque));
    root.setProperty("--glass-blur-opaque", GLASS.blurOpaque);
  }, []);

  // Load the selected day: live NYC (Citywide + archive anchors) or a Queens archive day (Queens anchors).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (dayKey === "live") {
          const [snap, a] = await Promise.all([getCurrentAll(), getAnchors("Citywide" as Borough)]);
          if (cancelled) return;
          setDay(snap.series.Citywide.hours);
          setAnchors(a);
        } else {
          const [series, a] = await Promise.all([getDay("Queens", dayKey), getAnchors("Queens")]);
          if (cancelled) return;
          setDay(series.hours);
          setAnchors(a);
        }
      } catch (err) {
        console.warn("[Scene] day load failed:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dayKey]);

  useEffect(() => {
    const engine = engineRef.current ?? (engineRef.current = new SynthEngine({ pm25: { p05: 0, p95: 1 }, o3: { p05: 0, p95: 1 }, no2: { p05: 0, p95: 1 } }));
    if (day && anchors) {
      engine.setStartHour(DEV ? devStartHour : 0);
      engine.setDay(day, anchors);
    }
  }, [day, anchors, devStartHour]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.onBeat(setBeat);
    engine.onPulse(() => {
      pulseFlashRef.current = performance.now();
    });
    return () => {
      engine.onBeat(null);
      engine.onPulse(null);
    };
  }, []);

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
    engineRef.current?.setVolume(20 * Math.log10(Math.max(0.001, volume)));
  }, [volume]);

  const togglePlay = useCallback(() => {
    void engineRef.current?.init();
    setPlaying((p) => !p);
  }, []);

  // Rest-state hour: the dev start hour, else the day's latest hour (live "now").
  const restHour = useMemo(() => {
    if (!day) return 0;
    if (DEV) return Math.min(devStartHour, day.length - 1);
    return day.length - 1;
  }, [day, devStartHour]);

  // Frame-time sampler for the O-14 report (dev only).
  const onFrame = useMemo(() => {
    if (!DEV) return undefined;
    return (dt: number) => {
      const arr = frameTimes.current;
      arr.push(dt);
      if (arr.length > 600) arr.shift();
      (window as unknown as Record<string, unknown>).__frameStats = () => {
        const sorted = [...arr].sort((a, b) => a - b);
        const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
        return { mean: mean.toFixed(2), p99: sorted[Math.floor(sorted.length * 0.99)]?.toFixed(2), n: arr.length };
      };
    };
  }, []);

  return (
    <div onClick={togglePlay} style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#000" }}>
      {day && anchors && (
        <Scene day={day} anchors={anchors} beat={beat} restHour={restHour} pulseFlashRef={pulseFlashRef} onFrame={onFrame} />
      )}
      <Transport playing={playing} onToggle={togglePlay} volume={volume} onVolume={setVolume} />
      {DEV && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: space.sm,
            left: space.sm,
            fontFamily: families.data,
            fontSize: typeScale.micro.size,
            color: "rgba(255,255,255,0.75)",
            background: "rgba(0,0,0,0.4)",
            padding: space.xs,
          }}
        >
          <select value={dayKey} onChange={(e) => setDayKey(e.target.value)}>
            {DAY_OPTIONS.map((d) => (
              <option key={d.key} value={d.key}>{d.label}</option>
            ))}
          </select>
          <label style={{ marginLeft: "8px" }}>
            start&nbsp;
            <input type="number" min={0} max={23} value={devStartHour} style={{ width: "44px" }}
              onChange={(e) => setDevStartHour(Math.min(23, Math.max(0, Number(e.target.value))))} />
          </label>
          <div>
            {beat
              ? `hour ${beat.hour} · ${TIER_NAMES[beat.tierIndex]} · k=${beat.k ?? "—"}`
              : `rest · hour ${restHour}`}
          </div>
        </div>
      )}
    </div>
  );
}
