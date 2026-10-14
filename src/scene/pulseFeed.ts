// The pulse hits as a feed (2026-10-14): the engine writes each hit here and the monitor's lane subscribes on its own (Gauges.tsx Lane, useSyncExternalStore). As session state, every hit re-rendered the whole page, sky, graph and panels, several times a second while playing, for one sixteen-step strip that is the only reader; now only the strip renders.
import type { PulseInfo } from "../engine/SynthEngine";

export interface PulseHit extends PulseInfo { t: number } // a pulse the engine fired, with the frame time it landed (the lane lights the step and lets it decay)

export interface PulseFeed {
  get: () => PulseHit | null;
  subscribe: (listener: () => void) => () => void;
}

export function createPulseFeed(): PulseFeed & { set: (hit: PulseHit | null) => void } {
  let hit: PulseHit | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => hit,
    subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    set: (next) => {
      if (next === hit) return;
      hit = next;
      for (const l of listeners) l();
    },
  };
}
