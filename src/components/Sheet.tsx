// Sheet (D-65, 2026-10-05) — the phone's bottom sheet, for the day picker. A popover could not hold the day list and the month at 44 pt (about 680 tall, more than a phone has), so on a phone the choice comes up from the bottom, in thumb reach, everything at once. It is portaled into a host inside the scaffold rather than into the body, so its scrim can reach past the window to the screen's edges under Safari's bars like the About scrim (BUG-57), and so it takes the scaffold's tokens. Modal: focus moves in on open, stays in, and returns to the opener on close; Escape, a tap on the scrim, a drag down past DRAG_CLOSE or a choice made close it. Under reduced motion it fades instead of sliding.
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DAY_SHEET } from "../content";
import { XIcon } from "./icons";

const DRAG_CLOSE = 80; // px down before a release closes the sheet: a deliberate pull, more than a thumb's wobble
const SLIDE_MS = 300; // the slide's length, and how long the sheet stays mounted after it closes (index.css .scene-sheet)
const REDUCED = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function Sheet({ open, onClose, label, host, returnTo, children }: { open: boolean; onClose: () => void; label: string; host: HTMLElement | null; returnTo?: React.RefObject<HTMLElement | null>; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [drag, setDrag] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const start = useRef<number | null>(null);
  const wasOpen = useRef(false); // whether the last run of the effect below saw the sheet open: focus goes back only on a real close, never on mount
  // Mount, then show a frame later so the slide runs from the closed state; on close, hand focus back and leave once the slide is over.
  useEffect(() => {
    const closing = wasOpen.current && !open;
    wasOpen.current = open;
    if (open) {
      setMounted(true);
      let inner = 0;
      const outer = requestAnimationFrame(() => { inner = requestAnimationFrame(() => setVisible(true)); });
      return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner); };
    }
    setVisible(false);
    setDrag(0);
    if (closing) returnTo?.current?.focus({ preventScroll: true }); // the opener by reference, not document.activeElement: Safari does not focus a button on a tap, so the element focused when the sheet opened was the body
    const t = setTimeout(() => setMounted(false), SLIDE_MS);
    return () => clearTimeout(t);
  }, [open, returnTo]);
  // Focus in on open; Tab and Shift+Tab cycle inside; Escape closes.
  useEffect(() => {
    if (!visible) return;
    const panel = panelRef.current;
    const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input, [tabindex]:not([tabindex='-1'])") ?? []);
    focusables()[0]?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key !== "Tab") return;
      const f = focusables();
      if (f.length === 0) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, onClose]);
  if (!mounted || !host) return null;
  // The grab handle drags the sheet down with the finger; a release past DRAG_CLOSE closes it, short of that it springs back.
  const onDown = (e: React.PointerEvent) => { start.current = e.clientY; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); };
  const onMove = (e: React.PointerEvent) => { if (start.current != null) setDrag(Math.max(0, e.clientY - start.current)); };
  const onUp = () => { if (start.current == null) return; start.current = null; if (drag > DRAG_CLOSE) onClose(); else setDrag(0); };
  return createPortal(
    <div className="scene-sheet-layer" data-visible={visible} data-reduced={REDUCED}>
      <button className="scene-sheet-scrim" aria-label={DAY_SHEET.close} tabIndex={-1} onClick={onClose} />
      <div ref={panelRef} className="glass frosted scene-sheet" role="dialog" aria-modal="true" aria-label={label} style={drag ? { transform: `translateY(${drag}px)`, transition: "none" } : undefined}>
        <div className="scene-sheet-grab" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} aria-hidden><span /></div>
        {/* A close inside the dialog: the scrim is outside it and a phone has no Escape, so without this a screen reader could leave only by choosing a day. */}
        <button className="scene-play scene-sheet-close" onClick={onClose} aria-label={DAY_SHEET.close}><XIcon size={18} /></button>
        <div className="scene-sheet-body">{children}</div>
      </div>
    </div>,
    host,
  );
}
