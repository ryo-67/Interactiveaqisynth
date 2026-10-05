// useSafariWindow (BUG-57, 2026-10-05) — the scene under Safari's bars. Safari 26 draws page content, never a fixed box, under its status bar and toolbar, and at scroll 0 draws nothing of the page under the status bar at all, only a solid from the page's background (index.css "Under Safari's bars"). So the scene is page content, as tall as the screen plus a runway of sky above it, and this hook does the three things CSS cannot:
//   1. --screen-h: the physical screen's height in this orientation. On iOS 26 100lvh is a status bar short of the screen while the page starts at the screen's top, and the gap showed as a second band under the toolbar (Shoro's iPhone, V2). screen.width and .height are the glass's own size and do not swap on rotation, so the longer side is the height in portrait and the shorter in landscape.
//   2. --win-t/r/b/l: the window Safari leaves between its bars, read from a fixed probe (Safari lays fixed boxes out exactly there) as the gap on each side between it and the root. The scaffold sits in it, the scrims reach past it.
//   3. The sky's frame: the sun is placed by real angles through the sky's camera, and the camera's field of view used to span the whole canvas, which was the viewport. The canvas is now the screen plus the runway, so every elevation landed higher and a high sun sat under the status bar (Shoro's iPhone, V3). The camera is framed instead on the screen below the window's top — the window's top to the glass's bottom edge, so the horizon rule still holds at the bottom (SkyView frameTop) — and the canvas above that frame, the runway and the status bar, renders as overscan: sky going on out of frame. The sun's path is planned in that frame's aspect (useListenSession, skyFrameAspect).
//   4. The runway: the page is scrolled down by --runway and held there, so Safari is never at scroll 0 and composites the sky under the status bar (1ar.io's fix for full-screen media). The page has no scroll of its own to lose: html's touch-action keeps hands off it, and anything else that moves it (a wheel, Safari's own adjustments, a restored position) is put back.
// Off iOS --runway is 0 and the probe is the viewport, so every value comes out 0 and the root is the viewport: nothing is written for the screen height there, and the hold keeps the page at 0.
import { useLayoutEffect, useState, type RefObject } from "react";

let frameAspect: number | null = null;
// The aspect of the sky camera's frame, for the sun's path (sunPath.ts plans in that frame's screen space). Before the first measure, the viewport's, which is what the frame is off iOS.
export const skyFrameAspect = () => frameAspect ?? window.innerWidth / Math.max(1, window.innerHeight);

// Returns the sky frame's top: how far down the root (and the sky canvas, which fills it) the camera's frame begins, in CSS px. 0 off iOS.
export function useSafariWindow(rootRef: RefObject<HTMLElement | null>, probeRef: RefObject<HTMLElement | null>): number {
  const [frameTop, setFrameTop] = useState(0);
  useLayoutEffect(() => {
    const root = rootRef.current, probe = probeRef.current;
    if (!root || !probe) return;
    const html = document.documentElement;
    if ("scrollRestoration" in history) history.scrollRestoration = "manual"; // a reload would otherwise land wherever the last visit left the page, before the hold puts it back
    const runway = () => parseFloat(getComputedStyle(html).getPropertyValue("--runway")) || 0;
    const hold = () => { const r = runway(); if (Math.abs(window.scrollY - r) > 0.5 || window.scrollX !== 0) window.scrollTo(0, r); };
    const measure = () => {
      if (runway() > 0) {
        const long = Math.max(screen.width, screen.height), short = Math.min(screen.width, screen.height);
        html.style.setProperty("--screen-h", `${window.matchMedia("(orientation: portrait)").matches ? long : short}px`);
      }
      // In the DOCUMENT's coordinates, at the scroll the page is held at: the root scrolls and the probe does not, so their difference in the viewport changes with the scroll, and measured at scroll 0 before the hold moved the page it put the scaffold a runway too high, under the status bar (Shoro's iPhone, V3). The probe's place in the document once held is the runway plus its place in the viewport, whether or not the scroll has landed yet.
      const held = runway(), w = probe.getBoundingClientRect(), r = root.getBoundingClientRect();
      const rootTop = r.top + window.scrollY, rootBottom = r.bottom + window.scrollY;
      const winT = Math.max(0, held + w.top - rootTop);
      root.style.setProperty("--win-t", `${winT}px`);
      root.style.setProperty("--win-r", `${Math.max(0, r.right - w.right)}px`);
      root.style.setProperty("--win-b", `${Math.max(0, rootBottom - (held + w.bottom))}px`);
      root.style.setProperty("--win-l", `${Math.max(0, w.left - r.left)}px`);
      frameAspect = r.width / Math.max(1, r.height - winT);
      setFrameTop(winT);
      hold();
    };
    measure();
    const vv = window.visualViewport;
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    window.addEventListener("pageshow", measure);
    vv?.addEventListener("resize", measure);
    window.addEventListener("scroll", hold, { passive: true });
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      window.removeEventListener("pageshow", measure);
      vv?.removeEventListener("resize", measure);
      window.removeEventListener("scroll", hold);
    };
  }, [rootRef, probeRef]);
  return frameTop;
}
