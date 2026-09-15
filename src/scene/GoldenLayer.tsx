// GoldenLayer — the golden-hour grade (theme.ts GOLDEN): a warm vertical gradient screened over the low-sun sky, weighted by goldenBlend(elevation) and damped by particulate like the night layer (a hazy dusk is grey-orange already). Composited above the sky, below the smoke.
import React from "react";
import { GOLDEN, NIGHT } from "../utils/theme";

interface Props {
  blend: number;    // goldenBlend(sunElevationDeg), 0..1, eased by the caller
  density?: number; // smoke density 0..1
}

export const GoldenLayer = React.memo(function GoldenLayer({ blend, density = 0 }: Props) {
  const opacity = Math.max(0, Math.min(1, blend)) * GOLDEN.strength * (1 - NIGHT.smokeDamping * Math.max(0, Math.min(1, density)));
  if (opacity <= 0.002) return null;
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: `linear-gradient(to top, ${GOLDEN.horizon} 0%, ${GOLDEN.mid} 45%, ${GOLDEN.zenith} 100%)`,
        mixBlendMode: "screen",
        opacity,
      }}
    />
  );
}, (a, b) => Math.round(a.blend * 100) === Math.round(b.blend * 100) && Math.round((a.density ?? 0) * 100) === Math.round((b.density ?? 0) * 100));
