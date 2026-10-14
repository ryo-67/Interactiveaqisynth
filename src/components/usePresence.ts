// usePresence — an element with an entrance and an exit (2026-10-14; the popover, the day sheet and the About overlay each had a copy). It mounts first and declares itself visible two frames later, so its transition has a start state to leave from (one frame is not always enough for the start state to be committed and painted); on close it stops being visible at once and stays mounted through its exit, then leaves the DOM.
import { useEffect, useState } from "react";

export function usePresence(open: boolean, exitMs: number): { mounted: boolean; visible: boolean } {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      let inner = 0;
      const outer = requestAnimationFrame(() => { inner = requestAnimationFrame(() => setVisible(true)); });
      return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner); };
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), exitMs);
    return () => clearTimeout(t);
  }, [open, exitMs]);
  return { mounted, visible };
}
