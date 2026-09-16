// Cursor — the page's own pointer (CURSOR in theme.ts), drawn in the DOM so its states can move rather than snap: a ring that grows over anything clickable, and over the sky or the graph grows further while a glyph fades in at its centre — play or pause for the sky (from the sky's data-cursor, which the scene sets), the drag arrows for the graph. While the pointer is down the ring closes to a filled dot: the press is shown here, once, for every clickable, rather than by each element's own pressed fill; where a glyph sits in the ring the ring fades out as it closes, leaving the icon. A CSS cursor image cannot animate, which is why this is an element that follows the pointer; the native cursor is hidden while it runs (index.css, html.has-cursor) and returns if it unmounts. Fine pointers only. Glyphs are Lucide's (icons.tsx).
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PlayIcon, PauseIcon, MoveHorizontalIcon, MoveUpIcon, MoveDownIcon, MoveLeftIcon, MoveRightIcon } from "./icons";
import { CURSOR } from "../utils/theme";

type Mode = "ring" | "pointer" | "play" | "pause" | "drag" | "move-up" | "move-down" | "move-left" | "move-right" | "hidden"; // the four move arrows: a page drag in progress (ScenePage, body data-drag), whatever is under the pointer
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
      const drag = document.body.getAttribute("data-drag");
      if (drag) return drag as Mode; // a page drag owns the cursor until release
      if (!(t instanceof Element)) return "ring";
      const tagged = t.closest("[data-cursor]");
      if (tagged) return (tagged.getAttribute("data-cursor") as Mode) || "ring";
      return t.closest(CLICKABLE) ? "pointer" : "ring";
    };
    let last: [number, number] | null = null;
    const move = (e: PointerEvent) => {
      last = [e.clientX, e.clientY];
      el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      setMode(classify(e.target));
    };
    // The element under the pointer can change what it asks for without the pointer moving: a click or the space bar flips the sky from play to pause. Re-read the point whenever a data-cursor attribute changes anywhere, so the glyph cross-fades to the other (the glyphs' opacity transitions do the fade).
    const reread = () => { if (last) setMode(classify(document.elementFromPoint(last[0], last[1]))); };
    const observer = new MutationObserver(reread);
    observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ["data-cursor", "data-drag"] });
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
      observer.disconnect();
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
      <span className="scene-cursor-glyph" data-glyph="move-up"><MoveUpIcon size={CURSOR.glyph} /></span>
      <span className="scene-cursor-glyph" data-glyph="move-down"><MoveDownIcon size={CURSOR.glyph} /></span>
      <span className="scene-cursor-glyph" data-glyph="move-left"><MoveLeftIcon size={CURSOR.glyph} /></span>
      <span className="scene-cursor-glyph" data-glyph="move-right"><MoveRightIcon size={CURSOR.glyph} /></span>
    </div>,
    document.body,
  );
}
