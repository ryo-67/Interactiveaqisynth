// Sheet (D-65, 2026-10-05) — the phone's bottom sheet, for the day picker. A popover could not hold the day list and the month at 44 pt (about 680 tall, more than a phone has), so on a phone the choice comes up from the bottom, in thumb reach, everything at once. It is portaled into a host inside the scaffold rather than into the body, so its scrim can reach past the window to the screen's edges under Safari's bars like the About scrim (BUG-57), and so it takes the scaffold's tokens. Modal: focus moves in on open, stays in, and returns to the opener on close; Escape, a tap on the scrim, a drag down past DRAG_CLOSE or a choice made close it. Under reduced motion it fades instead of sliding.
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DAY_SHEET } from "../content";
import { XIcon } from "./icons";

const DRAG_CLOSE = 80; // px along the close axis before a release closes the sheet: a deliberate pull, more than a thumb's wobble
const DRAG_START = 8; // px before a press becomes a drag: under it a press is a tap, so a day or a date under the finger is still chosen
const FLICK = 0.5; // px per ms: a release this fast closes the sheet however short the pull
const SLIDE_MS = 300; // the slide's length, and how long the sheet stays mounted after it closes (index.css .scene-sheet)
const REDUCED = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function Sheet({ open, onClose, label, host, returnTo, children }: { open: boolean; onClose: () => void; label: string; host: HTMLElement | null; returnTo?: React.RefObject<HTMLElement | null>; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [drag, setDrag] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const press = useRef<{ x: number; y: number; t: number; id: number; dragging: boolean } | null>(null);
  const swallowClick = useRef(false); // set by a drag, so the click that ends it does not choose whatever is under the finger
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
  // Drag to close from anywhere on the panel (V2, Shoro, 2026-10-05: only the handle had dragged). The close axis is down in portrait and right in landscape, where the sheet stands at the right edge (the root's data-layout). A press is a tap until it has moved DRAG_START along that axis, and more along it than across it; then it is a drag, the pointer is captured and the panel follows. A release past DRAG_CLOSE, or a flick, closes it; short of that it springs back. A drag swallows its closing click, so the day or date it started on is not chosen; a tap is still a click.
  const landscape = () => host.closest("[data-layout]")?.getAttribute("data-layout") === "phone-landscape";
  type Press = { x: number; y: number };
  const along = (e: React.PointerEvent, p: Press) => (landscape() ? e.clientX - p.x : e.clientY - p.y);
  const across = (e: React.PointerEvent, p: Press) => (landscape() ? e.clientY - p.y : e.clientX - p.x);
  const onDown = (e: React.PointerEvent) => { swallowClick.current = false; press.current = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId, dragging: false }; };
  const onMove = (e: React.PointerEvent) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    const d = along(e, p);
    if (!p.dragging) {
      if (d < DRAG_START || Math.abs(across(e, p)) > d) return;
      p.dragging = true;
      try { panelRef.current?.setPointerCapture(e.pointerId); } catch { /* a pointer the browser no longer knows: the drag still follows moves on the panel */ }
    }
    setDrag(Math.max(0, d));
  };
  const onUp = (e: React.PointerEvent) => {
    const p = press.current;
    press.current = null;
    if (!p || !p.dragging) return;
    swallowClick.current = true;
    const d = Math.max(0, along(e, p)), speed = d / Math.max(1, performance.now() - p.t);
    if (d > DRAG_CLOSE || speed > FLICK) onClose(); else setDrag(0);
  };
  const onCancel = () => { press.current = null; setDrag(0); };
  const onClickCapture = (e: React.MouseEvent) => { if (swallowClick.current) { swallowClick.current = false; e.stopPropagation(); e.preventDefault(); } };
  return createPortal(
    <div className="scene-sheet-layer" data-visible={visible} data-reduced={REDUCED}>
      <button className="scene-sheet-scrim" aria-label={DAY_SHEET.close} tabIndex={-1} onClick={onClose} />
      <div ref={panelRef} className="glass frosted scene-sheet" role="dialog" aria-modal="true" aria-label={label} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onCancel} onClickCapture={onClickCapture} style={drag ? { transform: landscape() ? `translateX(${drag}px)` : `translateY(${drag}px)`, transition: "none" } : undefined}>
        <div className="scene-sheet-grab" aria-hidden><span /></div>
        {/* A close inside the dialog: the scrim is outside it and a phone has no Escape, so without this a screen reader could leave only by choosing a day. */}
        <button className="scene-play scene-sheet-close" onClick={onClose} aria-label={DAY_SHEET.close}><XIcon size={18} /></button>
        <div className="scene-sheet-body">{children}</div>
      </div>
    </div>,
    host,
  );
}
