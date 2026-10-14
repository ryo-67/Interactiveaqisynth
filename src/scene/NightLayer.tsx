// NightLayer — the blue of a clear night (NIGHT in theme.ts). The analytic sky models go dark and neutral once the sun is down; a real night sky reads deep blue. A vertical gradient, deeper at the zenith, is screened over the sky so the stars and any warm horizon light stay, from sunset to civil twilight's end and through the night.
// MAPPING (clock → night blue, PM2.5 → its damping): opacity is nightBlend(elevation) × strength, reduced by particulate, because a hazy night is grey-orange, not blue.
import React from "react";
import { NIGHT } from "../utils/theme";
import { clamp01 } from "../utils/math";

interface Props {
  blend: number;    // nightBlend(sunElevationDeg), 0..1
  density?: number; // normalized PM2.5, 0..1
  strength?: number; // override for the harness; defaults to the token
}

// The layer's opacity, exported so the panel prediction (panelLuminance.ts) uses the same formula as the layer it predicts.
export const nightOpacity = (blend: number, density = 0, strength: number = NIGHT.strength): number => clamp01(blend) * strength * (1 - NIGHT.smokeDamping * clamp01(density));

export const NightLayer = React.memo(function NightLayer({ blend, density = 0, strength = NIGHT.strength }: Props) {
  const opacity = nightOpacity(blend, density, strength);
  if (opacity <= 0.002) return null;
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: `linear-gradient(to bottom, ${NIGHT.zenith} 0%, ${NIGHT.horizon} 100%)`,
        mixBlendMode: "screen",
        opacity,
      }}
    />
  );
}, (a, b) => Math.round(a.blend * 100) === Math.round(b.blend * 100) && Math.round((a.density ?? 0) * 100) === Math.round((b.density ?? 0) * 100) && a.strength === b.strength);
