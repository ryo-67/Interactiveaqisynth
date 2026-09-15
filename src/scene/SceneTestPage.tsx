// SceneTestPage — /scene-test?dev=1. One live sky, full viewport, with the controls beneath it.
// No grid: an array of live WebGL contexts flickered on scroll, because cells mounted and unmounted at the viewport edge and the browser evicted the oldest contexts past its limit. One view is the better instrument anyway — change one thing, see it immediately.
// Controls: haze, time of day and ozone as stepped sliders; rayleigh, bloom and exposure as the existing continuous sliders; model as a toggle; the real days as a dropdown; the glass kits as radios.
// Haze and ozone ARE the two data channels, normalized: haze is normalized PM2.5 (p05→0, p95→1), ozone is normalized O3. Picking a real day sets both from the archive at the chosen hour; moving a slider afterwards overrides it.
// Everything lives in the URL, so any view can be reopened or sent: ?model=hosek&day=2023-06-07&hour=14&haze=0.6&ozone=0.7&glass=css
import React, { useEffect, useMemo, useState } from "react";
import { SkyView, type SkyModel, type CameraFacing } from "./SkyView";
import { skyParamsFor, starOpacity, hazeToAerosol, daylightBlend, nightBlend, RAYLEIGH_DEFAULT } from "./skyParams";
import { GlassSample, GLASS_IMPLS, GLASS_LABELS, type GlassImpl } from "./GlassSamples";
import { SmokeLayer } from "./SmokeLayer";
import { NightLayer } from "./NightLayer";
import { sunAnglesAt, sunPositionVector } from "./solar";
import { CLEAR_NOON_EXPOSURE, HOSEK_ALBEDO, NYC_LAT, NYC_LON, SMOKE, SUN_DISC, NIGHT, families, typeScale, space } from "../utils/theme";
import { normalize, type PollutantAnchors } from "../engine/contour";
import type { HourReading } from "../engine/SynthEngine";

const DAYS = [
  { date: "2023-10-29", label: "Oct 29, cleanest" },
  { date: "2023-07-12", label: "Jul 12, ozone" },
  { date: "2023-02-09", label: "Feb 9, rush hour" },
  { date: "2023-06-07", label: "Jun 7, the smoke" },
];

const qs = new URLSearchParams(window.location.search);
const num = (k: string, d: number) => (qs.has(k) ? Number(qs.get(k)) : d);
const str = (k: string, d: string) => qs.get(k) ?? d;

const isDST = (date: string) => date >= `${date.slice(0, 4)}-03-12` && date <= `${date.slice(0, 4)}-11-05`;

export default function SceneTestPage() {
  const [model, setModel] = useState<SkyModel>(str("model", "auto") as SkyModel);
  const [day, setDay] = useState(str("day", "manual"));
  const [hour, setHour] = useState(num("hour", 13));
  const [haze, setHaze] = useState(num("haze", 0));
  const [ozone, setOzone] = useState(num("ozone", 0.5));
  // Held-but-adjustable, as before.
  const [rayleigh, setRayleigh] = useState(num("rayleigh", RAYLEIGH_DEFAULT));
  const [bloom, setBloom] = useState(num("bloom", 0.6));
  const [exposure, setExposure] = useState(num("exposure", CLEAR_NOON_EXPOSURE));
  // Exposure is clock-scheduled (D-20). "auto" follows the schedule; the slider is a manual override for judging one value.
  const [expAuto, setExpAuto] = useState(str("expAuto", "1") === "1");
  const [disc, setDisc] = useState(str("disc", "0") === "1"); // the literal sun, under benchmark
  const [discDeg, setDiscDeg] = useState(num("discDeg", SUN_DISC.angularDiameterDeg));
  const [facing, setFacing] = useState<CameraFacing>(str("facing", "south") as CameraFacing); // south per D-22; north remains for comparison with the earlier frames
  const [albedo, setAlbedo] = useState(num("albedo", HOSEK_ALBEDO)); // Hosek's ground-albedo input; ignored by Preetham, which has no such parameter
  // The composited plume (D-20). Manual here rather than tied to the day's PM2.5, so smoke can be judged against a fixed sky; in the scene it is driven by normalized PM2.5.
  const [smoke, setSmoke] = useState(num("smoke", 0));
  const [smokeHue, setSmokeHue] = useState(num("smokeHue", SMOKE.hueDeg));
  const [night, setNight] = useState(num("night", NIGHT.strength)); // the night-blue layer's strength, first pass
  const [glass, setGlass] = useState<GlassImpl | "none">(str("glass", "none") as GlassImpl | "none");

  const [archive, setArchive] = useState<HourReading[] | null>(null);
  const [anchors, setAnchors] = useState<PollutantAnchors | null>(null);
  const [reading, setReading] = useState<HourReading | null>(null);

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

  // Picking a day (or changing the hour on one) sets haze and ozone from that hour's real reading.
  useEffect(() => {
    if (day === "manual" || !archive || !anchors) {
      setReading(null);
      return;
    }
    // Fractional hours (URL only, e.g. hour=17.6) land inside the dusk fade band, which no integer hour reaches on an autumn day; the reading is the enclosing hour's.
    const rec = archive.find((h) => h.ts.startsWith(day) && Number(h.ts.slice(11, 13)) === Math.floor(hour)) ?? null;
    setReading(rec);
    if (!rec) return;
    const pm25n = normalize(rec.pm25 == null ? null : Math.max(0, rec.pm25), anchors.pm25);
    const o3n = normalize(rec.o3, anchors.o3);
    if (pm25n != null) setHaze(Math.round(Math.min(1, pm25n) * 20) / 20);
    if (o3n != null) setOzone(Math.round(Math.min(1, o3n) * 20) / 20);
  }, [day, hour, archive, anchors]);

  useEffect(() => {
    const p = new URLSearchParams({
      dev: "1", model, day, hour: String(hour), haze: String(haze), ozone: String(ozone),
      rayleigh: String(rayleigh), bloom: String(bloom), exposure: String(exposure), albedo: String(albedo),
      smoke: String(smoke), smokeHue: String(smokeHue), night: String(night), glass, expAuto: expAuto ? "1" : "0", disc: disc ? "1" : "0", discDeg: String(discDeg), facing,
    });
    window.history.replaceState(null, "", `?${p}`);
  }, [model, day, hour, haze, ozone, rayleigh, bloom, exposure, albedo, smoke, smokeHue, night, glass, expAuto, disc, discDeg, facing]);

  const view = useMemo(() => {
    const dateForSun = day === "manual" ? "2023-07-12" : day;
    const ang = sunAnglesAt(dateForSun, hour, NYC_LAT, NYC_LON, isDST(dateForSun) ? -4 : -5);
    // haze and ozone run through the same mapping the scene uses; rayleigh, bloom and exposure then override what the mapping produced, so they can be judged directly.
    const mapped = skyParamsFor(haze, ozone, ang.elevationDeg);
    const params = { ...mapped, rayleigh, bloomIntensity: bloom, exposure: expAuto ? mapped.exposure : exposure };
    const aer = hazeToAerosol(haze);
    const blend = model === "auto" ? daylightBlend(ang.elevationDeg) : model === "hosek" ? 1 : 0;
    return {
      params,
      sun: sunPositionVector(ang),
      stars: starOpacity(ang.elevationDeg, haze),
      night: nightBlend(ang.elevationDeg),
      mappedReadout: `mapping would give rayleigh ${mapped.rayleigh.toFixed(2)} · bloom ${mapped.bloomIntensity.toFixed(2)} · exposure ${mapped.exposure.toFixed(2)} (scheduled${expAuto ? ", in use" : ", overridden by slider"})`,
      fadeReadout: `sun ${ang.elevationDeg.toFixed(1)}° el, ${ang.azimuthDeg.toFixed(0)}° az, camera facing ${facing} → hosek alpha ${blend.toFixed(2)} (${blend >= 1 ? "hosek only" : blend <= 0 ? "preetham only" : "cross-fading"}) · exposure ${params.exposure.toFixed(2)} · disc ${disc ? `on, brightness ${mapped.discBrightness.toFixed(2)}` : "off"}`,
      readout:
        `haze ${haze.toFixed(2)} → turbidity ${aer.turbidity.toFixed(1)}, mie ${aer.mieCoefficient.toFixed(4)}` +
        ` · ozone ${ozone.toFixed(2)}` +
        ` · sun ${ang.elevationDeg.toFixed(0)}°` +
        ` · albedo ${albedo.toFixed(2)}${model === "hosek" ? "" : " (hosek only)"}` +
        ` · smoke ${smoke.toFixed(2)} @ hue ${smokeHue.toFixed(0)}° · night ${(nightBlend(ang.elevationDeg) * night).toFixed(2)}` +
        (reading ? ` · real: pm25 ${reading.pm25 ?? "—"} µg/m³, o3 ${reading.o3 ?? "—"} ppb` : " · manual"),
    };
  }, [day, hour, haze, ozone, rayleigh, bloom, exposure, expAuto, albedo, smoke, smokeHue, night, model, disc, facing, reading]);

  return (
    // The scene owns the area above the control bar rather than the whole viewport, so the plume's densest band — which sits at the horizon, at the bottom of the frame — is never hidden behind the controls.
    <div style={{ position: "fixed", inset: 0, background: "#05050a", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        <SkyView params={view.params} sunPosition={view.sun} starOpacity={view.stars} model={model} albedo={albedo} disc={disc} discDeg={discDeg} facing={facing} hour={hour} style={{ width: "100%", height: "100%" }} live />

        <NightLayer blend={view.night} density={smoke} strength={night} />
        <SmokeLayer density={smoke} hueDeg={smokeHue} />

        {glass !== "none" && (
          <div style={{ position: "absolute", left: "50%", top: "45%", transform: "translate(-50%,-50%)" }}>
            <GlassSample impl={glass} />
          </div>
        )}
      </div>

      <div
        style={{
          flex: "0 0 auto",
          background: "rgba(5,5,10,0.96)", borderTop: "1px solid rgba(255,255,255,0.14)",
          padding: space.sm, display: "flex", flexWrap: "wrap", alignItems: "center", gap: space.md,
          fontFamily: families.data, fontSize: typeScale.micro.size, color: "rgba(255,255,255,0.85)",
        }}
      >
        <Group label="model">
          <Toggle options={["auto", "preetham", "hosek"] as SkyModel[]} value={model} onChange={setModel} />
        </Group>

        <Group label="day">
          <select
            value={day}
            onChange={(e) => setDay(e.target.value)}
            style={{ fontFamily: families.data, fontSize: typeScale.micro.size, padding: "3px 6px" }}
          >
            <option value="manual">manual</option>
            {DAYS.map((d) => (
              <option key={d.date} value={d.date}>{d.label}</option>
            ))}
          </select>
        </Group>

        <Stepped label="haze" min={0} max={1} step={0.05} value={haze} onChange={setHaze} />
        <Stepped label="time of day" min={0} max={23} step={1} value={hour} onChange={setHour} unit="h" />
        <Stepped label="ozone" min={0} max={1} step={0.05} value={ozone} onChange={setOzone} />

        <Slider label="rayleigh" min={0} max={6} step={0.05} value={rayleigh} onChange={setRayleigh} />
        <Slider label="bloom" min={0} max={3} step={0.05} value={bloom} onChange={setBloom} />
        <Group label="exposure">
          <Radio name="exp" label="auto" checked={expAuto} onChange={() => setExpAuto(true)} />
          <Radio name="exp" label="manual" checked={!expAuto} onChange={() => setExpAuto(false)} />
        </Group>
        <Slider label="" min={0.02} max={1.5} step={0.01} value={exposure} onChange={(v) => { setExpAuto(false); setExposure(v); }} />
        <Group label="camera">
          <Toggle options={["north", "south", "sun"] as CameraFacing[]} value={facing} onChange={setFacing} />
        </Group>
        <Group label="sun disc">
          <Radio name="disc" label="off" checked={!disc} onChange={() => setDisc(false)} />
          <Radio name="disc" label="on" checked={disc} onChange={() => setDisc(true)} />
        </Group>
        <Slider label="disc °" min={2} max={12} step={0.5} value={discDeg} onChange={setDiscDeg} />
        <Slider label="albedo" min={0} max={0.4} step={0.01} value={albedo} onChange={setAlbedo} />
        <Stepped label="smoke" min={0} max={1} step={0.05} value={smoke} onChange={setSmoke} />
        <Slider label="smoke hue" min={0} max={60} step={1} value={smokeHue} onChange={setSmokeHue} />
        <Slider label="night blue" min={0} max={1} step={0.05} value={night} onChange={setNight} />

        <Group label="glass">
          <Radio name="glass" label="off" checked={glass === "none"} onChange={() => setGlass("none")} />
          {GLASS_IMPLS.map((g) => (
            <Radio key={g} name="glass" label={g} title={GLASS_LABELS[g]} checked={glass === g} onChange={() => setGlass(g)} />
          ))}
        </Group>

        <div style={{ flexBasis: "100%", color: "rgba(255,255,255,0.62)" }}>{view.readout}</div>
        <div style={{ flexBasis: "100%", color: "rgba(255,255,255,0.62)" }}>{view.fadeReadout}</div>
        <div style={{ flexBasis: "100%", color: "rgba(255,255,255,0.38)" }}>{view.mappedReadout}</div>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: space.xs }}>
      <span style={{ color: "rgba(255,255,255,0.45)" }}>{label}</span>
      {children}
    </div>
  );
}

function Toggle<T extends string>({ options, value, onChange }: { options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div style={{ display: "flex" }}>
      {options.map((o, i) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          style={{
            fontFamily: families.data, fontSize: typeScale.micro.size,
            color: value === o ? "#05050a" : "rgba(255,255,255,0.9)",
            background: value === o ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: i === 0 ? "3px 0 0 3px" : i === options.length - 1 ? "0 3px 3px 0" : "0",
            padding: "4px 10px", cursor: "pointer",
          }}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function Radio({ name, label, checked, onChange, title }: { name: string; label: string; checked: boolean; onChange: () => void; title?: string }) {
  return (
    <label title={title} style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }}>
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}

// Stepped: discrete notches, with the step size shown so a value can be read back exactly.
function Stepped({ label, min, max, step, value, onChange, unit = "" }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; unit?: string }) {
  const steps = Math.round((max - min) / step);
  return (
    <label style={{ display: "flex", alignItems: "center", gap: space.xs }}>
      <span style={{ color: "rgba(255,255,255,0.45)" }}>{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        list={`ticks-${label.replace(/\s/g, "")}`}
        style={{ width: 170 }}
      />
      <datalist id={`ticks-${label.replace(/\s/g, "")}`}>
        {Array.from({ length: steps + 1 }, (_, i) => (
          <option key={i} value={min + i * step} />
        ))}
      </datalist>
      <span style={{ width: 46, textAlign: "right" }}>{value}{unit}</span>
    </label>
  );
}

function Slider({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: space.xs }}>
      <span style={{ color: "rgba(255,255,255,0.45)" }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: 120 }} />
      <span style={{ width: 44, textAlign: "right" }}>{value}</span>
    </label>
  );
}
