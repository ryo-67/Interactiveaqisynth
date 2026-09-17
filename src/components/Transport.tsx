// Transport controls (§5.3): a play/pause icon button and a volume slider, each its own glass pill in the page, both 28 tall inside 40-tall pills. Lucide glyphs (icons.tsx), tokens only. The gesture that starts audio must be the button's own click (Tone.start inside the call stack), so the toggle is wired straight to the session's togglePlay.
import React, { useState, useRef, useLayoutEffect, forwardRef } from "react";
import { useTheme, themeColors, CONTROL, families, typeScale } from "../utils/theme";
import { TRANSPORT_PLAY, TRANSPORT_PAUSE, TRANSPORT_VOLUME, ABOUT_LABEL, ABOUT } from "../content";
import { PlayIcon, PauseIcon, NotebookTextIcon, MinimizeIcon, XIcon } from "./icons";
import { Glass } from "./Glass";

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

// The Patch notes button (Shoro, 2026-09-16): a frosted pill in the credit's exact shape, padding and type, Lucide's notebook-text before the label, behaving as the play button does (the hover and pressed fills, the cursor's press). It opens the About overlay (D-56) and is itself the way out of it: while the overlay is up it becomes "Exhale" on laptop (the glyph dissolving into Lucide's minimize, the label cross-fading into the new one inside a cell whose width carries the pill from one to the other, the labels cut by the pill's own edge) and a round dismiss at the row's centre below laptop (the glyph into a close mark, the label going with the width, the pill sliding over). The one element morphs in place, stacked above the overlay (index.css .scene-patch, z-index 31 in the scaffold the overlay is drawn in): a twin drawn over the overlay on open was mounted and measured in the same frame it had to morph, and now and then it skipped the morph. A slot the pill's resting size holds its place in the bar's layout, so the row does not re-centre as the pill narrows.
type AboutForm = "exhale" | "dismiss";
export const AboutButton = forwardRef<HTMLButtonElement, { onPress?: () => void; open?: boolean; form?: AboutForm }>(function AboutButton({ onPress, open = false, form = "exhale" }, ref) {
  const c = themeColors(useTheme());
  const glassRef = useRef<HTMLDivElement>(null);
  const probePatch = useRef<HTMLSpanElement>(null);
  const probeExhale = useRef<HTMLSpanElement>(null);
  const [w, setW] = useState({ patch: 0, exhale: 0, h: 0 }); // the two labels' widths, and the pill's height
  const [dx, setDx] = useState(0); // the slide to the row's centre, below laptop
  // Measured from hidden copies of the two labels (fonts included) and the slot's height; the slide from where the slot is. Again on resize, when the fonts arrive, and whenever the overlay opens or closes, since the bar may have re-flowed since.
  useLayoutEffect(() => {
    const measure = () => {
      const p = probePatch.current, e = probeExhale.current, g = glassRef.current;
      if (!p || !e || !g) return;
      const slot = g.parentElement!.getBoundingClientRect();
      setW({ patch: p.getBoundingClientRect().width, exhale: e.getBoundingClientRect().width, h: slot.height });
      setDx(window.innerWidth / 2 - (slot.left + slot.height / 2));
    };
    measure();
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, form]);
  const dismiss = open && form === "dismiss";
  const exhale = open && form === "exhale";
  // The morph (Shoro, 2026-09-16, the fourth cut): the pill's width is never set; it is the sum of its parts, and the part that changes is the LABEL CELL, whose width eases from one label's to the other's while the two labels cross-fade inside it. The pill's edge therefore follows the incoming label exactly, with no reveal of a clipped label at one end and no gap of padding at the other, which a fixed-width pill with a switched string had shown on the way in and out. For the round dismiss the cell closes to nothing and the gap and padding close with it.
  const cellWidth = w.patch > 0 ? (dismiss ? 0 : exhale ? w.exhale : w.patch) : undefined;
  const base: React.CSSProperties = { padding: "8px 16px 8px 14px", minHeight: `var(--ctl-pill, ${CONTROL.pillHeight}px)`, display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", borderRadius: 999, color: c.textSecondary, fontFamily: families.uiCaps, fontSize: typeScale.caption.size, lineHeight: 1.5, whiteSpace: "nowrap" };
  const probe: React.CSSProperties = { position: "absolute", left: -9999, top: -9999, visibility: "hidden", pointerEvents: "none", whiteSpace: "nowrap" };
  const cell = (on: boolean): React.CSSProperties => ({ position: "absolute", left: 0, top: 0, bottom: 0, display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", opacity: on ? 1 : 0, transition: "opacity var(--about-ms, 667ms) ease" });
  return (
    <div className="scene-patch-slot">
      {/* The slot's size: a hidden copy of the resting content, in the flow. */}
      <span aria-hidden className="scene-patch-size" style={{ ...base, visibility: "hidden" }}><NotebookTextIcon size={14} /><span>{ABOUT_LABEL}</span></span>
      <Glass ref={glassRef} material="frosted" className="scene-about-pill scene-patch" data-open={open} style={{ transform: dismiss ? `translateX(${dx.toFixed(1)}px)` : undefined }}>
        <button ref={ref} className="scene-play scene-about-btn" onClick={onPress} aria-label={open ? (form === "exhale" ? ABOUT.close : ABOUT.dismiss) : undefined} aria-expanded={open} style={{ ...base, height: "100%", boxSizing: "border-box", ...(dismiss ? { padding: "8px 10px", gap: 0 } : {}), transition: "padding var(--about-ms, 667ms) ease, gap var(--about-ms, 667ms) ease" }}>
          <span style={{ position: "relative", width: 14, height: 14, flex: "0 0 auto", display: "inline-block" }}>
            <span aria-hidden style={{ ...cell(!open), right: 0 }}><NotebookTextIcon size={14} /></span>
            <span aria-hidden style={{ ...cell(open), right: 0 }}>{form === "exhale" ? <MinimizeIcon size={14} /> : <XIcon size={14} />}</span>
          </span>
          {/* The cell carries the pill's width from one label to the other; it does NOT clip (Shoro, 2026-09-16). The label overflows it and is cut by the pill's own rounded edge, which the Glass clips, so a label leaving is eaten by the frame rather than by an invisible box inside it. */}
          <span style={{ position: "relative", flex: "0 0 auto", height: "1.5em", width: cellWidth, transition: "width var(--about-ms, 667ms) ease" }}>
            <span aria-hidden={open} style={cell(!open)}>{ABOUT_LABEL}</span>
            {form === "exhale" && <span aria-hidden={!open} style={cell(open)}>{ABOUT.close}</span>}
          </span>
          <span ref={probePatch} aria-hidden style={probe}>{ABOUT_LABEL}</span>
          <span ref={probeExhale} aria-hidden style={probe}>{ABOUT.close}</span>
        </button>
      </Glass>
    </div>
  );
});
