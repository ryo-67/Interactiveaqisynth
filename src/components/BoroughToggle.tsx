// BoroughToggle — one row of words (§5.2 item 1). No chrome: the selected borough is italic serif, the rest are UI caps; date, hour, and status sit right-aligned on the same row. On phone the row scrolls horizontally.
import React from "react";
import { useTheme, themeColors, families, typeScale, space } from "../utils/theme";
import type { Borough } from "../utils/nycOpenData";

const ORDER: Borough[] = ["Citywide", "Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];
const LABELS: Record<Borough, string> = {
  Citywide: "NYC",
  Manhattan: "Manhattan",
  Brooklyn: "Brooklyn",
  Queens: "Queens",
  Bronx: "Bronx",
  "Staten Island": "Staten Island",
};

interface Props {
  selected: Borough;
  onSelect: (b: Borough) => void;
  dateLabel: string;
  hourLabel: string;
  status: string; // "live" | "archive"
}

export function BoroughToggle({ selected, onSelect, dateLabel, hourLabel, status }: Props) {
  const c = themeColors(useTheme());
  return (
    <div
      style={{ display: "flex", alignItems: "baseline", gap: space.md, overflowX: "auto", whiteSpace: "nowrap" }}
    >
      <div style={{ display: "flex", gap: space.md, alignItems: "baseline", flex: 1 }}>
        {ORDER.map((b) => {
          const isSel = b === selected;
          return (
            <button
              key={b}
              onClick={() => onSelect(b)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                fontFamily: isSel ? families.serifItalic : families.uiCaps,
                fontStyle: isSel ? "italic" : "normal",
                textTransform: isSel ? "none" : "uppercase",
                letterSpacing: isSel ? "0" : "0.08em",
                fontSize: typeScale.caption.size,
                lineHeight: typeScale.caption.line,
                color: isSel ? c.textPrimary : c.textMuted,
              }}
            >
              {LABELS[b]}
            </button>
          );
        })}
      </div>
      <div
        style={{
          fontFamily: families.data,
          fontSize: typeScale.micro.size,
          color: c.textMuted,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {dateLabel} · {hourLabel} · {status}
      </div>
    </div>
  );
}
