// StatusLine (2026-10-12) — one face of the live line's pill (LiveStatus, D-60), for the page's other states: a day that did not load, a day still on its way from EPA, a feed that answered with nothing, sound that did not start (content.ts STATUS). Same place, same glass, same layouts, same classes, so every state the page can be in speaks from one spot in one voice.
// A tone, not a style: "error" is the live line's red bezel and cast (something failed, and there is something to do about it); "quiet" is its neutral rim and the page's navy (nothing failed, there is simply nothing, or not yet). The loading face of the live line is "quiet" too.
// One face only. LiveStatus keeps its own two faces and the morph between them; when these states are wired to their causes it becomes a StatusLine with that morph, rather than a second copy of the pill.
import React, { useEffect, useState } from "react";
import { Glass } from "./Glass";
import { useTheme, themeColors, families, typeScale, CONTROL, motion, LIVE_EDGE, LIVE_FILL } from "../utils/theme";

export type StatusAction = { label: string; icon: React.ReactNode; onPress: () => void };

export function StatusLine({ tone, message, actions = [] }: { tone: "error" | "quiet"; message: string; actions?: StatusAction[] }) {
  const c = themeColors(useTheme());
  const [shown, setShown] = useState(false); // set a frame after mounting, so the arrival has a state to run from, as the live line's
  useEffect(() => {
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, []);
  const error = tone === "error";
  // The live line's own button and message styles (LiveStatus.tsx), so the two cannot drift apart in type.
  const button: React.CSSProperties = { padding: "6px 12px 6px 10px", display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", borderRadius: 999, color: c.textPrimary, fontFamily: families.uiCaps, fontSize: typeScale.caption.size, lineHeight: 1.5, whiteSpace: "nowrap", flex: "0 0 auto", minHeight: `var(--ctl-inner, ${CONTROL.inner}px)` };
  const msg: React.CSSProperties = { fontFamily: families.uiCaps, fontSize: typeScale.caption.size, lineHeight: 1.5, color: c.textSecondary };
  return (
    <div className="scene-live-status" data-shown={shown} role="status" aria-live="polite" style={{ "--live-ms": `${motion.beatMs}ms`, "--live-rise": "10px" } as React.CSSProperties}>
      <Glass material="frosted" className="scene-live-pill" data-tone={tone} style={{ "--live-edge": error ? LIVE_EDGE.error : LIVE_EDGE.quiet, "--live-edge-width": `${LIVE_EDGE.width}px`, "--live-edge-contact": LIVE_EDGE.contact, "--glass-fill": error ? LIVE_FILL.error : LIVE_FILL.quiet } as React.CSSProperties}>
        <span className="scene-live-msg">
          <span className="scene-live-word" data-on style={msg}>{message}</span>
        </span>
        {actions.length > 0 && (
          <div className="scene-live-actions">
            <div className="scene-live-actions-row">
              {actions.map((a) => (
                <button key={a.label} className="scene-play scene-about-btn" onClick={a.onPress} style={button}>
                  {a.icon}
                  <span>{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </Glass>
    </div>
  );
}
