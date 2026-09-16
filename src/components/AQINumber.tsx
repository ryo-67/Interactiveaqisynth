// AQINumber — the number (§5.2 item 2). Display size, serif, text primary — never the tier color, and it never animates. A chosen day shows its official daily AQI, Live the current AQI (the NowCast composite at the latest hour), both from engine/aqi.ts (D-42): the number a weather app would show, not the PM2.5 tier the sound plays.
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
