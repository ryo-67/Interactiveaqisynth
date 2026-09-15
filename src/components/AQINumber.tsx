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
        fontVariantNumeric: "tabular-nums",
        color: c.textPrimary,
      }}
    >
      {value ?? "—"}
    </div>
  );
}
