// PageIndicator (D-43) — the two page icons: Lucide's cloud-sun for the scene and audio-lines for the monitor, drawn straight on the sky with no pill behind them. The active page's icon at the primary text colour, the other at the muted alpha, the transport's own treatment; hover brightens the inactive one (index.css) and the press is the cursor's dot, as everywhere.
import React from "react";
import { useTheme, themeColors, CONTROL, MONITOR } from "../utils/theme";
import { VIEW_LABELS } from "../content";
import { CloudSunIcon, AudioLinesIcon } from "./icons";

export type View = "scene" | "monitor";
export const VIEWS: View[] = ["scene", "monitor"];

export function PageIndicator({ view, onView }: { view: View; onView: (v: View) => void }) {
  const c = themeColors(useTheme());
  const s = `var(--ctl-inner, ${CONTROL.inner}px)`;
  return (
    <div className="scene-views" role="tablist" aria-label="Page">
      {VIEWS.map((v) => {
        const active = v === view;
        return (
          <button
            key={v}
            type="button"
            className="scene-view-btn"
            role="tab"
            aria-selected={active}
            aria-label={VIEW_LABELS[v]}
            onClick={() => onView(v)}
            style={{ width: s, height: s, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", borderRadius: `calc(${s} / 2)`, color: active ? c.textPrimary : `rgba(255,255,255,${MONITOR.iconInactive})`, transition: `color ${CONTROL.stateMs}ms ease` }}
          >
            {v === "scene" ? <CloudSunIcon size={MONITOR.icon} /> : <AudioLinesIcon size={MONITOR.icon} />}
          </button>
        );
      })}
    </div>
  );
}
