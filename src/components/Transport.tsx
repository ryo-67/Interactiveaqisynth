// Transport — play/pause and volume, the first glass control (§5.3). Hand-styled, tokens only. The gesture that starts audio must be this button's own click (Tone.start inside the call stack), so the toggle is wired straight to the session's togglePlay.
import React, { useState } from "react";
import { families, typeScale, space } from "../utils/theme";
import { TRANSPORT_PLAY, TRANSPORT_PAUSE, TRANSPORT_VOLUME } from "../content";

interface Props {
  playing: boolean;
  onToggle: () => void;
  onVolume: (db: number) => void;
}

// MAPPING (slider 0..1 → engine dB): the fader is perceptual — 1 is unity, 0.5 is −6 dB, 0.1 is −20 dB, 0 is silence — because a linear-gain fader spends most of its travel in the top few dB.
function sliderToDb(v: number): number {
  return v <= 0.001 ? -60 : 20 * Math.log10(v);
}

export function Transport({ playing, onToggle, onVolume }: Props) {
  const [vol, setVol] = useState(0.65);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: space.md, padding: `${space.xs} ${space.md}` }}>
      <button
        onClick={onToggle}
        aria-pressed={playing}
        style={{
          fontFamily: families.data, fontSize: typeScale.body.size, color: "rgba(255,255,255,0.92)",
          background: "none", border: "none", padding: `${space.xs} 0`, cursor: "pointer", minWidth: "4.5em", textAlign: "left",
        }}
      >
        {playing ? TRANSPORT_PAUSE : TRANSPORT_PLAY}
      </button>
      <input
        type="range" min={0} max={1} step={0.01} value={vol}
        aria-label={TRANSPORT_VOLUME}
        onChange={(e) => { const v = Number(e.target.value); setVol(v); onVolume(sliderToDb(v)); }}
        style={{ width: 96, accentColor: "rgba(255,255,255,0.85)" }}
      />
    </div>
  );
}
