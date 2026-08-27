import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AQIVisualizer } from "./components/AQIVisualizer";
import { TimelineScrubber } from "./components/TimelineScrubber";
import { SynthEngine } from "./engine/SynthEngine";
import { PHASE0_DAYS, QUEENS_2023_ANCHORS } from "./fixtures/phase0-days";
import { AQIInfo } from "./components/AQIInfo";
import { ShareModal } from "./components/ShareModal";
import { RecordButton } from "./components/RecordButton";
import {
  generateMockAQIData,
  type AQIDataPoint,
} from "./utils/mockData";
import {
  ThemeContext,
  themeColors,
  type Theme,
} from "./utils/theme";
import {
  getLast24h,
  getAnchors,
  type Borough,
  type DataSource,
  type DaySeries,
} from "./utils/nycOpenData";
import type { PollutantAnchors } from "./engine/contour";

export default function App() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTimelapse, setIsTimelapse] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const [volume, setVolume] = useState(0.65);
  const [showShare, setShowShare] = useState(false);

  // Phase 0 engine behind the existing play/pause, fed by hardcoded fixture days until the sprint-2 data pipeline lands. Queens 2023 anchors apply to all six fixtures (known gap to SON-03).
  const engineRef = useRef<SynthEngine | null>(null);
  if (engineRef.current === null) {
    engineRef.current = new SynthEngine(QUEENS_2023_ANCHORS);
  }
  const [selectedDayKey, setSelectedDayKey] = useState("live");

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (isPlaying) void engine.play();
    else engine.stop();
  }, [isPlaying]);

  useEffect(() => {
    // App volume is 0..1; the engine speaks dB at the destination.
    engineRef.current?.setVolume(20 * Math.log10(Math.max(0.001, volume)));
  }, [volume]);

  useEffect(() => {
    // Dev-only handle for headless verification of the per-beat callback; not UI.
    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>).__engine = engineRef.current;
    }
  }, []);

  // NYC borough data
  const [selectedBorough, setSelectedBorough] =
    useState<Borough>("Citywide");
  const [dataSource, setDataSource] =
    useState<DataSource>("loading");

  // Live last-24h series + archive anchors for the engine (sprint 2). Nothing else loads until asked (BUG-20).
  const [liveSeries, setLiveSeries] = useState<DaySeries | null>(null);
  const [liveAnchors, setLiveAnchors] = useState<PollutantAnchors | null>(null);

  // Feed the engine: live last-24h (with archive anchors, §3.10) by default; the Phase 0 fixtures stay as a dev convenience with their Queens 2023 anchors.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (selectedDayKey === "live") {
      if (liveSeries && liveAnchors) engine.setDay(liveSeries.hours, liveAnchors);
    } else {
      const fixture = PHASE0_DAYS.find((d) => d.key === selectedDayKey);
      if (fixture) engine.setDay(fixture.day, QUEENS_2023_ANCHORS);
    }
  }, [selectedDayKey, liveSeries, liveAnchors]);


  // Fallback mock data
  const mockData = useRef(generateMockAQIData());

  // ——— First paint loads only the last 24 hours (UX-01, fixes BUG-20). The page renders immediately; the engine gets real data when it lands.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [series, anchors] = await Promise.all([
          getLast24h("Citywide"),
          getAnchors("Citywide"),
        ]);
        if (cancelled) return;
        setLiveSeries(series);
        setLiveAnchors(anchors);
        setDataSource("live");
      } catch (err) {
        console.warn("[App] Live fetch failed, engine stays on fixtures:", err);
        if (!cancelled) setDataSource("mock");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ——— Timeline and map still render the mock flow; the real page is sprint 3. The engine, not these visuals, carries the live data this sprint.
  const timelineData = useMemo(() => mockData.current, []);

  const latestByBorough = useMemo(() => {
    const latest = mockData.current[mockData.current.length - 1];
    return {
      Citywide: latest,
      Manhattan: null,
      Brooklyn: null,
      Queens: null,
      Bronx: null,
      "Staten Island": null,
    } as Record<Borough, AQIDataPoint | null>;
  }, []);

  const currentData =
    timelineData[
      Math.min(currentIndex, timelineData.length - 1)
    ] || timelineData[0];
  const c = themeColors(theme);

  const ensureInteracted = useCallback(() => {
    // Tone.start() must run inside the user-gesture call stack, not in the effect that reacts to isPlaying — init here, play there.
    void engineRef.current?.init();
    if (!hasInteracted) {
      setHasInteracted(true);
      setIsPlaying(true);
    }
  }, [hasInteracted]);

  const handlePlayToggle = useCallback(() => {
    void engineRef.current?.init();
    if (!hasInteracted) {
      setHasInteracted(true);
      setIsPlaying(true);
      return;
    }
    setIsPlaying((prev) => !prev);
  }, [hasInteracted]);

  const handleTimelapseToggle = useCallback(() => {
    ensureInteracted();
    setIsTimelapse((prev) => !prev);
    if (!isPlaying) setIsPlaying(true);
  }, [ensureInteracted, isPlaying]);

  const handleIndexChange = useCallback(
    (index: number) => {
      ensureInteracted();
      setCurrentIndex(index);
    },
    [ensureInteracted],
  );

  const handleBoroughSelect = useCallback((b: Borough) => {
    setSelectedBorough(b);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      switch (e.code) {
        case "Space":
          e.preventDefault();
          handlePlayToggle();
          break;
        case "ArrowLeft":
          e.preventDefault();
          setCurrentIndex((prev) => {
            ensureInteracted();
            return Math.max(0, prev - 1);
          });
          break;
        case "ArrowRight":
          e.preventDefault();
          setCurrentIndex((prev) => {
            ensureInteracted();
            return Math.min(timelineData.length - 1, prev + 1);
          });
          break;
        case "KeyT":
          handleTimelapseToggle();
          break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () =>
      window.removeEventListener("keydown", handleKey);
  }, [
    handlePlayToggle,
    handleTimelapseToggle,
    ensureInteracted,
    timelineData.length,
  ]);

  // Data source label for UI
  const sourceLabel = useMemo(() => {
    if (dataSource === "loading") return "Connecting...";
    if (dataSource === "mock") return "Demo data";
    if (liveSeries?.fallback === "zipcode") return "AirNow area reading";
    return "AirNow (live)";
  }, [dataSource, liveSeries]);

  return (
    <ThemeContext.Provider value={theme}>
      {/* ——— Main App ——— */}
      <div
        className="min-h-screen flex flex-col transition-colors duration-700"
        style={{ background: c.bg, color: c.textPrimary }}
      >
        {/* Hero Visualization — canvas + AQI number + borough map */}
        <div className="relative flex-1">
          <AQIVisualizer
            aqi={currentData.aqi}
            isPlaying={isPlaying || !hasInteracted}
            selectedBorough={selectedBorough}
            onSelectBorough={handleBoroughSelect}
            latestData={latestByBorough}
          />

          {/* Header overlay */}
          <div className="absolute top-0 left-0 right-0 p-5 pointer-events-none">
            <div className="flex items-start justify-between">
              <div>
                <h1
                  style={{
                    fontFamily:
                      'Georgia, "Times New Roman", serif',
                    fontStyle: "italic",
                    fontSize: "14px",
                    fontWeight: 400,
                    letterSpacing: "0.02em",
                    color: c.canvasOverlaySub,
                  }}
                >
                  {selectedBorough !== "Citywide"
                    ? `${selectedBorough}, `
                    : ""}
                  NYC Air Quality
                </h1>
                <p
                  style={{
                    fontSize: "10px",
                    color: c.canvasOverlaySub,
                    marginTop: "2px",
                    opacity: 0.6,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  Sonification{" "}
                  {dataSource === "live" ? "\u00b7 Live data" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 pointer-events-auto">
                <button
                  onClick={() =>
                    setTheme((t) =>
                      t === "dark" ? "light" : "dark",
                    )
                  }
                  className="p-2 rounded-full transition-all duration-300"
                  style={{
                    background: c.btnBg,
                    border: `1px solid ${c.border}`,
                    backdropFilter: "blur(8px)",
                  }}
                  title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                >
                  {theme === "dark" ? (
                    <Sun
                      className="w-3.5 h-3.5"
                      style={{ color: c.canvasOverlaySub }}
                    />
                  ) : (
                    <Moon
                      className="w-3.5 h-3.5"
                      style={{ color: c.canvasOverlaySub }}
                    />
                  )}
                </button>
                {!hasInteracted && (
                  <div
                    className="cursor-pointer animate-pulse"
                    onClick={() => {
                      setHasInteracted(true);
                      setIsPlaying(true);
                    }}
                    style={{
                      fontSize: "11px",
                      fontFamily: "Georgia, serif",
                      fontStyle: "italic",
                      color: c.canvasOverlaySub,
                    }}
                  >
                    click to listen
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pollutant info at bottom of hero */}
          <div className="absolute bottom-0 left-0 right-0 p-5 pointer-events-none">
            <AQIInfo data={currentData} />
          </div>
        </div>

        {/* Control panel */}
        <div
          className="relative z-10 transition-colors duration-700"
          style={{
            background: c.bgPanel,
            backdropFilter: "blur(30px)",
            borderTop: `1px solid ${c.borderSubtle}`,
          }}
        >
          <div className="max-w-2xl mx-auto px-5 pt-6 pb-4 space-y-5">
            {/* Temporary fixture selector so the Phase 0 engine port can be heard in the app (sprint 1). Replaced by real data flow in sprint 2; no styling by design. */}
            <select
              value={selectedDayKey}
              onChange={(e) => setSelectedDayKey(e.target.value)}
            >
              <option value="live">
                {liveSeries
                  ? "Live: NYC (last 24 h)"
                  : dataSource === "mock"
                    ? "Live: NYC (unavailable)"
                    : "Live: NYC (loading...)"}
              </option>
              {PHASE0_DAYS.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label} (fixture)
                </option>
              ))}
            </select>

            <div
              style={{
                height: "1px",
                background: c.borderSubtle,
              }}
            />

            {/* Timeline + controls */}
            <div className="space-y-3">
              <TimelineScrubber
                data={timelineData}
                currentIndex={currentIndex}
                onIndexChange={handleIndexChange}
                isPlaying={isPlaying}
                onPlayToggle={handlePlayToggle}
                isTimelapse={isTimelapse}
                onTimelapseToggle={handleTimelapseToggle}
                onShare={() => setShowShare(true)}
              />

              <div className="flex items-center justify-between">
                <RecordButton
                  isPlaying={isPlaying}
                  durationSec={12}
                />
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      fontSize: "9px",
                      color: c.textFaint,
                      opacity: 0.6,
                    }}
                  >
                    {sourceLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Share modal */}
        {showShare && (
          <ShareModal
            data={currentData}
            isTimelapse={isTimelapse}
            onClose={() => setShowShare(false)}
            borough={selectedBorough}
          />
        )}
      </div>
    </ThemeContext.Provider>
  );
}