// Entry (D-61, 2026-09-17) — the one screen before the tool. The scene used to mount the moment the page did and sit there looking empty while AirNow was asked: a dash where the number goes, no plot, a sky with no day behind it. Nothing was broken and nothing said so.
// It is the page's own material, not a splash laid over it (Shoro, 2026-09-17): the sky is already rendering underneath, so this is the About overlay's treatment — a blur of what is there under a navy tint — with one frosted panel on it, the title in the editorial serif, the line in the UI caps, and the monitor's own 4 px meter beneath, breathing on the beat instead of reporting a value. The same substance as everything else, at the one moment there is nothing else.
// A FLOOR as well as a ceiling (Shoro: it flickered and could not be judged). It stays at least MIN_MS whatever the feed does, so a cached answer cannot flash it, and it goes at MAX_MS whatever the feed does, since the fetch behind it has its own 30-second ceiling and nobody should watch a title for that long; the live line carries the rest from inside.
// The scene does not appear from behind it, it comes UP with it (Shoro, 2026-09-17): the page's material and the sky are both at nothing while this is held and blend to full as it lifts, so the two cross rather than one being pulled off the other. ScenePage does that from onLift.
// It is only ever the FIRST moment. A later fetch — the retry on the live line — never brings it back; by then the visitor is inside and the page should not be taken away from them.
import React, { useEffect, useRef, useState } from "react";
import { Glass } from "./Glass";
import { useTheme, themeColors, families, typeScale, motion } from "../utils/theme";
import { ENTRY } from "../content";

const FADE_MS = motion.beatMs; // one beat to lift
const MIN_MS = motion.beatMs * 2; // and two on screen before it may
const MAX_MS = 6000;
const STEPS = 16; // a bar of the piece: sixteen steps, as the pulse lane has (§3.2)
const BAR_MS = motion.beatMs * 4; // and four beats to cross it

const REDUCED = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function Entry({ ready, onLift, onGone }: { ready: boolean; onLift: () => void; onGone: () => void }) {
  const c = themeColors(useTheme());
  const [done, setDone] = useState(false);
  const [lifting, setLifting] = useState(false);
  const born = useRef(Date.now());
  // Lift when the air has been read, but never before the floor; and lift at the ceiling whether it has or not.
  useEffect(() => {
    const wait = ready ? Math.max(0, MIN_MS - (Date.now() - born.current)) : Math.max(0, MAX_MS - (Date.now() - born.current));
    const t = window.setTimeout(() => { setLifting(true); onLift(); }, wait);
    return () => window.clearTimeout(t);
  }, [ready, onLift]);
  useEffect(() => {
    if (!lifting) return;
    const t = window.setTimeout(() => { setDone(true); onGone(); }, FADE_MS);
    return () => window.clearTimeout(t);
  }, [lifting, onGone]);
  if (done) return null;
  return (
    <div className="scene-entry" data-lifting={lifting} role="status" aria-live="polite" style={{ "--entry-ms": `${FADE_MS}ms` } as React.CSSProperties}>
      <Glass material="frosted" className="scene-entry-panel">
        {/* A step under the heading size (Shoro, 2026-09-17: too big for the panel it sits in), still stepping with the breakpoint. */}
        <h1 style={{ margin: 0, fontFamily: families.serifItalic, fontStyle: "italic", fontWeight: 400, fontSize: `calc(var(--heading-size, ${typeScale.heading.size}) * 0.7)`, lineHeight: 1.2, color: c.textPrimary }}>{ENTRY.title}</h1>
        <p style={{ margin: 0, fontFamily: families.uiCaps, fontSize: typeScale.caption.size, lineHeight: 1.5, color: c.textMuted }}>{ENTRY.line}</p>
        {/* The pulse lane, borrowed from the monitor (Gauges.tsx Lane): sixteen steps, a bar of the piece, lighting one at a time on the beat and leaving the lit ones behind. A bar fills, clears and fills again, so what is on screen while the air is read is the sequencer warming up rather than a spinner. Each step's delay is its own position in the bar; under prefers-reduced-motion the bar simply stands filled. */}
        <div className="scene-lane scene-entry-lane" aria-hidden data-still={REDUCED}>
          {Array.from({ length: STEPS }, (_, i) => (
            <span key={i} className="scene-lane-step" style={{ animationDelay: `${((i / STEPS) * BAR_MS).toFixed(0)}ms` }} />
          ))}
        </div>
      </Glass>
    </div>
  );
}
