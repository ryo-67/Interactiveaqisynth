// StatusLine (2026-10-12) — one face of the live line's pill (LiveStatus, D-60), for the page's other states: a day that did not load, a day still on its way from EPA, a feed that answered with nothing, sound that did not start (content.ts STATUS). Same place, same glass, same layouts, same classes, so every state the page can be in speaks from one spot in one voice.
// A tone, not a style: "error" is the live line's red bezel and cast (something failed, and there is something to do about it); "quiet" is its neutral rim and the page's navy (nothing failed, there is simply nothing, or not yet). The loading face of the live line is "quiet" too.
// One face only, drawn by the shared StatusPill. LiveStatus keeps its own two faces and the morph between them, and stays the live line's own component; ScenePage chooses which of the two speaks (D-69).
import { memo } from "react";
import { StatusPill, type StatusAction } from "./StatusPill";
import { usePresence } from "./usePresence";

export type { StatusAction };

export const StatusLine = memo(function StatusLine({ tone, message, actions = [] }: { tone: "error" | "quiet"; message: string; actions?: StatusAction[] }) {
  const { visible: shown } = usePresence(true, 0); // visible once the arrival has a state to run from; ScenePage unmounts it when its state ends
  return <StatusPill tone={tone} shown={shown} words={[{ text: message, on: true }]} actions={actions} />;
});
