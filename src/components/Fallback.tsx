// Fallback (2026-10-12) — the page when there is no page: an error it cannot recover from, or a browser that cannot draw the sky. What the error boundary around the page shows (ErrorBoundary.tsx; BUG-59's lesson: one throw blanked everything), and what main.tsx shows instead of the page when the browser has no WebGL 2 (FALLBACK in content.ts, D-69).
// It is the entry screen's panel (Entry.tsx, D-61) with the scene gone from behind it, because when this shows the scene has unmounted or never could mount: the same frosted panel at the popover's fixed fill, the title in the editorial serif, one line in the UI caps, and the live line's button where there is something to do. With no sky to blur, the ground is the night's navy rising from the page's own background, so the panel sits on the colour the sky would have been.
import React from "react";
import { Glass } from "./Glass";
import { useTheme, themeColors, families, typeScale, CONTROL, GLASS } from "../utils/theme";
import { ENTRY, FALLBACK } from "../content";
import { RefreshIcon } from "./icons";

export function Fallback({ line, reload }: { line: string; reload: boolean }) {
  const c = themeColors(useTheme());
  // The live line's button (LiveStatus.tsx), bordered as it is on a phone, since here it stands alone rather than inside a pill.
  const button: React.CSSProperties = { padding: "6px 14px 6px 12px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(255, 255, 255, 0.06)", border: "1px solid rgba(255, 255, 255, 0.22)", borderRadius: 999, color: c.textPrimary, fontFamily: families.uiCaps, fontSize: typeScale.caption.size, lineHeight: 1.5, whiteSpace: "nowrap", minHeight: CONTROL.touch, marginTop: 10, cursor: "pointer" };
  return (
    <div className="scene-entry scene-fallback" role="alert" style={{ "--fallback-ground": c.bg, "--fallback-sky": GLASS.fill } as React.CSSProperties}>
      <Glass material="frosted" className="scene-entry-panel" style={{ "--glass-fill": GLASS.fill, "--glass-fill-alpha": String(GLASS.fillAlphaFixed), "--glass-lift": "0", "--glass-on": "1" } as React.CSSProperties}>
        <h1 style={{ margin: 0, fontFamily: families.serifItalic, fontStyle: "italic", fontWeight: 400, fontSize: `calc(var(--heading-size, ${typeScale.heading.size}) * 0.7)`, lineHeight: 1.2, color: c.textPrimary }}>{ENTRY.title}</h1>
        <p style={{ margin: 0, maxWidth: "34ch", fontFamily: families.uiCaps, fontSize: typeScale.caption.size, lineHeight: 1.5, color: c.textMuted }}>{line}</p>
        {reload && (
          <button className="scene-play scene-about-btn" onClick={() => window.location.reload()} style={button}>
            <RefreshIcon size={14} />
            <span>{FALLBACK.reload}</span>
          </button>
        )}
      </Glass>
    </div>
  );
}
