// Transport controls (§5.3): a play/pause icon button and a volume slider, each its own glass pill in the page, both 28 tall inside 40-tall pills. Hand-drawn glyphs, tokens only. The gesture that starts audio must be the button's own click (Tone.start inside the call stack), so the toggle is wired straight to the session's togglePlay.
import React, { useState } from "react";
import { useTheme, themeColors, CONTROL } from "../utils/theme";
import { TRANSPORT_PLAY, TRANSPORT_PAUSE, TRANSPORT_VOLUME } from "../content";

// MAPPING (slider 0..1 → engine dB): the fader is perceptual — 1 is unity, 0.5 is −6 dB, 0.1 is −20 dB, 0 is silence — because a linear-gain fader spends most of its travel in the top few dB.
function sliderToDb(v: number): number {
  return v <= 0.001 ? -60 : 20 * Math.log10(v);
}

export function PlayButton({ playing, onToggle }: { playing: boolean; onToggle: () => void }) {
  const c = themeColors(useTheme());
  const s = `var(--ctl-inner, ${CONTROL.inner}px)`;
  return (
    <button
      onClick={onToggle}
      aria-label={playing ? TRANSPORT_PAUSE : TRANSPORT_PLAY}
      aria-pressed={playing}
      style={{ width: s, height: s, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", borderRadius: `calc(${s} / 2)`, cursor: "pointer", color: c.textPrimary }}
    >
      {/* Glyphs on a 16-unit box: a triangle for play, two 4-wide bars for pause. */}
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden focusable="false">
        {playing ? (
          <>
            <rect x="2" y="1" width="4" height="14" rx="1" fill="currentColor" />
            <rect x="10" y="1" width="4" height="14" rx="1" fill="currentColor" />
          </>
        ) : (
          <path d="M3 1.5 L14 8 L3 14.5 Z" fill="currentColor" />
        )}
      </svg>
    </button>
  );
}

export function VolumeSlider({ onVolume }: { onVolume: (db: number) => void }) {
  const [vol, setVol] = useState(0.65);
  return (
    <input
      type="range" min={0} max={1} step={0.01} value={vol}
      aria-label={TRANSPORT_VOLUME}
      onChange={(e) => { const v = Number(e.target.value); setVol(v); onVolume(sliderToDb(v)); }}
      style={{ width: `var(--slider-width, ${CONTROL.sliderWidth}px)`, height: `var(--ctl-inner, ${CONTROL.inner}px)`, margin: 0, display: "block", accentColor: "rgba(255,255,255,0.85)" }}
    />
  );
}
