// Transport — the first glass control (§5.3): play/pause and volume, bottom center. Its job this sprint is to test the glass material against the sky at four times of day. Glass = backdrop blur + saturation, translucent fill, inset specular edge (.glass in index.css, parameters from theme GLASS via CSS custom properties, with the §5.4 accessibility fallbacks as @media rules).
import React from "react";
import { families, typeScale, space } from "../utils/theme";

interface Props {
  playing: boolean;
  onToggle: () => void;
  volume: number; // 0..1
  onVolume: (v: number) => void;
}

export function Transport({ playing, onToggle, volume, onVolume }: Props) {
  return (
    <div
      className="glass"
      style={{
        position: "fixed",
        bottom: space.lg,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: space.md,
        padding: `${space.sm} ${space.md}`,
      }}
      onClick={(e) => e.stopPropagation()} // the scene's click-anywhere shouldn't fire from the control itself
    >
      <button
        onClick={onToggle}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: families.uiCaps,
          fontSize: typeScale.caption.size,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.92)",
        }}
      >
        {playing ? "Pause" : "Play"}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={(e) => onVolume(Number(e.target.value))}
        aria-label="Volume"
        style={{ width: "96px", accentColor: "rgba(255,255,255,0.85)" }}
      />
    </div>
  );
}
