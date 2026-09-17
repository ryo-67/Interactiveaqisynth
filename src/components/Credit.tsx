// Credit — the footer's credit (Shoro, 2026-09-16): "Made by Shoro Roy" as one button-shaped link, the same pill, type and behaviour as the Patch notes button beside it (the play button's hover fill covers the whole pill), with Lucide's pencil-sparkles before the words. The whole line was one link already, so the pill is the link. It goes to Shoro's LinkedIn (Shoro, 2026-09-17; the portfolio before); the About overlay's own chips keep both, the portfolio under Website and this one under LinkedIn. Sits at the bottom bar's right end on laptop and beside the Patch notes button, centred, below that (index.css .scene-bottom).
import React from "react";
import { useTheme, themeColors, families, typeScale, CONTROL } from "../utils/theme";
import { CREDIT_LINE, CREDIT_NAME, LINKEDIN_URL } from "../content";
import { PencilSparklesIcon } from "./icons";

export function Credit() {
  const c = themeColors(useTheme());
  return (
    <a
      className="scene-play scene-about-btn"
      href={LINKEDIN_URL}
      target="_blank"
      rel="noopener noreferrer"
      style={{ padding: "8px 16px 8px 14px", minHeight: `var(--ctl-pill, ${CONTROL.pillHeight}px)`, boxSizing: "border-box", display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, color: c.textSecondary, textDecoration: "none", fontFamily: families.uiCaps, fontSize: typeScale.caption.size, lineHeight: 1.5, whiteSpace: "nowrap" }}
    >
      <PencilSparklesIcon size={14} />
      <span>{CREDIT_LINE.replace("{name}", CREDIT_NAME)}</span>
    </a>
  );
}
