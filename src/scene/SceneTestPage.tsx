// SceneTestPage — /scene-test?dev=1. A static grid of sky cases for judging the register and reading off parameter values. No engine, no sound, no beat clock.
// Every cell links to its own full-screen URL: ?case=haze&turbidity=12&mie=0.05 · ?case=day&date=2023-06-07&hour=14 · ?case=ozone&rayleigh=1.6&bloom=0.7&brightness=1.1 · ?case=ground&mode=fade · ?case=glass&impl=css&bg=jun7
// Sliders at the foot drive the live cell at the top and print their values, so the settled numbers can be read off and put in theme.ts SKY_RANGES.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { SkyView, type GroundMode, type SkyModel } from "./SkyView";
import { hazeToAerosol, skyParamsFor, starOpacity, RAYLEIGH_DEFAULT, HAZE_PATH, type SkyParams } from "./skyParams";
import { GlassSample, GLASS_IMPLS, GLASS_LABELS, type GlassImpl } from "./GlassSamples";
import {
  applyAsRangeEnd,
  applyToGrid,
  getRanges,
  initControls,
  resetRanges,
  setControl,
  useApplied,
  useControl,
  useControls,
  useRanges,
} from "./skyStore";
import { sunAnglesAt, sunPositionVector } from "./solar";
import { CLEAR_NOON_EXPOSURE, NYC_LAT, NYC_LON, SKY_RANGES, families, typeScale, space } from "../utils/theme";
import { normalize, type PollutantAnchors } from "../engine/contour";
import type { HourReading } from "../engine/SynthEngine";

const CELL_W = 1200;
const CELL_H = 800;

const DAYS = [
  { date: "2023-10-29", label: "Oct 29, cleanest" },
  { date: "2023-07-12", label: "Jul 12, ozone" },
  { date: "2023-02-09", label: "Feb 9, rush hour" },
  { date: "2023-06-07", label: "Jun 7, the smoke" },
];

const params = new URLSearchParams(window.location.search);
// ?model=preetham|hosek switches the sky model for the full-screen cases; rows 2 and 3 render both regardless, side by side.
const MODEL: SkyModel = (new URLSearchParams(window.location.search).get("model") as SkyModel) ?? "preetham";
const num = (k: string, d: number) => (params.has(k) ? Number(params.get(k)) : d);

initControls({
  haze: num("haze", 0),
  rayleigh: num("rayleigh", RAYLEIGH_DEFAULT),
  bloom: num("bloom", 0.6),
  exposure: num("exposure", CLEAR_NOON_EXPOSURE),
});

// The parameter rows read the APPLIED values, not the live sliders: the grid holds still while you drag and updates when you press Apply.
function baseFrom(c: { haze: number; rayleigh: number; bloom: number; exposure: number }): SkyParams {
  const aer = hazeToAerosol(c.haze);
  return {
    turbidity: aer.turbidity,
    mieCoefficient: aer.mieCoefficient,
    mieDirectionalG: SKY_RANGES.mieDirectionalG,
    rayleigh: c.rayleigh,
    bloomIntensity: c.bloom,
    discBrightness: 1,
    exposure: c.exposure,
  };
}

// Only mount a cell's WebGL context while it is on screen: the grid has more cells than a browser allows live contexts.
function LazyCell({ children, height }: { children: React.ReactNode; height: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => setVisible(entries[0].isIntersecting), { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ height, background: "#05050a" }}>
      {visible ? children : null}
    </div>
  );
}

function Label({ children, href }: { children: React.ReactNode; href?: string }) {
  const style: React.CSSProperties = {
    fontFamily: families.data,
    fontSize: typeScale.micro.size,
    color: "rgba(255,255,255,0.68)",
    padding: `${space.xs} 0`,
    display: "block",
    textDecoration: "none",
  };
  return href ? (
    <a href={href} style={style} title="open full screen">
      {children} ↗
    </a>
  ) : (
    <div style={style}>{children}</div>
  );
}

function Cell({
  label,
  href,
  params: p,
  sunPosition,
  stars,
  groundMode,
  model,
  width,
  height,
}: {
  label: string;
  href?: string;
  params: SkyParams;
  sunPosition: [number, number, number];
  stars: number;
  groundMode?: GroundMode;
  model?: SkyModel;
  width: number;
  height: number;
}) {
  return (
    <div style={{ width }}>
      <LazyCell height={height}>
        <SkyView params={p} sunPosition={sunPosition} starOpacity={stars} groundMode={groundMode} model={model} style={{ width, height }} />
      </LazyCell>
      <Label href={href}>{label}</Label>
    </div>
  );
}

// Fixed noon sun for the parameter rows, so only the parameter under test varies.
const NOON_ANGLES = sunAnglesAt("2023-07-12", 13, NYC_LAT, NYC_LON, -4);
const NOON_SUN = sunPositionVector(NOON_ANGLES);

export default function SceneTestPage() {
  const [archive, setArchive] = useState<HourReading[] | null>(null);
  const [anchors, setAnchors] = useState<PollutantAnchors | null>(null);
  const applied = useApplied(); // changes only on Apply
  const ranges = useRanges();
  const BASE = baseFrom(applied);

  useEffect(() => {
    (async () => {
      try {
        const [hours, anch] = await Promise.all([
          fetch("/data/queens-2023.json").then((r) => r.json() as Promise<HourReading[]>),
          fetch("/data/anchors.json").then((r) => r.json() as Promise<Record<string, PollutantAnchors>>),
        ]);
        setArchive(hours);
        setAnchors(anch.Queens);
      } catch (e) {
        console.warn("[scene-test] archive load failed", e);
      }
    })();
  }, []);

  // Real data for a day/hour through the mapping.
  const dayCase = useMemo(() => {
    return (date: string, hour: number) => {
      const rec = archive?.find((h) => h.ts.startsWith(date) && Number(h.ts.slice(11, 13)) === hour);
      const a = anchors;
      const pm25n = rec && a ? normalize(rec.pm25 == null ? null : Math.max(0, rec.pm25), a.pm25) : 0;
      const o3n = rec && a ? normalize(rec.o3, a.o3) : 0;
      const ang = sunAnglesAt(date, hour, NYC_LAT, NYC_LON, date >= `${date.slice(0, 4)}-03-12` && date <= `${date.slice(0, 4)}-11-05` ? -4 : -5);
      const p = skyParamsFor(pm25n, o3n, ang.elevationDeg, ranges);
      return {
        p,
        sun: sunPositionVector(ang),
        stars: starOpacity(ang.elevationDeg, pm25n),
        readout: `pm25 ${rec?.pm25 ?? "—"} (n ${pm25n?.toFixed(2)}) · o3 ${rec?.o3 ?? "—"} (n ${o3n?.toFixed(2)}) · turb ${p.turbidity.toFixed(1)} · mie ${p.mieCoefficient.toFixed(3)} · ray ${p.rayleigh.toFixed(2)} · bloom ${p.bloomIntensity.toFixed(2)} · exp ${p.exposure.toFixed(2)} · el ${ang.elevationDeg.toFixed(0)}°`,
      };
    };
  }, [archive, anchors, ranges]);

  // ——— Full-screen single cases ———
  const kase = params.get("case");
  if (kase) {
    const full = { width: "100vw", height: "100vh" } as const;
    if (kase === "haze") {
      const p = baseFrom({ haze: num("haze", 0), rayleigh: num("rayleigh", RAYLEIGH_DEFAULT), bloom: num("bloom", 0.6), exposure: num("exposure", CLEAR_NOON_EXPOSURE) });
      return <SkyView params={p} sunPosition={NOON_SUN} starOpacity={0} model={MODEL} style={full} live />;
    }
    if (kase === "day") {
      const c = dayCase(params.get("date") ?? "2023-06-07", num("hour", 14));
      return <SkyView params={c.p} sunPosition={c.sun} starOpacity={c.stars} model={MODEL} style={full} live />;
    }
    if (kase === "ozone") {
      const p = { ...baseFrom({ haze: 0, rayleigh: num("rayleigh", RAYLEIGH_DEFAULT), bloom: num("bloom", 0.6), exposure: num("exposure", CLEAR_NOON_EXPOSURE) }), rayleigh: num("rayleigh", RAYLEIGH_DEFAULT), bloomIntensity: num("bloom", 0.6), discBrightness: num("brightness", 1) };
      return <SkyView params={p} sunPosition={NOON_SUN} starOpacity={0} model={MODEL} style={full} live />;
    }
    if (kase === "ground") {
      const p = skyParamsFor(0.05, 0.5);
      return <SkyView params={p} sunPosition={NOON_SUN} starOpacity={0} groundMode={(params.get("mode") as GroundMode) ?? "above"} model={MODEL} style={full} live />;
    }
    if (kase === "glass") {
      const impl = (params.get("impl") as GlassImpl) ?? "css";
      const bg = params.get("bg") ?? "noon";
      const cfg = GLASS_BACKGROUNDS[bg] ?? GLASS_BACKGROUNDS.noon;
      const c = dayCase(cfg.date, cfg.hour);
      const sky = <SkyView params={c.p} sunPosition={c.sun} starOpacity={c.stars} model={MODEL} style={full} live />;
      return (
        <div style={{ position: "fixed", inset: 0 }}>
          {impl === "lgw" ? <GlassSample impl="lgw" refracted={sky} /> : sky}
          {impl !== "lgw" && (
            <div style={{ position: "absolute", left: "50%", bottom: "12%", transform: "translateX(-50%)" }}>
              <GlassSample impl={impl} />
            </div>
          )}
        </div>
      );
    }
  }

  // ——— The grid ———
  const w = 380;
  const h = Math.round((w * CELL_H) / CELL_W);
  const wide = 560;
  const wideH = Math.round((wide * CELL_H) / CELL_W);

  // One aerosol path, nine steps: haze 0 → 1 with turbidity and mie rising together. Exposure and rayleigh are held out of it.
  const hazeSteps = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
  const ozoneSteps: Array<[number, number, number]> = [
    [ranges.rayleigh.lowO3, ranges.bloomIntensity.lowO3, ranges.discBrightness.lowO3],
    [(ranges.rayleigh.lowO3 + ranges.rayleigh.highO3) / 2, (ranges.bloomIntensity.lowO3 + ranges.bloomIntensity.highO3) / 2, (ranges.discBrightness.lowO3 + ranges.discBrightness.highO3) / 2],
    [ranges.rayleigh.highO3, ranges.bloomIntensity.highO3, ranges.discBrightness.highO3],
  ];

  const section: React.CSSProperties = {
    fontFamily: families.uiCaps,
    fontSize: typeScale.caption.size,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: "rgba(255,255,255,0.5)",
    margin: `${space.lg} 0 ${space.sm}`,
  };
  const row: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: space.md };

  return (
    <div style={{ background: "#05050a", minHeight: "100vh", color: "#fff", padding: space.md, paddingBottom: 160 }}>
      <div style={section}>Live — slider values (read these into theme.ts SKY_RANGES)</div>
      <div style={row}>
        <LivePreview width={wide} height={wideH} />
      </div>

      <div style={section}>
        Row 1 — the aerosol path at fixed noon sun · haze 0 → 1 · turbidity {HAZE_PATH.turbidity.at0}–{HAZE_PATH.turbidity.at1}, mie {HAZE_PATH.mieCoefficient.at0}–{HAZE_PATH.mieCoefficient.at1}, linear · exposure {applied.exposure} and rayleigh {applied.rayleigh} held
      </div>
      <div style={row}>
        {hazeSteps.map((hz) => {
          const aer = hazeToAerosol(hz);
          return (
            <Cell
              key={hz}
              label={`haze ${hz} — turbidity ${aer.turbidity.toFixed(1)} · mie ${aer.mieCoefficient.toFixed(4)}`}
              href={`/scene-test?dev=1&case=haze&haze=${hz}&rayleigh=${applied.rayleigh}&exposure=${applied.exposure}`}
              params={{ ...BASE, turbidity: aer.turbidity, mieCoefficient: aer.mieCoefficient }}
              sunPosition={NOON_SUN}
              stars={0}
              width={w}
              height={h}
            />
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: space.md, padding: `${space.sm} 0` }}>
        <Slider label="haze" ctl="haze" min={0} max={1} step={0.005} />
      </div>

      {(["preetham", "hosek"] as SkyModel[]).map((m) => (
        <div key={m}>
          <div style={section}>Row 2 — the four real days at hour 14, through the mapping · model: {m}</div>
          <div style={row}>
            {DAYS.map((d) => {
              const c = dayCase(d.date, 14);
              return (
                <Cell
                  key={d.date}
                  label={`${d.label} — ${c.readout}`}
                  href={`/scene-test?dev=1&case=day&date=${d.date}&hour=14&model=${m}`}
                  params={c.p}
                  sunPosition={c.sun}
                  stars={c.stars}
                  model={m}
                  width={w}
                  height={h}
                />
              );
            })}
          </div>
        </div>
      ))}

      {(["preetham", "hosek"] as SkyModel[]).map((m) => (
        <div key={m}>
          <div style={section}>Row 3 — June 7 across the day · model: {m}</div>
          <div style={row}>
            {[6, 10, 14, 18, 22].map((hr) => {
              const c = dayCase("2023-06-07", hr);
              return (
                <Cell
                  key={hr}
                  label={`Jun 7, ${String(hr).padStart(2, "0")}:00 — ${c.readout}`}
                  href={`/scene-test?dev=1&case=day&date=2023-06-07&hour=${hr}&model=${m}`}
                  params={c.p}
                  sunPosition={c.sun}
                  stars={c.stars}
                  model={m}
                  width={w}
                  height={h}
                />
              );
            })}
          </div>
        </div>
      ))}

      <div style={section}>Row 4 — ozone: rayleigh, bloom, disc brightness at low / middle / high, clear sky, hour 14</div>
      <div style={row}>
        {ozoneSteps.map(([r, b, br], i) => (
          <Cell
            key={i}
            label={`${["low", "middle", "high"][i]} — rayleigh ${r.toFixed(2)} · bloom ${b.toFixed(2)} · brightness ${br.toFixed(2)}`}
            href={`/scene-test?dev=1&case=ozone&rayleigh=${r}&bloom=${b}&brightness=${br}`}
            params={{ ...BASE, rayleigh: r, bloomIntensity: b, discBrightness: br, turbidity: 2.5, mieCoefficient: 0.006 }}
            sunPosition={NOON_SUN}
            stars={0}
            width={w}
            height={h}
          />
        ))}
      </div>

      <div style={section}>Row 5 — the ground question, same clear hour-14 sky three ways</div>
      <div style={row}>
        {(["above", "fade", "edge"] as GroundMode[]).map((m) => (
          <Cell
            key={m}
            label={{ above: "(a) camera above horizon only", fade: "(b) horizon fade to a neutral band", edge: "(c) sky edge to edge" }[m]}
            href={`/scene-test?dev=1&case=ground&mode=${m}`}
            params={skyParamsFor(0.05, 0.5, undefined, ranges)}
            sunPosition={NOON_SUN}
            stars={0}
            groundMode={m}
            width={w}
            height={h}
          />
        ))}
      </div>

      <div style={section}>Row 6 — glass: the transport at real size, three materials, over four skies (upper control sits over the sun disc, lower over open sky)</div>
      {Object.entries(GLASS_BACKGROUNDS).map(([key, cfg]) => {
        const c = dayCase(cfg.date, cfg.hour);
        return (
          <div key={key}>
            <div style={{ ...section, margin: `${space.md} 0 ${space.xs}` }}>{cfg.label}</div>
            <div style={row}>
              {GLASS_IMPLS.map((impl) => {
                const sky = (
                  <SkyView params={c.p} sunPosition={c.sun} starOpacity={c.stars} style={{ width: w, height: h }} />
                );
                return (
                  <div key={impl} style={{ width: w }}>
                    <LazyCell height={h}>
                      <div style={{ position: "relative", width: w, height: h }}>
                        {impl === "lgw" ? <GlassSample impl="lgw" refracted={sky} /> : sky}
                        {impl !== "lgw" && (
                          <>
                            <div style={{ position: "absolute", left: "50%", top: "26%", transform: "translate(-50%,-50%) scale(0.62)" }}>
                              <GlassSample impl={impl} />
                            </div>
                            <div style={{ position: "absolute", left: "50%", bottom: "10%", transform: "translateX(-50%) scale(0.62)" }}>
                              <GlassSample impl={impl} />
                            </div>
                          </>
                        )}
                      </div>
                    </LazyCell>
                    <Label href={`/scene-test?dev=1&case=glass&impl=${impl}&bg=${key}`}>{GLASS_LABELS[impl]}</Label>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div style={section}>Current ranges — paste into theme.ts SKY_RANGES</div>
      <pre
        style={{
          fontFamily: families.data,
          fontSize: typeScale.micro.size,
          color: "rgba(255,255,255,0.8)",
          background: "rgba(255,255,255,0.05)",
          padding: space.sm,
          overflowX: "auto",
        }}
      >
{`turbidity: { clear: ${ranges.turbidity.clear}, suffocating: ${ranges.turbidity.suffocating} },
mieCoefficient: { clear: ${ranges.mieCoefficient.clear}, high: ${ranges.mieCoefficient.high} },
mieDirectionalG: ${ranges.mieDirectionalG},
rayleigh: { lowO3: ${ranges.rayleigh.lowO3}, highO3: ${ranges.rayleigh.highO3} },
bloomIntensity: { lowO3: ${ranges.bloomIntensity.lowO3}, highO3: ${ranges.bloomIntensity.highO3} },
discBrightness: { lowO3: ${ranges.discBrightness.lowO3}, highO3: ${ranges.discBrightness.highO3} },
exposure: { lowO3: ${ranges.exposure.lowO3}, highO3: ${ranges.exposure.highO3} },`}
      </pre>

      {/* Sliders, fixed at the foot */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(5,5,10,0.94)",
          borderTop: "1px solid rgba(255,255,255,0.12)",
          padding: space.sm,
          display: "flex",
          gap: space.lg,
          flexWrap: "wrap",
          fontFamily: families.data,
          fontSize: typeScale.micro.size,
        }}
      >
        <Slider label="rayleigh (held)" ctl="rayleigh" min={0} max={6} step={0.05} />
        <Slider label="bloom intensity" ctl="bloom" min={0} max={3} step={0.05} />
        <Slider label="exposure" ctl="exposure" min={0.1} max={1.5} step={0.01} />
        <div style={{ display: "flex", gap: space.xs, alignItems: "center" }}>
          <Btn onClick={applyToGrid} title="Push the current slider values into every parameter row">Apply to grid</Btn>
          <Btn onClick={() => applyAsRangeEnd("clear")} title="Write these values into the clear / low-ozone end of the ranges — the real-day rows re-render through them">Set clear end</Btn>
          <Btn onClick={() => applyAsRangeEnd("smoke")} title="Write these values into the smoke / high-ozone end of the ranges">Set smoke end</Btn>
          <Btn onClick={resetRanges} title="Back to the proposed ranges in theme.ts">Reset</Btn>
        </div>
      </div>
    </div>
  );
}

const GLASS_BACKGROUNDS: Record<string, { date: string; hour: number; label: string }> = {
  night: { date: "2023-06-07", hour: 22, label: "night" },
  noon: { date: "2023-10-29", hour: 14, label: "clear noon" },
  jun7: { date: "2023-06-07", hour: 14, label: "June 7 orange" },
  dusk: { date: "2023-07-12", hour: 20, label: "dusk" },
};

// Only this slider and the live preview re-render on a drag; the grid is untouched.
function Slider({
  label,
  ctl,
  min,
  max,
  step,
}: {
  label: string;
  ctl: keyof import("./skyStore").SkyControls;
  min: number;
  max: number;
  step: number;
}) {
  const value = useControl(ctl);
  const onChange = (v: number) => setControl(ctl, v);
  return (
    <label style={{ display: "flex", alignItems: "center", gap: space.xs, color: "rgba(255,255,255,0.8)" }}>
      <span style={{ width: 108 }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: 160 }} />
      <span style={{ width: 56, textAlign: "right" }}>{value}</span>
    </label>
  );
}

function Btn({ onClick, children, title }: { onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        fontFamily: families.uiCaps,
        fontSize: typeScale.micro.size,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "rgba(255,255,255,0.92)",
        background: "rgba(255,255,255,0.12)",
        border: "1px solid rgba(255,255,255,0.28)",
        borderRadius: 4,
        padding: "6px 10px",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

// The live preview: continuous frameloop, subscribed to the store, isolated from the grid.
function LivePreview({ width, height }: { width: number; height: number }) {
  const c = useControls();
  const p = baseFrom(c);
  const aer = hazeToAerosol(c.haze);
  return (
    <div style={{ width }}>
      <SkyView params={p} sunPosition={NOON_SUN} starOpacity={0} style={{ width, height }} live />
      <Label>
        haze {c.haze} (turbidity {aer.turbidity.toFixed(1)} · mie {aer.mieCoefficient.toFixed(4)}) · rayleigh {c.rayleigh} · bloom {c.bloom} · exposure {c.exposure}
      </Label>
    </div>
  );
}
