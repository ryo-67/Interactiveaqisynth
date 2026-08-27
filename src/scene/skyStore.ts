// skyStore — tuning state kept outside React, in two halves.
// `controls` are the live slider values: they change on every drag tick and only the live preview and the dragged slider read them, so the grid never repaints mid-drag (every cell is a WebGL context).
// `applied` and `ranges` change only when Apply is pressed. The grid reads those, so the benchmark rows are stable until you deliberately push a change into them.
import { useSyncExternalStore } from "react";
import { SKY_RANGES } from "../utils/theme";

export interface SkyControls {
  turbidity: number;
  mie: number;
  rayleigh: number;
  bloom: number;
  exposure: number;
}

// The runtime copy of theme.ts SKY_RANGES. Editing the ends here re-renders the real-day rows through the mapping, which is how those rows become benchmarkable.
export interface SkyRanges {
  turbidity: { clear: number; suffocating: number };
  mieCoefficient: { clear: number; high: number };
  mieDirectionalG: number;
  rayleigh: { lowO3: number; highO3: number };
  bloomIntensity: { lowO3: number; highO3: number };
  discBrightness: { lowO3: number; highO3: number };
  exposure: { lowO3: number; highO3: number };
}

let controls: SkyControls = { turbidity: 8, mie: 0.03, rayleigh: 1.8, bloom: 0.6, exposure: 0.5 };
let applied: SkyControls = { ...controls };
let ranges: SkyRanges = {
  turbidity: { ...SKY_RANGES.turbidity },
  mieCoefficient: { ...SKY_RANGES.mieCoefficient },
  mieDirectionalG: SKY_RANGES.mieDirectionalG,
  rayleigh: { ...SKY_RANGES.rayleigh },
  bloomIntensity: { ...SKY_RANGES.bloomIntensity },
  discBrightness: { ...SKY_RANGES.discBrightness },
  exposure: { ...SKY_RANGES.exposure },
};

const controlListeners = new Set<() => void>();
const gridListeners = new Set<() => void>();

export function setControl<K extends keyof SkyControls>(key: K, value: SkyControls[K]): void {
  if (controls[key] === value) return;
  controls = { ...controls, [key]: value };
  controlListeners.forEach((l) => l());
}

export function initControls(partial: Partial<SkyControls>): void {
  controls = { ...controls, ...partial };
  applied = { ...controls };
}

// Push the current slider values into every benchmark view.
export function applyToGrid(): void {
  applied = { ...controls };
  gridListeners.forEach((l) => l());
}

// Write the current slider values into one end of the ranges, so the real-day rows re-render through the tuned mapping.
export function applyAsRangeEnd(end: "clear" | "smoke"): void {
  ranges =
    end === "clear"
      ? {
          ...ranges,
          turbidity: { ...ranges.turbidity, clear: controls.turbidity },
          mieCoefficient: { ...ranges.mieCoefficient, clear: controls.mie },
          rayleigh: { ...ranges.rayleigh, lowO3: controls.rayleigh },
          bloomIntensity: { ...ranges.bloomIntensity, lowO3: controls.bloom },
          exposure: { ...ranges.exposure, lowO3: controls.exposure },
        }
      : {
          ...ranges,
          turbidity: { ...ranges.turbidity, suffocating: controls.turbidity },
          mieCoefficient: { ...ranges.mieCoefficient, high: controls.mie },
          rayleigh: { ...ranges.rayleigh, highO3: controls.rayleigh },
          bloomIntensity: { ...ranges.bloomIntensity, highO3: controls.bloom },
          exposure: { ...ranges.exposure, highO3: controls.exposure },
        };
  applied = { ...controls };
  gridListeners.forEach((l) => l());
}

export function resetRanges(): void {
  ranges = {
    turbidity: { ...SKY_RANGES.turbidity },
    mieCoefficient: { ...SKY_RANGES.mieCoefficient },
    mieDirectionalG: SKY_RANGES.mieDirectionalG,
    rayleigh: { ...SKY_RANGES.rayleigh },
    bloomIntensity: { ...SKY_RANGES.bloomIntensity },
    discBrightness: { ...SKY_RANGES.discBrightness },
    exposure: { ...SKY_RANGES.exposure },
  };
  gridListeners.forEach((l) => l());
}

const subControls = (l: () => void) => (controlListeners.add(l), () => controlListeners.delete(l));
const subGrid = (l: () => void) => (gridListeners.add(l), () => gridListeners.delete(l));

export function useControls(): SkyControls {
  return useSyncExternalStore(subControls, () => controls, () => controls);
}

export function useControl<K extends keyof SkyControls>(key: K): SkyControls[K] {
  return useSyncExternalStore(subControls, () => controls[key], () => controls[key]);
}

// Grid subscriptions: these fire only on Apply.
export function useApplied(): SkyControls {
  return useSyncExternalStore(subGrid, () => applied, () => applied);
}

export function useRanges(): SkyRanges {
  return useSyncExternalStore(subGrid, () => ranges, () => ranges);
}

export function getRanges(): SkyRanges {
  return ranges;
}
