// SceneTestPage — /scene-test?dev=1. A static grid of sky cases for judging the register and reading off parameter values. No engine, no sound, no beat clock.
// Every cell links to its own full-screen URL: ?case=haze&turbidity=12&mie=0.05 · ?case=day&date=2023-06-07&hour=14 · ?case=ozone&rayleigh=1.6&bloom=0.7&brightness=1.1 · ?case=ground&mode=fade · ?case=glass&impl=css&bg=jun7
// Sliders at the foot drive the live cell at the top and print their values, so the settled numbers can be read off and put in theme.ts SKY_RANGES.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { SkyView, type GroundMode } from "./SkyView";
import { skyParamsFor, starOpacity, type SkyParams } from "./skyParams";
import { GlassSample, GLASS_IMPLS, GLASS_LABELS, type GlassImpl } from "./GlassSamples";
import { initControls, setControl, useControl, useControls } from "./skyStore";
import { sunAnglesAt, sunPositionVector } from "./solar";
import { NYC_LAT, NYC_LON, SKY_RANGES, families, typeScale, space } from "../utils/theme";
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
const num = (k: string, d: number) => (params.has(k) ? Number(params.get(k)) : d);

initControls({
  turbidity: num("turbidity", 8),
  mie: num("mie", 0.03),
  rayleigh: num("rayleigh", 1.8),
  bloom: num("bloom", 0.6),
  exposure: num("exposure", 0.5),
});

// Frozen base for the parameter rows. Grid cells never read the sliders — otherwise every tick re-renders every live WebGL context on the page and dragging goes to treacle.
const BASE: SkyParams = {
  turbidity: 8,
  mieCoefficient: 0.03,
  mieDirectionalG: SKY_RANGES.mieDirectionalG,
  rayleigh: 1.8,
  bloomIntensity: 0.6,
  discBrightness: 1,
  exposure: 0.5,
};

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
  width,
  height,
}: {
  label: string;
  href?: string;
  params: SkyParams;
  sunPosition: [number, number, number];
  stars: number;
  groundMode?: GroundMode;
  width: number;
  height: number;
}) {
  return (
    <div style={{ width }}>
      <LazyCell height={height}>
        <SkyView params={p} sunPosition={sunPosition} starOpacity={stars} groundMode={groundMode} style={{ width, height }} />
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
      const p = skyParamsFor(pm25n, o3n, ang.elevationDeg);
      return {
        p,
        sun: sunPositionVector(ang),
        stars: starOpacity(ang.elevationDeg, pm25n),
        readout: `pm25 ${rec?.pm25 ?? "—"} (n ${pm25n?.toFixed(2)}) · o3 ${rec?.o3 ?? "—"} (n ${o3n?.toFixed(2)}) · turb ${p.turbidity.toFixed(1)} · mie ${p.mieCoefficient.toFixed(3)} · ray ${p.rayleigh.toFixed(2)} · bloom ${p.bloomIntensity.toFixed(2)} · exp ${p.exposure.toFixed(2)} · el ${ang.elevationDeg.toFixed(0)}°`,
      };
    };
  }, [archive, anchors]);

  // ——— Full-screen single cases ———
  const kase = params.get("case");
  if (kase) {
    const full = { width: "100vw", height: "100vh" } as const;
    if (kase === "haze") {
      const p = { ...BASE, turbidity: num("turbidity", 8), mieCoefficient: num("mie", 0.03) };
      return <SkyView params={p} sunPosition={NOON_SUN} starOpacity={0} style={full} />;
    }
    if (kase === "day") {
      const c = dayCase(params.get("date") ?? "2023-06-07", num("hour", 14));
      return <SkyView params={c.p} sunPosition={c.sun} starOpacity={c.stars} style={full} />;
    }
    if (kase === "ozone") {
      const p = { ...BASE, rayleigh: num("rayleigh", 1.8), bloomIntensity: num("bloom", 0.6), discBrightness: num("brightness", 1), turbidity: 2.5, mieCoefficient: 0.006 };
      return <SkyView params={p} sunPosition={NOON_SUN} starOpacity={0} style={full} />;
    }
    if (kase === "ground") {
      const p = skyParamsFor(0.05, 0.5);
      return <SkyView params={p} sunPosition={NOON_SUN} starOpacity={0} groundMode={(params.get("mode") as GroundMode) ?? "edge"} style={full} />;
    }
    if (kase === "glass") {
      const impl = (params.get("impl") as GlassImpl) ?? "css";
      const bg = params.get("bg") ?? "noon";
      const cfg = GLASS_BACKGROUNDS[bg] ?? GLASS_BACKGROUNDS.noon;
      const c = dayCase(cfg.date, cfg.hour);
      const sky = <SkyView params={c.p} sunPosition={c.sun} starOpacity={c.stars} style={full} />;
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

  const hazeSteps: Array<[number, number]> = [
    [2, 0.005],
    [6, 0.02],
    [10, 0.04],
    [15, 0.07],
    [20, 0.1],
    [30, 0.15], // past the top, on purpose
  ];
  const ozoneSteps: Array<[number, number, number]> = [
    [SKY_RANGES.rayleigh.lowO3, SKY_RANGES.bloomIntensity.lowO3, SKY_RANGES.discBrightness.lowO3],
    [(SKY_RANGES.rayleigh.lowO3 + SKY_RANGES.rayleigh.highO3) / 2, (SKY_RANGES.bloomIntensity.lowO3 + SKY_RANGES.bloomIntensity.highO3) / 2, (SKY_RANGES.discBrightness.lowO3 + SKY_RANGES.discBrightness.highO3) / 2],
    [SKY_RANGES.rayleigh.highO3, SKY_RANGES.bloomIntensity.highO3, SKY_RANGES.discBrightness.highO3],
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

      <div style={section}>Row 1 — haze at fixed noon sun (last cell is past the top of the range)</div>
      <div style={row}>
        {hazeSteps.map(([t, m]) => (
          <Cell
            key={`${t}-${m}`}
            label={`turbidity ${t} · mie ${m}`}
            href={`/scene-test?dev=1&case=haze&turbidity=${t}&mie=${m}`}
            params={{ ...BASE, turbidity: t, mieCoefficient: m }}
            sunPosition={NOON_SUN}
            stars={0}
            width={w}
            height={h}
          />
        ))}
      </div>

      <div style={section}>Row 2 — the four real days at hour 14, real PM2.5 and O3 through the mapping</div>
      <div style={row}>
        {DAYS.map((d) => {
          const c = dayCase(d.date, 14);
          return (
            <Cell
              key={d.date}
              label={`${d.label} — ${c.readout}`}
              href={`/scene-test?dev=1&case=day&date=${d.date}&hour=14`}
              params={c.p}
              sunPosition={c.sun}
              stars={c.stars}
              width={w}
              height={h}
            />
          );
        })}
      </div>

      <div style={section}>Row 3 — June 7 across the day</div>
      <div style={row}>
        {[6, 10, 14, 18, 22].map((hr) => {
          const c = dayCase("2023-06-07", hr);
          return (
            <Cell
              key={hr}
              label={`Jun 7, ${String(hr).padStart(2, "0")}:00 — ${c.readout}`}
              href={`/scene-test?dev=1&case=day&date=2023-06-07&hour=${hr}`}
              params={c.p}
              sunPosition={c.sun}
              stars={c.stars}
              width={w}
              height={h}
            />
          );
        })}
      </div>

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
            params={skyParamsFor(0.05, 0.5)}
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
        <Slider label="turbidity" ctl="turbidity" min={1} max={35} step={0.5} />
        <Slider label="mieCoefficient" ctl="mie" min={0.001} max={0.2} step={0.001} />
        <Slider label="rayleigh" ctl="rayleigh" min={0} max={6} step={0.05} />
        <Slider label="bloom intensity" ctl="bloom" min={0} max={3} step={0.05} />
        <Slider label="exposure" ctl="exposure" min={0.1} max={1.5} step={0.01} />
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

// The live preview: continuous frameloop, subscribed to the store, isolated from the grid.
function LivePreview({ width, height }: { width: number; height: number }) {
  const c = useControls();
  const p: SkyParams = {
    turbidity: c.turbidity,
    mieCoefficient: c.mie,
    mieDirectionalG: SKY_RANGES.mieDirectionalG,
    rayleigh: c.rayleigh,
    bloomIntensity: c.bloom,
    discBrightness: 1,
    exposure: c.exposure,
  };
  return (
    <div style={{ width }}>
      <SkyView params={p} sunPosition={NOON_SUN} starOpacity={0} style={{ width, height }} live />
      <Label>
        turbidity {c.turbidity} · mie {c.mie} · rayleigh {c.rayleigh} · bloom {c.bloom} · exposure {c.exposure}
      </Label>
    </div>
  );
}
