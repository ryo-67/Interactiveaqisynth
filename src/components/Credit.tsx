// Credit — the footer's credit line (Shoro, 2026-09-16): one caption in the source line's face and colour, the name a link in the source line's link style (underline on hover and focus only). Sits in its own frosted pill at the bottom bar's right end on laptop, with the source line centred on the bar, and on its own row beneath the source line below laptop (index.css .scene-bottom).
import React from "react";
import { useTheme, themeColors, families, typeScale } from "../utils/theme";
import { CREDIT_LINE, CREDIT_NAME, CREDIT_URL } from "../content";

export function Credit() {
  const c = themeColors(useTheme());
  const [before, after] = CREDIT_LINE.split("{name}");
  return (
    <div style={{ fontFamily: families.uiCaps, fontSize: typeScale.caption.size, lineHeight: 1.5, color: c.textSecondary, whiteSpace: "nowrap" }}>
      {before}<a className="source-link" href={CREDIT_URL} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textUnderlineOffset: 2 }}>{CREDIT_NAME}</a>{after}
    </div>
  );
}
