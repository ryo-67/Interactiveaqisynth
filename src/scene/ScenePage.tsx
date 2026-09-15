// ScenePage — /scene, the Listen page as the scene (D-19, §5). The sky is a pure function of two things the engine already emits every beat: the hour under the playhead and the smoothed normalized PM2.5. Sun elevation comes from the hour; the model cross-fade, exposure, stars and the plume all follow from those two numbers. Nothing here re-derives a mapping the harness did not judge.
// Shares useListenSession with the typographic page, so both play the same data through the same engine; this page replaces that one once it passes review.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { SkyView, type CameraFacing, type SkyProbe } from "./SkyView";
import { SmokeLayer } from "./SmokeLayer";
import { skyParamsFor, starOpacity } from "./skyParams";
import { sunAnglesAt, sunPositionVector, tzOffsetFromTs } from "./solar";
import { useListenSession, DEV } from "./useListenSession";
import { Glass, type GlassTone } from "../components/Glass";
import { Transport } from "../components/Transport";
import { BoroughToggle } from "../components/BoroughToggle";
import { AQINumber } from "../components/AQINumber";
import { MoodLine } from "../components/MoodLine";
import { Graph, TRACK_ORDER, type TrackKey } from "../components/Graph";
import { DayNav } from "../components/DayNav";
import { SourceLine } from "../components/SourceLine";
import { PHASE0_DAYS } from "../fixtures/phase0-days";
import { ThemeContext, GLASS, HOSEK_ALBEDO, CAMERA_FACING, NYC_LAT, NYC_LON, SMOKE, space } from "../utils/theme";
import { STATUS_LIVE, STATUS_ARCHIVE } from "../content";

// The camera faces south (D-22, CAMERA_FACING) and the sun disc is on; its size is the token, under benchmark in the harness. Dev URL params can override both for comparison.
const qs = new URLSearchParams(window.location.search);
const DISC = qs.get("disc") !== "0";
const FACING = (qs.get("facing") ?? CAMERA_FACING) as CameraFacing;

// The graph's active tab lives in the URL so a view can be sent: ?tab=o3
function tabFromUrl(): TrackKey {
  const t = qs.get("tab") as TrackKey | null;
  return t && TRACK_ORDER.includes(t) ? t : "aqi";
}

// Adaptive glass: each panel samples the rendered sky under its own rectangle a few times a second and chooses its tone with hysteresis (GLASS.toLightAbove / toDarkBelow). The probe reads the sky only; the composited plume sits above it, so its brightening is added analytically from the same tokens that draw it.
const PANELS = ["borough", "nav", "hero", "graph", "transport", "source"] as const;
type PanelKey = (typeof PANELS)[number];
function useAdaptiveGlass(probeRef: React.MutableRefObject<SkyProbe | null>, smoke: number) {
  const refs = useRef<Record<PanelKey, HTMLDivElement | null>>({ borough: null, nav: null, hero: null, graph: null, transport: null, source: null });
  const [tones, setTones] = useState<Record<PanelKey, GlassTone>>({ borough: "dark", nav: "dark", hero: "dark", graph: "dark", transport: "dark", source: "dark" });
  const smokeRef = useRef(smoke);
  smokeRef.current = smoke;
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const probe = probeRef.current;
      if (!probe) return;
      const rects = PANELS.map((k) => {
        const el = refs.current[k];
        if (!el) return { x: 0, y: 0, w: 0, h: 0 };
        const r = el.getBoundingClientRect(); // the canvas fills the viewport, so viewport coordinates are canvas coordinates
        return { x: r.left, y: r.top, w: r.width, h: r.height };
      });
      const samples = await probe.sample(rects);
      if (!alive) return;
      const d = smokeRef.current;
      setTones((prev) => {
        const next = { ...prev };
        PANELS.forEach((k, i) => {
          const L = samples[i];
          if (L == null) return;
          // The plume's in-scatter term lightens what is behind it; approximate its lightness contribution from the token that draws it.
          const adj = L * (1 - SMOKE.attenuation.alphaMax * d * 0.5) + SMOKE.inscatter.lightness.zenith * SMOKE.inscatter.alphaMax * d;
          next[k] = prev[k] === "dark" ? (adj > GLASS.toLightAbove ? "light" : "dark") : adj < GLASS.toDarkBelow ? "dark" : "light";
        });
        return PANELS.every((k) => next[k] === prev[k]) ? prev : next;
      });
    };
    const id = setInterval(tick, GLASS.sampleEveryMs);
    void tick();
    return () => { alive = false; clearInterval(id); };
  }, [probeRef]);
  return { refs, tones };
}

export default function ScenePage() {
  const s = useListenSession();
  const { day, beat, playing, channels } = s;
  const hour = s.playheadHour; // the one clock: sun, playhead and graph all read it

  const [tab, setTab] = useState<TrackKey>(tabFromUrl);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    p.set("tab", tab);
    window.history.replaceState(null, "", `?${p}`);
  }, [tab]);

  const probeRef = useRef<SkyProbe | null>(null);

  const view = useMemo(() => {
    const firstTs = day?.[0]?.ts ?? "2023-07-12T00:00:00-04:00";
    const date = firstTs.slice(0, 10);
    const ang = sunAnglesAt(date, hour, NYC_LAT, NYC_LON, tzOffsetFromTs(firstTs));
    // MAPPING (PM2.5 → aerosol path, O3 → rayleigh + bloom, clock → exposure + fade): skyParamsFor is the one mapping, shared with the harness.
    const params = skyParamsFor(channels.pm25, channels.o3, ang.elevationDeg);
    // MAPPING (PM2.5 → plume density): the engine's own smoothed value while playing (§5.2: the scene never re-derives the smoothing); the latest hour's normalized value at rest.
    const smoke = beat?.pm25nSmoothed ?? channels.pm25 ?? 0;
    return { params, sun: sunPositionVector(ang), stars: starOpacity(ang.elevationDeg, channels.pm25), smoke };
  }, [day, hour, channels.pm25, channels.o3, beat?.pm25nSmoothed]);

  const { refs, tones } = useAdaptiveGlass(probeRef, view.smoke);

  const lastTs = day?.[day.length - 1]?.ts ?? null;
  const dateLabel = lastTs ? new Date(lastTs).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
  const hourLabel = lastTs ? lastTs.slice(11, 16) : "—";

  // Glass parameters as custom properties, once, at the root (§5.6: theme.ts is the source of truth; index.css reads these).
  const glassVars = {
    "--glass-blur": GLASS.blur, "--glass-saturate": GLASS.saturate, "--glass-fill-alpha": String(GLASS.fillAlpha),
    "--glass-fill-dark": GLASS.fillDark, "--glass-fill-light": GLASS.fillLight,
    "--glass-edge-alpha": String(GLASS.edgeAlpha), "--glass-fill-alpha-opaque": String(GLASS.fillAlphaOpaque), "--glass-blur-opaque": GLASS.blurOpaque,
    "--frosted-blur": GLASS.frostedBlur, "--frosted-fill-alpha": String(GLASS.frostedFillAlpha), "--glass-transition": `${GLASS.transitionMs}ms`,
  } as React.CSSProperties;

  return (
    <ThemeContext.Provider value="dark">
      <div style={{ position: "fixed", inset: 0, background: "#05050a", ...glassVars }}>
        {/* The scene: renders continuously while playing, on demand at rest. */}
        <div style={{ position: "absolute", inset: 0 }}>
          <SkyView params={view.params} sunPosition={view.sun} starOpacity={view.stars} albedo={HOSEK_ALBEDO} disc={DISC} facing={FACING} hour={hour} probeRef={probeRef} live={playing} style={{ width: "100%", height: "100%" }} />
          <SmokeLayer density={view.smoke} />
        </div>

        {/* Panels: one centered column over the scene (§5.7). The column itself passes pointer events through to nothing; only the panels catch them. */}
        <div style={{ position: "absolute", inset: 0, overflowY: "auto", overflowX: "hidden", pointerEvents: "none" }}>
          <div style={{ maxWidth: "720px", margin: "0 auto", padding: `${space.md} ${space.md} calc(${space.xl} + env(safe-area-inset-bottom))`, display: "flex", flexDirection: "column", gap: space.md, minWidth: 0 }}>
            <Glass ref={(el) => { refs.current.borough = el; }} tone={tones.borough} material="glass" style={{ pointerEvents: "auto", width: "100%", padding: `${space.sm} ${space.md}`, borderRadius: 20 }}>
              <BoroughToggle selected={s.borough} onSelect={s.setBorough} dateLabel={dateLabel} hourLabel={hourLabel} status={s.live ? STATUS_LIVE : STATUS_ARCHIVE} />
            </Glass>

            <Glass ref={(el) => { refs.current.nav = el; }} tone={tones.nav} material="glass" style={{ pointerEvents: "auto", width: "100%", padding: `${space.sm} ${space.md}`, borderRadius: 20 }}>
              <DayNav date={s.date} onChange={s.setDate} loading={s.dayLoading} />
            </Glass>

            <Glass ref={(el) => { refs.current.hero = el; }} tone={tones.hero} material="frosted" style={{ pointerEvents: "auto", width: "100%", padding: `${space.lg} ${space.lg} ${space.md}` }}>
              <AQINumber value={s.displayAqi} />
              <div style={{ marginTop: space.md }}>
                <MoodLine tierIndex={s.moodTier} hour={s.moodHour} dominant={s.dominant} />
              </div>
            </Glass>

            {day && day.length > 0 && (
              <Glass ref={(el) => { refs.current.graph = el; }} tone={tones.graph} material="frosted" style={{ pointerEvents: "auto", width: "100%", padding: space.md }}>
                <Graph
                  day={day}
                  anchors={s.anchors}
                  playheadHour={playing ? hour : null}
                  live={s.live}
                  tab={tab}
                  onTab={setTab}
                  subscribePulse={s.subscribePulse}
                  onToggle={s.togglePlay}
                />
              </Glass>
            )}

            <Glass ref={(el) => { refs.current.transport = el; }} tone={tones.transport} material="glass" style={{ pointerEvents: "auto", alignSelf: "flex-start" }}>
              <Transport playing={playing} onToggle={s.togglePlay} onVolume={s.setVolume} />
            </Glass>

            {day && day.length > 0 && (
              <Glass ref={(el) => { refs.current.source = el; }} tone={tones.source} material="frosted" style={{ pointerEvents: "auto", width: "100%", padding: `${space.sm} ${space.md}` }}>
                <SourceLine borough={s.borough} hours={day} fallback={s.snapshot?.fallback ?? null} />
              </Glass>
            )}

            {DEV && (
              <select value={s.devDayKey} onChange={(e) => s.setDevDayKey(e.target.value)} style={{ pointerEvents: "auto", alignSelf: "flex-start" }}>
                <option value="live">Live: NYC (last 24 h)</option>
                {PHASE0_DAYS.map((d) => (
                  <option key={d.key} value={d.key}>{d.label} (fixture)</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>
    </ThemeContext.Provider>
  );
}
