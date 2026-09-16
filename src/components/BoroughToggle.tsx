// BoroughToggle — one row of words (§5.2 item 1), always one line, centred. No chrome: every word is set in caps with the same tracking; the selected borough changes to the same face's bold italic, not case or size, so both states share one baseline. When the row is wider than its pill it scrolls horizontally rather than wrapping.
import { BOROUGH_SHORT } from "../content";
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
        justifyContent: "safe center", // centred, but never with the first word pushed out of reach when the row is wider than its pill
        alignItems: "center",
        gap: "var(--ctl-gap-wide, 16px)",
        height: `var(--ctl-inner, ${CONTROL.inner}px)`,
        whiteSpace: "nowrap",
        maxWidth: "100%",
      }}
    >
      {ORDER.map((b) => {
        const isSel = b === selected;
        // Both renderings of the word — upright and italic — are laid out in the same grid cell; the one for the current state shows and the other is hidden but still sized, so the button's width is the wider of the two and the row never changes length as the selection moves.
        const variant = (serif: boolean, visible: boolean): React.CSSProperties => ({
          gridArea: "1 / 1",
          fontFamily: families.uiCaps, // one face for both states: a second face at a matched size sat on a different baseline and left a gap under the italic
          fontStyle: serif ? "italic" : "normal",
          fontWeight: serif ? 700 : 400, // selected: bold italic of the same face
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontSize: typeScale.caption.size,
          lineHeight: `var(--ctl-inner, ${CONTROL.inner}px)`,
          textAlign: "center",
          visibility: visible ? "visible" : "hidden",
          color: isSel ? c.textPrimary : c.textMuted,
        });
        return (
          <button
            key={b}
            className="scene-borough-btn"
            role="tab"
            aria-selected={isSel}
            onClick={() => onSelect(b)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              flex: "0 0 auto",
              display: "inline-grid",
              height: `var(--ctl-inner, ${CONTROL.inner}px)`,
              whiteSpace: "nowrap",
            }}
          >
            {/* Full name from tablet up, short name on phones (index.css switches the pair); each pair keeps both weights in the cell. */}
            <span className="borough-long" aria-hidden={isSel} style={variant(false, !isSel)}>{LABELS[b]}</span>
            <span className="borough-long" aria-hidden={!isSel} style={variant(true, isSel)}>{LABELS[b]}</span>
            <span className="borough-short" aria-hidden={isSel} style={variant(false, !isSel)}>{BOROUGH_SHORT[b]}</span>
            <span className="borough-short" aria-hidden={!isSel} style={variant(true, isSel)}>{BOROUGH_SHORT[b]}</span>
          </button>
        );
      })}
    </div>
  );
}
