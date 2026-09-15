// BoroughToggle — one row of words (§5.2 item 1), always one line, centred. No chrome: the selected borough is italic serif, the rest are UI caps. When the row is wider than its pill it scrolls horizontally rather than wrapping. The date and status live in DateStatus, their own pill.
import React from "react";
import { useTheme, themeColors, families, typeScale, space, CONTROL } from "../utils/theme";
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
}

export function BoroughToggle({ selected, onSelect }: Props) {
  const c = themeColors(useTheme());
  return (
    <div
      role="tablist"
      aria-label="Borough"
      className="scene-strip"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "var(--ctl-gap-wide, 16px)",
        height: `var(--ctl-inner, ${CONTROL.inner}px)`,
        whiteSpace: "nowrap",
        maxWidth: "100%",
      }}
    >
      {ORDER.map((b) => {
        const isSel = b === selected;
        return (
          <button
            key={b}
            role="tab"
            aria-selected={isSel}
            onClick={() => onSelect(b)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              flex: "0 0 auto",
              fontFamily: isSel ? families.serifItalic : families.uiCaps,
              fontStyle: isSel ? "italic" : "normal",
              textTransform: isSel ? "none" : "uppercase",
              letterSpacing: isSel ? "0" : "0.08em",
              fontSize: typeScale.caption.size,
              lineHeight: `var(--ctl-inner, ${CONTROL.inner}px)`,
              height: `var(--ctl-inner, ${CONTROL.inner}px)`,
              color: isSel ? c.textPrimary : c.textMuted,
            }}
          >
            {LABELS[b]}
          </button>
        );
      })}
    </div>
  );
}

// DateStatus — "Jul 12 · 23:00 · archive": the loaded day's date, its latest hour, and whether it is live or archive. One line, tabular figures.
export function DateStatus({ dateLabel, hourLabel, status }: { dateLabel: string; hourLabel: string; status: string }) {
  const c = themeColors(useTheme());
  return (
    <div
      style={{
        fontFamily: families.data,
        fontSize: typeScale.micro.size,
        lineHeight: typeScale.micro.line,
        color: c.textMuted,
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
        textAlign: "center",
      }}
    >
      {dateLabel} · {hourLabel} · {status}
    </div>
  );
}
