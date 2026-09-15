// popoverStore — whether a popover (the calendar, the phone's day menu) is open, for the parts of the page that must behave differently while one is: the sky keeps its ring cursor and swallows the press that dismissed the popover instead of toggling play (2026-09-15). A tiny external store, read with useSyncExternalStore, so the scene re-renders when it changes without threading a prop through the day controls.
import { useSyncExternalStore } from "react";

let open = 0;
let suppressUntil = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function setPopoverOpen(isOpen: boolean): () => void {
  if (!isOpen) return () => {};
  open += 1; emit();
  return () => { open = Math.max(0, open - 1); emit(); };
}
export function usePopoverOpen(): boolean {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => open > 0, () => false);
}
// The press that closed a popover must not also act on what was under it: the dismissal marks the moment, and a click within the next few hundred ms is the same press.
export function markOutsideDismiss(): void { suppressUntil = performance.now() + 400; }
export function consumeSuppressedClick(): boolean { const s = performance.now() < suppressUntil; suppressUntil = 0; return s; }
