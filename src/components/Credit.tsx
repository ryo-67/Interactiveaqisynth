// Credit — the footer's credit (Shoro, 2026-09-16): "Made by Shoro Roy" as one button-shaped link, the same pill, type and behaviour as the Patch notes button beside it (the play button's hover fill covers the whole pill), with Lucide's pencil-sparkles before the words. The whole line was one link already, so the pill is the link. It goes to Shoro's LinkedIn (Shoro, 2026-09-17; the portfolio before); the About overlay's own chips keep both, the portfolio under Website and this one under LinkedIn. Sits at the bottom bar's right end on laptop and beside the Patch notes button, centred, below that (index.css .scene-bottom).
import { memo } from "react";
import { useTheme, themeColors } from "../utils/theme";
import { CREDIT_LINE, CREDIT_NAME, LINKEDIN_URL } from "../content";
import { PencilSparklesIcon } from "./icons";
import { pillButtonStyle } from "./chip";

export const Credit = memo(function Credit() {
  const c = themeColors(useTheme());
  return (
    <a
      className="scene-play scene-about-btn"
      href={LINKEDIN_URL}
      target="_blank"
      rel="noopener noreferrer"
      style={pillButtonStyle(c, { textDecoration: "none" })}
    >
      <PencilSparklesIcon size={14} />
      <span>{CREDIT_LINE.replace("{name}", CREDIT_NAME)}</span>
    </a>
  );
});
