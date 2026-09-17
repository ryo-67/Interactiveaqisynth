// LiveStatus (D-60, 2026-09-17) — what the live feed is doing, on the one screen where it matters: Live is selected and AirNow has not answered. One glass line above the scene, in the page's own pill vocabulary.
// Two faces on ONE pill, never two pills. UNAVAILABLE carries the ramp's red as a raised bezel and a cast in the fill; LOADING is the same pill with a neutral rim and the page's own navy back. Pressing "Try again" morphs the one into the other and back, rather than cutting: the bezel's colour and the fill are ordinary animatable properties (box-shadow, background-color) and both faces carry the SAME shadow stack, so the browser interpolates them for free.
// Two parts move, not the whole line (Shoro, 2026-09-17). The MESSAGE holds both strings in one grid cell, centred, so it is as wide as the longer of them whichever is showing and the words cross-fade in place. The CONTROLS are a one-track grid that collapses the same way: on laptop the track and the gap before it go to nothing, and because the row keeps its own height the pill's height never changes; on a phone, where they sit under the message, the row track goes with it. Dissolving the whole face at once was tried first and read as two different lines rather than one answering.
// Nothing here is measured. An earlier pass set every width in pixels from getBoundingClientRect and it clipped on Shoro's machine — a pixel read once is wrong the moment the real face loads, the viewport changes or a label does, and what does not fit is silently cut, which cost the Try again button on a phone. A 1fr/0fr track is the browser's own measurement, taken every frame.
// LOADING is held back for a moment (SETTLE_MS) the FIRST time, so a feed that answers quickly never flashes a message; on a retry it appears at once, because it is the answer to a press. Once it is up it stays at least HOLD_MS, so a retry that fails in ten milliseconds still reads as having been asked.
// UNAVAILABLE stays until it is resolved rather than timing out: the page behind it is the placeholder, a dash where the number goes and no plot at all, which on its own says nothing about why. It offers the two things worth doing — play the last day the archive holds, or ask AirNow again — and it does neither on its own (Shoro, 2026-09-17: offer, do not act), so nothing moves under the visitor.
// It is not dismissible and needs no dismiss: choosing a day takes the page off Live and the line goes with it, and coming back to Live brings it back if the feed is still down, which is the truth of the matter.
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Glass } from "./Glass";
import { useTheme, themeColors, families, typeScale, CONTROL, motion, LIVE_EDGE, LIVE_FILL } from "../utils/theme";
import { LIVE_STATUS } from "../content";
import { RefreshIcon, CalendarIcon } from "./icons";

const FADE_MS = motion.beatMs; // the line's own arrival and departure
const SETTLE_MS = motion.beatMs; // one beat of silence before a loading line first appears
const HOLD_MS = motion.beatMs * 2; // and once asked, the least the loading face holds before the error may come back: one beat to morph into it and one to be read, or a feed that fails in half a second reverses before it has arrived
type Face = "loading" | "error";

export function LiveStatus({ status, onArchive, onRetry, archiveReady }: { status: "loading" | "ready" | "unavailable"; onArchive: () => void; onRetry: () => void; archiveReady: boolean }) {
  const c = themeColors(useTheme());
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false); // set a frame after mounting, so the arrival has a state to run from
  const [face, setFace] = useState<Face>("loading");
  const actRef = useRef<HTMLDivElement>(null);
  // The effect below runs on status alone — it must not restart when the things it sets change — so it reads them from refs.
  const mountedRef = useRef(false); mountedRef.current = mounted;
  const faceRef = useRef<Face>("loading"); faceRef.current = face;
  const askedAt = useRef(0);

  useEffect(() => {
    if (status === "ready") {
      setShown(false);
      const t = window.setTimeout(() => setMounted(false), FADE_MS);
      return () => window.clearTimeout(t);
    }
    if (status === "loading") {
      askedAt.current = Date.now();
      if (mountedRef.current) { setFace("loading"); return; } // a retry: answer the press in the frame it was made
      const t = window.setTimeout(() => { setFace("loading"); setMounted(true); }, SETTLE_MS);
      return () => window.clearTimeout(t);
    }
    // Unavailable. If the loading face is up it keeps the rest of its beat first, so the morph is seen either way.
    const wait = mountedRef.current && faceRef.current === "loading" ? Math.max(0, HOLD_MS - (Date.now() - askedAt.current)) : 0;
    const t = window.setTimeout(() => { setFace("error"); setMounted(true); }, wait);
    return () => window.clearTimeout(t);
  }, [status]);

  useEffect(() => {
    if (!mounted) return;
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, [mounted]);

  // What is out takes no focus and is not read out. Set on the node rather than as a prop: inert is not a typed attribute in this React.
  useLayoutEffect(() => {
    actRef.current?.toggleAttribute("inert", face !== "error");
  }, [face, mounted]);

  if (!mounted) return null;
  const error = face === "error";
  const button: React.CSSProperties = { padding: "6px 12px 6px 10px", display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", borderRadius: 999, color: c.textPrimary, fontFamily: families.uiCaps, fontSize: typeScale.caption.size, lineHeight: 1.5, whiteSpace: "nowrap", flex: "0 0 auto", minHeight: `var(--ctl-inner, ${CONTROL.inner}px)` };
  const msg: React.CSSProperties = { fontFamily: families.uiCaps, fontSize: typeScale.caption.size, lineHeight: 1.5, color: c.textSecondary };
  return (
    <div className="scene-live-status" data-shown={shown} role="status" aria-live="polite" style={{ "--live-ms": `${motion.beatMs}ms`, "--live-rise": "10px" } as React.CSSProperties}>
      <Glass material="frosted" className="scene-live-pill" data-tone={face} style={{ "--live-edge": error ? LIVE_EDGE.error : LIVE_EDGE.quiet, "--live-edge-width": `${LIVE_EDGE.width}px`, "--live-edge-contact": LIVE_EDGE.contact, "--glass-fill": error ? LIVE_FILL.error : LIVE_FILL.quiet } as React.CSSProperties}>
        {/* The word swaps: one track opens as the other closes, the two cross-fading across the change. */}
        <span className="scene-live-msg">
          <span className="scene-live-word" data-on={!error} aria-hidden={error} style={msg}>{LIVE_STATUS.loading}</span>
          <span className="scene-live-word" data-on={error} aria-hidden={!error} style={msg}>{LIVE_STATUS.unavailable}</span>
        </span>
        {/* The controls are one element, not two siblings, so that when the pill stacks they go under the message together rather than one being left on the message's row — and so that the pair collapses as one. */}
        <div ref={actRef} className="scene-live-actions">
          <div className="scene-live-actions-row">
            {/* The archive is offered only once its last day is known, which is what the button would move to. */}
            {archiveReady && (
              <button className="scene-play scene-about-btn" onClick={onArchive} style={button}>
                <CalendarIcon size={14} />
                <span>{LIVE_STATUS.toArchive}</span>
              </button>
            )}
            <button className="scene-play scene-about-btn" onClick={onRetry} style={button}>
              <RefreshIcon size={14} />
              <span>{LIVE_STATUS.retry}</span>
            </button>
          </div>
        </div>
      </Glass>
    </div>
  );
}
