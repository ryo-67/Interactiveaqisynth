// GoldenLayer — the golden-hour grade (theme.ts GOLDEN): a warm vertical gradient screened over the low-sun sky, weighted by goldenBlend(elevation) and damped by particulate like the night layer (a hazy dusk is grey-orange already). Composited above the sky, below the smoke.
import React from "react";
import { GOLDEN, NIGHT } from "../utils/theme";
import { clamp01 } from "../utils/math";

interface Props {
  blend: number;    // goldenBlend(sunElevationDeg), 0..1, eased by the caller
  density?: number; // smoke density 0..1
}

// Where the mid colour sits on the gradient, from the horizon up; the panel prediction evaluates the same gradient (panelLuminance.ts).
export const GOLDEN_MID_AT = 0.45;
// The layer's opacity, exported for the same reason as nightOpacity.
export const goldenOpacity = (blend: number, density = 0): number => clamp01(blend) * GOLDEN.strength * (1 - NIGHT.smokeDamping * clamp01(density));

export const GoldenLayer = React.memo(function GoldenLayer({ blend, density = 0 }: Props) {
  const opacity = goldenOpacity(blend, density);
  if (opacity <= 0.002) return null;
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: `linear-gradient(to top, ${GOLDEN.horizon} 0%, ${GOLDEN.mid} ${Math.round(GOLDEN_MID_AT * 100)}%, ${GOLDEN.zenith} 100%)`,
        mixBlendMode: "screen",
        opacity,
      }}
    />
  );
}, (a, b) => Math.round(a.blend * 100) === Math.round(b.blend * 100) && Math.round((a.density ?? 0) * 100) === Math.round((b.density ?? 0) * 100));
