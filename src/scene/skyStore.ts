// skyStore — slider values kept outside React so dragging repaints only the live preview, not the whole grid. Every mounted cell is a WebGL context; a page-wide re-render per slider tick is what made tuning feel sticky.
import { useSyncExternalStore } from "react";

export interface SkyControls {
  turbidity: number;
  mie: number;
  rayleigh: number;
  bloom: number;
  exposure: number;
}

let state: SkyControls = { turbidity: 8, mie: 0.03, rayleigh: 1.8, bloom: 0.6, exposure: 0.5 };
const listeners = new Set<() => void>();

export function setControl<K extends keyof SkyControls>(key: K, value: SkyControls[K]): void {
  if (state[key] === value) return;
  state = { ...state, [key]: value };
  listeners.forEach((l) => l());
}

export function initControls(partial: Partial<SkyControls>): void {
  state = { ...state, ...partial };
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

const getSnapshot = () => state;

export function useControls(): SkyControls {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// Subscribe to a single value, so a slider re-renders only itself.
export function useControl<K extends keyof SkyControls>(key: K): SkyControls[K] {
  return useSyncExternalStore(
    subscribe,
    () => state[key],
    () => state[key],
  );
}
