// chip — the one small-control style (§5.3): 28 tall, 12 px side padding, pill radius, caption type. Used by the day navigation, the pins and any other chip so they align by construction.
import React from "react";
import { CONTROL, families, typeScale } from "../utils/theme";
import type { themeColors } from "../utils/theme";

export function chipStyle(c: ReturnType<typeof themeColors>, active: boolean, extra?: React.CSSProperties): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    height: `var(--ctl-inner, ${CONTROL.inner}px)`, padding: CONTROL.chipPad, boxSizing: "border-box", flex: "0 0 auto",
    fontFamily: families.data, fontSize: typeScale.caption.size, lineHeight: 1, cursor: "pointer", whiteSpace: "nowrap",
    color: active ? c.textPrimary : c.textMuted,
    background: active ? "rgba(255,255,255,0.14)" : "none",
    border: `1px solid ${active ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.14)"}`,
    borderRadius: 999,
    ...extra,
  };
}
