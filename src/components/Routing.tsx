// Routing (D-43, reworked 2026-09-16 to Shoro's patch-bay brief) — the three measurements as pills along the top, the six sound parameters as pills along the bottom, and a curved cable for every mapping in STRATEGY §3.2/§3.6 between them, in the site's own vocabulary: the pills are the cards' source chips, the cables hairlines. Data is shown moving, not lit: each beat a source's normalized value changes, a glowing packet leaves its pill and travels every cable from it, eased over one beat, and fades at the far end. Laptop only (index.css); the source pills carry the routing below that.
// Geometry is measured, not assumed: the pills are HTML so they set in the UI face, and the SVG behind them draws in pixels from their rects (ResizeObserver), so the cables leave and arrive at pill centres at any width.
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTheme, themeColors, motion, MONITOR } from "../utils/theme";
import { chipStyle } from "./chip";
import { MONITOR_LABELS, SOURCE_LABELS } from "../content";
import type { MonitorState, Channel } from "../scene/useListenSession";

type Dest = "scale" | "tone" | "beats" | "brightness" | "detune" | "reverb";
const SOURCES: Channel[] = ["pm25", "o3", "no2"];
const DESTS: Dest[] = ["scale", "tone", "beats", "brightness", "detune", "reverb"];
// The mappings (§3.2 roles, §3.6 effects): PM2.5 → scale, tone, detune, reverb; NO2 → beats and tone (the pulse's and bass's index); O3 → brightness.
const CABLES: Array<[Channel, Dest]> = [["pm25", "scale"], ["pm25", "tone"], ["pm25", "detune"], ["pm25", "reverb"], ["no2", "beats"], ["no2", "tone"], ["o3", "brightness"]];
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

interface Cable { s: Channel; d: Dest; path: string }
interface Packet { cable: number; start: number }

export function Routing({ m }: { m: MonitorState }) {
  const c = themeColors(useTheme());
  const box = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const pathRefs = useRef<Array<SVGPathElement | null>>([]);
  const [cables, setCables] = useState<Cable[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // The cables from the pills' rects: each leaves the bottom centre of its source pill and arrives at the top centre of its destination pill as a cubic S-curve with a little sag, the way a patch cable hangs.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const at = (key: string) => { const p = pillRefs.current[key]; if (!p) return null; const b = p.getBoundingClientRect(); return { x: b.left - r.left + b.width / 2, top: b.top - r.top, bottom: b.bottom - r.top }; };
      const next: Cable[] = [];
      for (const [s, d] of CABLES) {
        const a = at(`s:${s}`), b = at(`d:${d}`);
        if (!a || !b) continue;
        const y1 = a.bottom + 2, y2 = b.top - 2, sag = MONITOR.cableSag;
        next.push({ s, d, path: `M ${a.x} ${y1} C ${a.x} ${y1 + (y2 - y1) * 0.5 + sag}, ${b.x} ${y2 - (y2 - y1) * 0.5 + sag}, ${b.x} ${y2}` });
      }
      setCables(next);
      setSize({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, []);

  // Which sources moved this beat: compared with the values at the previous beat (a ref, so the comparison is one beat deep). On a move, one packet per cable from that source.
  const prev = useRef<{ hour: number | null; pm25n: number | null; o3n: number | null; no2n: number | null }>({ hour: null, pm25n: null, o3n: null, no2n: null });
  const packets = useRef<Packet[]>([]);
  const dotsRef = useRef<SVGGElement>(null);
  const raf = useRef(0);
  useEffect(() => {
    if (prev.current.hour === m.hour) return;
    const eps = 0.005;
    const diff = (a: number | null, b: number | null) => (a == null || b == null ? a !== b : Math.abs(a - b) > eps);
    const moved: Record<Channel, boolean> = { pm25: prev.current.hour != null && diff(prev.current.pm25n, m.pm25n), o3: prev.current.hour != null && diff(prev.current.o3n, m.o3n), no2: prev.current.hour != null && diff(prev.current.no2n, m.no2n) };
    prev.current = { hour: m.hour, pm25n: m.pm25n, o3n: m.o3n, no2n: m.no2n };
    const now = performance.now();
    cables.forEach((cb, i) => { if (moved[cb.s]) packets.current.push({ cable: i, start: now }); });
    if (packets.current.length && !raf.current) raf.current = requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.hour, cables]);

  // The packets: drawn straight into the SVG each frame (no React state per frame). Each is a soft halo and a bright core, moved along its cable's path by arc length with an ease-in-out over one beat (motion.beatMs), fading over the last quarter of the way.
  const tick = (now: number) => {
    const g = dotsRef.current;
    if (!g) { raf.current = 0; return; }
    const dur = motion.beatMs * MONITOR.packetBeats;
    const live: Packet[] = [];
    while (g.firstChild) g.removeChild(g.firstChild);
    for (const p of packets.current) {
      const t = (now - p.start) / dur;
      if (t >= 1) continue;
      live.push(p);
      const path = pathRefs.current[p.cable];
      if (!path) continue;
      const len = path.getTotalLength();
      const pt = path.getPointAtLength(easeInOut(t) * len);
      const alpha = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25;
      const halo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      halo.setAttribute("cx", pt.x.toFixed(1)); halo.setAttribute("cy", pt.y.toFixed(1)); halo.setAttribute("r", String(MONITOR.packetHalo)); halo.setAttribute("fill", `rgba(255,255,255,${(0.28 * alpha).toFixed(3)})`);
      const core = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      core.setAttribute("cx", pt.x.toFixed(1)); core.setAttribute("cy", pt.y.toFixed(1)); core.setAttribute("r", String(MONITOR.packetCore)); core.setAttribute("fill", `rgba(255,255,255,${(0.95 * alpha).toFixed(3)})`);
      g.appendChild(halo); g.appendChild(core);
    }
    packets.current = live;
    raf.current = live.length ? requestAnimationFrame(tick) : 0;
  };
  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);

  const pill = chipStyle(c, false, { height: 20, padding: "0 8px", borderRadius: 10, fontSize: "10px" });
  return (
    <div ref={box} className="scene-routing" style={{ height: `var(--routing-h, ${MONITOR.routingHeight.laptop}px)` }}>
      <div className="scene-routing-row scene-routing-sources">
        {SOURCES.map((s) => <span key={s} ref={(el) => { pillRefs.current[`s:${s}`] = el; }} style={pill}>{SOURCE_LABELS[s]}</span>)}
      </div>
      <svg className="scene-routing-cables" width={size.w || undefined} height={size.h || undefined} viewBox={size.w ? `0 0 ${size.w} ${size.h}` : undefined} aria-hidden>
        {cables.map((cb, i) => <path key={`${cb.s}-${cb.d}`} ref={(el) => { pathRefs.current[i] = el; }} d={cb.path} fill="none" />)}
        <g ref={dotsRef} />
      </svg>
      <div className="scene-routing-row scene-routing-dests">
        {DESTS.map((d) => <span key={d} ref={(el) => { pillRefs.current[`d:${d}`] = el; }} style={pill}>{MONITOR_LABELS[d]}</span>)}
      </div>
    </div>
  );
}
