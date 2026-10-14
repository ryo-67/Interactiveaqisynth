// LiveStatus (D-60, 2026-09-17) — what the live feed is doing, on the one screen where it matters: Live is selected and AirNow has not answered. One glass line above the scene, in the page's own pill vocabulary.
// Two faces on ONE pill, never two pills. UNAVAILABLE carries the ramp's red as a raised bezel and a cast in the fill; LOADING is the same pill with a neutral rim and the page's own navy back. Pressing "Try again" morphs the one into the other and back, rather than cutting: the bezel's colour and the fill are ordinary animatable properties (box-shadow, background-color) and both faces carry the SAME shadow stack, so the browser interpolates them for free.
// Two parts move, not the whole line (Shoro, 2026-09-17). The MESSAGE holds both strings in one grid cell, centred, so it is as wide as the longer of them whichever is showing and the words cross-fade in place. The CONTROLS are a one-track grid that collapses the same way: on laptop the track and the gap before it go to nothing, and because the row keeps its own height the pill's height never changes; on a phone, where they sit under the message, the row track goes with it. Dissolving the whole face at once was tried first and read as two different lines rather than one answering.
// Nothing here is measured. An earlier pass set every width in pixels from getBoundingClientRect and it clipped on Shoro's machine — a pixel read once is wrong the moment the real face loads, the viewport changes or a label does, and what does not fit is silently cut, which cost the Try again button on a phone. A 1fr/0fr track is the browser's own measurement, taken every frame.
// LOADING is held back for a moment (SETTLE_MS) the FIRST time, so a feed that answers quickly never flashes a message; on a retry it appears at once, because it is the answer to a press. Once it is up it stays at least HOLD_MS, so a retry that fails in ten milliseconds still reads as having been asked.
// UNAVAILABLE stays until it is resolved rather than timing out: the page behind it is the placeholder, a dash where the number goes and no plot at all, which on its own says nothing about why. It offers the two things worth doing — play the last day the archive holds, or ask AirNow again — and it does neither on its own (Shoro, 2026-09-17: offer, do not act), so nothing moves under the visitor.
// It is not dismissible and needs no dismiss: choosing a day takes the page off Live and the line goes with it, and coming back to Live brings it back if the feed is still down, which is the truth of the matter.
import { useEffect, useRef, useState, memo } from "react";
import { usePresence } from "./usePresence";
import { StatusPill, type StatusAction } from "./StatusPill";
import { motion } from "../utils/theme";
import { LIVE_STATUS } from "../content";
import { RefreshIcon, CalendarIcon } from "./icons";

const FADE_MS = motion.beatMs; // the line's own arrival and departure
const SETTLE_MS = motion.beatMs; // one beat of silence before a loading line first appears
const HOLD_MS = motion.beatMs * 2; // and once asked, the least the loading face holds before the error may come back: one beat to morph into it and one to be read, or a feed that fails in half a second reverses before it has arrived
type Face = "loading" | "error";

export const LiveStatus = memo(function LiveStatus({ status, onArchive, onRetry, archiveReady }: { status: "loading" | "ready" | "unavailable"; onArchive: () => void; onRetry: () => void; archiveReady: boolean }) {
  const [up, setUp] = useState(false); // whether the line should be up; its arrival and departure are usePresence's
  const { mounted, visible: shown } = usePresence(up, FADE_MS);
  const [face, setFace] = useState<Face>("loading");
  // The effect below runs on status alone — it must not restart when the things it sets change — so it reads them from refs.
  const upRef = useRef(false); upRef.current = up;
  const faceRef = useRef<Face>("loading"); faceRef.current = face;
  const askedAt = useRef(0);

  useEffect(() => {
    if (status === "ready") { setUp(false); return; }
    if (status === "loading") {
      askedAt.current = Date.now();
      if (upRef.current) { setFace("loading"); return; } // a retry: answer the press in the frame it was made
      const t = window.setTimeout(() => { setFace("loading"); setUp(true); }, SETTLE_MS);
      return () => window.clearTimeout(t);
    }
    // Unavailable. If the loading face is up it keeps the rest of its beat first, so the morph is seen either way.
    const wait = upRef.current && faceRef.current === "loading" ? Math.max(0, HOLD_MS - (Date.now() - askedAt.current)) : 0;
    const t = window.setTimeout(() => { setFace("error"); setUp(true); }, wait);
    return () => window.clearTimeout(t);
  }, [status]);

  if (!mounted) return null;
  const error = face === "error";
  // The archive is offered only once its last day is known, which is what the button would move to.
  const actions: StatusAction[] = [
    ...(archiveReady ? [{ label: LIVE_STATUS.toArchive, icon: <CalendarIcon size={14} />, onPress: onArchive }] : []),
    { label: LIVE_STATUS.retry, icon: <RefreshIcon size={14} />, onPress: onRetry },
  ];
  // The word swaps: one track opens as the other closes, the two cross-fading across the change.
  return <StatusPill tone={face} shown={shown} words={[{ text: LIVE_STATUS.loading, on: !error }, { text: LIVE_STATUS.unavailable, on: error }]} actions={actions} actionsInert={!error} />; // the collapsed buttons take no focus and are not read out
});
