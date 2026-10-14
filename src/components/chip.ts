// chip — the one small-control style (§5.3): 32 tall (24 on phone), 12 px side padding, corners half the height, caption type. Used by the day navigation, the pins and any other chip so they align by construction. Callers add className="scene-chip" and data-active, which carry the hover and pressed states and the cursor (index.css).
import React from "react";
import { CONTROL, families, typeScale } from "../utils/theme";
import type { themeColors } from "../utils/theme";

export function chipStyle(c: ReturnType<typeof themeColors>, active: boolean, extra?: React.CSSProperties): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    height: `var(--ctl-inner, ${CONTROL.inner}px)`, padding: CONTROL.chipPad, boxSizing: "border-box", flex: "0 0 auto",
    fontFamily: families.ui, letterSpacing: CONTROL.chipTracking, fontSize: typeScale.caption.size, lineHeight: 1, whiteSpace: "nowrap",
    color: active ? c.textPrimary : c.textMuted,
    background: active ? "rgba(255,255,255,0.14)" : "none",
    border: `1px solid ${active ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.14)"}`,
    borderRadius: `calc(var(--ctl-inner, ${CONTROL.inner}px) / 2)`, // fully round, and a multiple of 4 because the height is
    ...extra,
  };
}

// The footer's pill buttons (Shoro, 2026-09-16): the Patch notes button and the credit beside it are the same pill, the same type and the same padding, so they are one style. The glyph sits before the label, hence the extra 2 px on the right.
export function pillButtonStyle(c: ReturnType<typeof themeColors>, extra?: React.CSSProperties): React.CSSProperties {
  return {
    padding: "8px 16px 8px 14px", minHeight: `var(--ctl-pill, ${CONTROL.pillHeight}px)`, boxSizing: "border-box",
    display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999,
    color: c.textSecondary, fontFamily: families.uiCaps, fontSize: typeScale.caption.size, lineHeight: 1.5, whiteSpace: "nowrap",
    ...extra,
  };
}
