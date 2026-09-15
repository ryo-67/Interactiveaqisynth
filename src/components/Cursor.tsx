// Cursor — the page's own pointer (CURSOR in theme.ts), drawn in the DOM so its states can move rather than snap: a ring that grows over anything clickable, and over the sky or the graph grows further while a glyph fades in at its centre — play or pause for the sky (from the sky's data-cursor, which the scene sets), the drag arrows for the graph. While the pointer is down the ring closes to a filled dot: the press is shown here, once, for every clickable, rather than by each element's own pressed fill; where a glyph sits in the ring the ring fades out as it closes, leaving the icon. A CSS cursor image cannot animate, which is why this is an element that follows the pointer; the native cursor is hidden while it runs (index.css, html.has-cursor) and returns if it unmounts. Fine pointers only. Glyphs are Lucide's (icons.tsx).
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PlayIcon, PauseIcon, MoveHorizontalIcon } from "./icons";
import { CURSOR } from "../utils/theme";

type Mode = "ring" | "pointer" | "play" | "pause" | "drag" | "hidden";
const CLICKABLE = "button:not(:disabled), [role=\"button\"], [role=\"option\"], [role=\"tab\"], a, .scene-volume";

export function Cursor() {
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("hidden");
  const [pressed, setPressed] = useState(false);
  useEffect(() => {
    if (!window.matchMedia?.("(pointer: fine)").matches) return;
    const el = ref.current;
    if (!el) return;
    document.documentElement.classList.add("has-cursor");
    const classify = (t: EventTarget | null): Mode => {
      if (!(t instanceof Element)) return "ring";
      const tagged = t.closest("[data-cursor]");
      if (tagged) return (tagged.getAttribute("data-cursor") as Mode) || "ring";
      return t.closest(CLICKABLE) ? "pointer" : "ring";
    };
    const move = (e: PointerEvent) => {
      el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      setMode(classify(e.target));
    };
    const leave = (e: PointerEvent) => { if (e.relatedTarget == null) setMode("hidden"); };
    const enter = (e: PointerEvent) => setMode(classify(e.target));
    const down = () => setPressed(true);
    const up = () => setPressed(false);
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("pointerup", up, true);
    window.addEventListener("pointercancel", up, true);
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerout", leave);
    document.addEventListener("pointerover", enter);
    return () => {
      window.removeEventListener("pointerdown", down, true);
      window.removeEventListener("pointerup", up, true);
      window.removeEventListener("pointercancel", up, true);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerout", leave);
      document.removeEventListener("pointerover", enter);
      document.documentElement.classList.remove("has-cursor");
    };
  }, []);
  const vars = { "--cur-ring": `${CURSOR.ring}px`, "--cur-pointer": `${CURSOR.pointer}px`, "--cur-glyph-ring": `${CURSOR.glyphRing}px`, "--cur-dot": `${CURSOR.dot}px`, "--cur-glyph": `${CURSOR.glyph}px`, "--cur-stroke": `${CURSOR.stroke}px`, "--cur-ms": `${CURSOR.ms}ms` } as React.CSSProperties;
  // Portaled to the body: the popover is portaled there too and stacks above the scene root, so a cursor inside the root vanished under it (2026-09-15).
  return createPortal(
    <div ref={ref} className="scene-cursor" data-mode={mode} data-pressed={pressed} aria-hidden style={vars}>
      <div className="scene-cursor-ring" />
      <span className="scene-cursor-glyph" data-glyph="play"><PlayIcon size={CURSOR.glyph} /></span>
      <span className="scene-cursor-glyph" data-glyph="pause"><PauseIcon size={CURSOR.glyph} /></span>
      <span className="scene-cursor-glyph" data-glyph="drag"><MoveHorizontalIcon size={CURSOR.glyph} /></span>
    </div>,
    document.body,
  );
}
