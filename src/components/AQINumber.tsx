// AQINumber — the number (§5.2 item 2). Display size, serif, text primary — never the tier color, and it never animates. Live shows aqi.latestHour: the most recent hour's AQI, the value the tier is computed from when the playhead is at "now" (not NowCast, not the 24-h mean).
import React from "react";
import { useTheme, themeColors, families, typeScale } from "../utils/theme";

export function AQINumber({ value }: { value: number | null }) {
  const c = themeColors(useTheme());
  return (
    <div
      style={{
        fontFamily: families.serifItalic,
        fontSize: `var(--display-size, ${typeScale.display.size})`, // the scene scales this per breakpoint
        lineHeight: typeScale.display.line,
        fontVariantNumeric: "lining-nums tabular-nums", // lining (2026-09-15): Georgia's default figures are old-style, so a 5 or a 4 dropped below the baseline and the number's visual centre moved with its digits; lining figures share one height
        color: c.textPrimary,
      }}
    >
      {value ?? "—"}
    </div>
  );
}
