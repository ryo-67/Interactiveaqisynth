// Transport controls (§5.3): a play/pause icon button and a volume slider, each its own glass pill in the page, both 28 tall inside 40-tall pills. Lucide glyphs (icons.tsx), tokens only. The gesture that starts audio must be the button's own click (Tone.start inside the call stack), so the toggle is wired straight to the session's togglePlay.
import React, { useState } from "react";
import { useTheme, themeColors, CONTROL, families, typeScale } from "../utils/theme";
import { TRANSPORT_PLAY, TRANSPORT_PAUSE, TRANSPORT_VOLUME, ABOUT_LABEL } from "../content";
import { PlayIcon, PauseIcon, InfoIcon } from "./icons";

// MAPPING (slider 0..1 → engine dB): the fader is perceptual — 1 is unity, 0.5 is −6 dB, 0.1 is −20 dB, 0 is silence — because a linear-gain fader spends most of its travel in the top few dB.
function sliderToDb(v: number): number {
  return v <= 0.001 ? -60 : 20 * Math.log10(v);
}

export function PlayButton({ playing, onToggle }: { playing: boolean; onToggle: () => void }) {
  const c = themeColors(useTheme());
  const s = `var(--ctl-inner, ${CONTROL.inner}px)`;
  return (
    <button
      className="scene-play"
      onClick={onToggle}
      aria-label={playing ? TRANSPORT_PAUSE : TRANSPORT_PLAY}
      aria-pressed={playing}
      style={{ width: s, height: s, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", borderRadius: `calc(${s} / 2)`, color: c.textPrimary }}
    >
      {/* Lucide's play and pause (icons.tsx), both mounted in the same cell and cross-faded, so the button transitions from one to the other rather than swapping (2026-09-15); the play triangle is shifted a unit right there so it reads centred in the round button. */}
      <span style={{ position: "relative", width: 16, height: 16, display: "inline-block" }}>
        <span aria-hidden style={{ position: "absolute", inset: 0, opacity: playing ? 0 : 1, transition: `opacity ${CONTROL.stateMs}ms ease` }}><PlayIcon size={16} /></span>
        <span aria-hidden style={{ position: "absolute", inset: 0, opacity: playing ? 1 : 0, transition: `opacity ${CONTROL.stateMs}ms ease` }}><PauseIcon size={16} /></span>
      </span>
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
      className="scene-volume"
      // The filled share goes to CSS as --vol; index.css draws the track (the played share light, the rest darker) and the thumb as a small glass element, the same vocabulary as the chips.
      style={{ width: `var(--slider-width, ${CONTROL.sliderWidth}px)`, height: `var(--ctl-inner, ${CONTROL.inner}px)`, margin: 0, display: "block", "--vol": `${(vol * 100).toFixed(1)}%` } as React.CSSProperties}
    />
  );
}

// The About button (Shoro, 2026-09-16): a glass pill where the transport stood on laptop, Lucide's info ring with the label "About this", behaving as the play button does (the same hover fill and the cursor's press). A placeholder for now: the page it opens is the next round's.
export function AboutButton({ onOpen }: { onOpen?: () => void }) {
  const c = themeColors(useTheme());
  const s = `var(--ctl-inner, ${CONTROL.inner}px)`;
  return (
    // The label in the source line's and the credit's style (Shoro, 2026-09-16): the caps face at the caption size, the secondary colour; the icon takes the label's colour so the two read as one lockup.
    <button className="scene-play scene-about-btn" onClick={onOpen} style={{ height: s, padding: "0 12px 0 10px", display: "inline-flex", alignItems: "center", gap: 8, background: "none", border: "none", borderRadius: `calc(${s} / 2)`, color: c.textSecondary, fontFamily: families.uiCaps, fontSize: typeScale.caption.size, lineHeight: 1.5 }}>
      <InfoIcon size={16} />
      <span>{ABOUT_LABEL}</span>
    </button>
  );
}
