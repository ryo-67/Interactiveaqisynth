// StatusPill — the one pill the page states itself in (D-60, D-69), drawn once for both of its speakers: LiveStatus (the live feed, two faces that morph into each other) and StatusLine (every other state, one face). Glass, tone, message and buttons live here; when a pill appears and which words it shows stay with the speaker. Before 2026-10-14 the two components each carried a copy of this markup and its styles, kept "the same" by a comment.
// A tone, not a style: "error" is the red bezel and cast (something failed and there is something to do about it); "quiet" and "loading" are the neutral rim and the page's navy. "loading" is also the hook index.css uses to collapse the buttons while the live feed is still being asked.
// The message holds every word in one grid cell, so the pill is as wide as the longest and a change of word cross-fades in place rather than resizing (LiveStatus's morph). The buttons are one element, not siblings, so that when the pill stacks on a phone they go under the message together and collapse as one.
import React from "react";
import { Glass } from "./Glass";
import { useTheme, themeColors, families, typeScale, CONTROL, motion, LIVE_EDGE, LIVE_FILL } from "../utils/theme";

export type StatusAction = { label: string; icon: React.ReactNode; onPress: () => void };
export type StatusTone = "error" | "quiet" | "loading";

interface Props {
  tone: StatusTone;
  shown: boolean; // set a frame after mounting, so the arrival has a state to run from
  words: Array<{ text: string; on: boolean }>;
  actions: StatusAction[];
  actionsInert?: boolean; // LiveStatus's buttons while collapsed: out of the tab order and not read out
}

export function StatusPill({ tone, shown, words, actions, actionsInert = false }: Props) {
  const c = themeColors(useTheme());
  const error = tone === "error";
  const button: React.CSSProperties = { padding: "6px 12px 6px 10px", display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", borderRadius: 999, color: c.textPrimary, fontFamily: families.uiCaps, fontSize: typeScale.caption.size, lineHeight: 1.5, whiteSpace: "nowrap", flex: "0 0 auto", minHeight: `var(--ctl-inner, ${CONTROL.inner}px)` };
  const msg: React.CSSProperties = { fontFamily: families.uiCaps, fontSize: typeScale.caption.size, lineHeight: 1.5, color: c.textSecondary };
  return (
    <div className="scene-live-status" data-shown={shown} role="status" aria-live="polite" style={{ "--live-ms": `${motion.beatMs}ms`, "--live-rise": "10px" } as React.CSSProperties}>
      <Glass material="frosted" className="scene-live-pill" data-tone={tone} style={{ "--live-edge": error ? LIVE_EDGE.error : LIVE_EDGE.quiet, "--live-edge-width": `${LIVE_EDGE.width}px`, "--live-edge-contact": LIVE_EDGE.contact, "--glass-fill": error ? LIVE_FILL.error : LIVE_FILL.quiet } as React.CSSProperties}>
        <span className="scene-live-msg">
          {words.map((w) => (
            <span key={w.text} className="scene-live-word" data-on={w.on} aria-hidden={!w.on || undefined} style={msg}>{w.text}</span>
          ))}
        </span>
        {actions.length > 0 && (
          <div className="scene-live-actions" inert={actionsInert ? "" : undefined}>
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
