// useEased — eases a number toward its target over `tauMs` (exponential; ~63% of the way per tau), so per-beat steps in the data become continuous motion. The sky's inputs, the ramp lifts and the monitor's meters all use it (D-43), so everything that follows the beat moves on one curve.
// One loop for every eased value (2026-09-16): each hook used to own an animation-frame loop that set React state, and seventeen of them ran at once while anything settled, each committing the page tree on its own; the profile showed up to ten loops a frame. Now all values advance in one frame callback, on one timestamp, and every subscriber is told once, so React commits the frame's values together. The maths is unchanged: the same exponential step on the same time base, settled within a thousandth of the target.
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { warnOnce } from "../utils/time";

interface Entry { value: number; target: number; tau: number; last: number; listeners: Set<() => void> }

const active = new Set<Entry>();
let raf = 0;
function tick(now: number) {
  raf = 0;
  const changed: Entry[] = [];
  for (const e of active) {
    const dt = now - e.last; e.last = now;
    const v = e.value + (e.target - e.value) * (1 - Math.exp(-dt / e.tau));
    e.value = Math.abs(e.target - v) < 1e-3 ? e.target : v;
    changed.push(e);
    if (e.value === e.target) active.delete(e);
  }
  for (const e of changed) for (const l of e.listeners) l();
  if (active.size) raf = requestAnimationFrame(tick);
}
function wake(e: Entry) {
  if (e.value === e.target) return;
  active.add(e);
  if (!raf) raf = requestAnimationFrame(tick);
}

export function useEased(target: number, tauMs: number, name = "eased input"): number {
  const ref = useRef<Entry | null>(null);
  if (!ref.current) { const v = Number.isFinite(target) ? target : 0; ref.current = { value: v, target: v, tau: tauMs, last: performance.now(), listeners: new Set() }; }
  const e = ref.current;
  useEffect(() => {
    if (!Number.isFinite(target)) { warnOnce(name); return; } // a NaN would ease to NaN for good; hold instead and say so once
    e.target = target; e.tau = tauMs; e.last = performance.now();
    wake(e);
  }, [e, target, tauMs, name]);
  const subscribe = useCallback((l: () => void) => { e.listeners.add(l); return () => { e.listeners.delete(l); if (!e.listeners.size) active.delete(e); }; }, [e]);
  return useSyncExternalStore(subscribe, () => e.value, () => e.value);
}
