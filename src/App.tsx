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
  fetchCurrentAQI,
  preloadAllHistorical,
  warmupEdgeFunction,
  runDiagnostic,
  type Borough,
  type DataSource,
} from "./utils/nycOpenData";

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
  const [fixtureKey, setFixtureKey] = useState(PHASE0_DAYS[0].key);

  useEffect(() => {
    const fixture = PHASE0_DAYS.find((d) => d.key === fixtureKey);
    if (fixture) engineRef.current?.setDay(fixture.day);
  }, [fixtureKey]);

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
  const [currentBoroughData, setCurrentBoroughData] =
    useState<Record<Borough, AQIDataPoint | null> | null>(null);
  const [historicalCache, setHistoricalCache] = useState<
    Record<string, AQIDataPoint[]>
  >({});
  const [dataSource, setDataSource] =
    useState<DataSource>("loading");

  // Global loading state
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(
    "Waking up the server...",
  );
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingError, setLoadingError] = useState<string | null>(
    null,
  );
  const [showSkip, setShowSkip] = useState(false);

  // Fallback mock data
  const mockData = useRef(generateMockAQIData());

  // Show "skip" button after 12 seconds
  useEffect(() => {
    if (initialLoadDone) return;
    const timer = setTimeout(() => setShowSkip(true), 12000);
    return () => clearTimeout(timer);
  }, [initialLoadDone]);

  // ——— Single initial load: warmup → current AQI → all historical ———
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Phase 1: Warmup
      setLoadingPhase("Waking up the server...");
      setLoadingProgress(5);
      const warm = await warmupEdgeFunction();
      if (cancelled) return;
      console.log(
        `[App] Edge Function warmup: ${warm ? "ready" : "slow/failed, continuing"}`,
      );
      setLoadingProgress(10);

      // Phase 2: Current AQI (fast, AirNow)
      setLoadingPhase("Fetching current air quality...");
      try {
        const data = await fetchCurrentAQI();
        if (cancelled) return;
        setCurrentBoroughData(data);
        setDataSource("live-current");
        setLoadingProgress(20);
        console.log("[App] Current AQI loaded from AirNow");
      } catch (err) {
        console.warn(
          "[App] Current AQI fetch failed, using mock:",
          err,
        );
        if (!cancelled) setDataSource("mock");
      }
      if (cancelled) return;

      // Phase 3: Historical data for ALL boroughs (EPA AQS)
      // After first successful run, server's KV cache makes this near-instant.
      setLoadingPhase("Loading EPA historical data...");
      try {
        const result = await preloadAllHistorical(
          (borough, index, total) => {
            if (cancelled) return;
            setLoadingPhase(
              `Loading history: ${borough} (${index + 1}/${total})`,
            );
            setLoadingProgress(
              20 + ((index + 1) / total) * 75,
            );
          },
        );

        if (cancelled) return;

        if (Object.keys(result).length > 0) {
          setHistoricalCache(result);
          setDataSource("live-historical");
          console.log(
            `[App] All historical data loaded: ${Object.keys(result).join(", ")}`,
          );
        } else {
          console.warn(
            "[App] No historical data from any borough",
          );
          setLoadingError(
            "EPA historical data unavailable. Using current AQI only.",
          );
          // Run diagnostic in background
          runDiagnostic().then((diag) =>
            console.log("[App] EPA diagnostic:", diag),
          );
        }
      } catch (err) {
        console.warn("[App] Historical preload failed:", err);
        if (!cancelled) {
          setLoadingError(
            "EPA historical data unavailable. Using current AQI only.",
          );
        }
      }

      if (cancelled) return;

      setLoadingProgress(100);
      setLoadingPhase("Ready");
      // Brief pause for smooth transition
      await new Promise((r) => setTimeout(r, 400));
      if (!cancelled) setInitialLoadDone(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Allow skipping the loading overlay
  const handleSkipLoading = useCallback(() => {
    setInitialLoadDone(true);
  }, []);

  // ——— Timeline data: prefer historical, fall back to current-only or mock ———
  const timelineData = useMemo(() => {
    const historical = historicalCache[selectedBorough];
    if (historical && historical.length > 0) {
      // Append current reading as the final point if newer
      const current = currentBoroughData?.[selectedBorough];
      if (current) {
        const lastHistDate =
          historical[historical.length - 1]?.date;
        if (lastHistDate !== current.date) {
          return [...historical, current];
        }
      }
      return historical;
    }

    // Fallback: single current reading
    const current = currentBoroughData?.[selectedBorough];
    if (current) return [current];

    // Last resort: mock data
    return mockData.current;
  }, [historicalCache, selectedBorough, currentBoroughData]);

  // ——— Latest data per borough for map coloring ———
  const latestByBorough = useMemo(() => {
    if (currentBoroughData) return currentBoroughData;
    const latest =
      mockData.current[mockData.current.length - 1];
    return {
      Citywide: latest,
      Manhattan: null,
      Brooklyn: null,
      Queens: null,
      Bronx: null,
      "Staten Island": null,
    } as Record<Borough, AQIDataPoint | null>;
  }, [currentBoroughData]);

  // Reset index to most recent when timeline changes
  useEffect(() => {
    setCurrentIndex(Math.max(0, timelineData.length - 1));
  }, [timelineData]);

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
    const hasHistory =
      historicalCache[selectedBorough]?.length > 0;
    if (hasHistory) return "AirNow + EPA AQS";
    return "AirNow (live)";
  }, [dataSource, historicalCache, selectedBorough]);

  // Count how many boroughs have historical data
  const loadedBoroughCount = useMemo(
    () =>
      Object.keys(historicalCache).filter(
        (k) => historicalCache[k]?.length > 0,
      ).length,
    [historicalCache],
  );

  return (
    <ThemeContext.Provider value={theme}>
      {/* ——— Global Loading Overlay ——— */}
      <AnimatePresence>
        {!initialLoadDone && (
          <motion.div
            key="loading-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
            style={{ background: c.bg }}
          >
            <div className="text-center space-y-6 px-6 max-w-sm">
              {/* Title */}
              <div>
                <h1
                  style={{
                    fontFamily:
                      'Georgia, "Times New Roman", serif',
                    fontStyle: "italic",
                    fontSize: "28px",
                    fontWeight: 400,
                    color: c.textPrimary,
                    lineHeight: 1.3,
                  }}
                >
                  NYC Air Quality
                </h1>
                <p
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: c.textMuted,
                    marginTop: "6px",
                  }}
                >
                  Sonification
                </p>
              </div>

              {/* Phase description */}
              <p
                style={{
                  fontSize: "13px",
                  color: c.textSecondary,
                  fontFamily: "Georgia, serif",
                  fontStyle: "italic",
                  lineHeight: 1.5,
                  minHeight: "20px",
                }}
              >
                {loadingPhase}
              </p>

              {/* Progress bar */}
              <div className="space-y-2">
                <div
                  className="w-56 h-0.5 rounded-full mx-auto overflow-hidden"
                  style={{ background: c.sliderTrack }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: c.sliderFill }}
                    initial={{ width: "0%" }}
                    animate={{
                      width: `${loadingProgress}%`,
                    }}
                    transition={{
                      duration: 0.5,
                      ease: "easeOut",
                    }}
                  />
                </div>
                <p
                  className="tabular-nums"
                  style={{
                    fontSize: "10px",
                    color: c.textFaint,
                  }}
                >
                  {Math.round(loadingProgress)}%
                </p>
              </div>

              {/* Error message */}
              {loadingError && (
                <p
                  style={{
                    fontSize: "11px",
                    color:
                      theme === "dark"
                        ? "rgba(255,160,140,0.7)"
                        : "rgba(180,60,40,0.6)",
                    fontStyle: "italic",
                  }}
                >
                  {loadingError}
                </p>
              )}

              {/* Skip button */}
              {showSkip && (
                <motion.button
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  onClick={handleSkipLoading}
                  className="px-4 py-2 rounded-full transition-all duration-200 hover:opacity-80"
                  style={{
                    fontSize: "11px",
                    fontFamily: "Georgia, serif",
                    fontStyle: "italic",
                    color: c.textMuted,
                    background: c.bgSurface,
                    border: `1px solid ${c.border}`,
                  }}
                >
                  Continue with available data
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                  {dataSource !== "mock" &&
                  dataSource !== "loading"
                    ? "\u00b7 Live data"
                    : ""}
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
              value={fixtureKey}
              onChange={(e) => setFixtureKey(e.target.value)}
            >
              {PHASE0_DAYS.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
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
                    {loadedBoroughCount > 0 &&
                      ` \u00b7 ${loadedBoroughCount} boroughs cached`}
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