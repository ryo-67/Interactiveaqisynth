// Card — the widget shell the monitor's readouts and the hero's two cards share (D-43, 2026-09-16): a frosted panel with a label top-left in the UI face and, where a measurement drives it, a source pill top-right at the micro size. Padding and inner gap come from the breakpoint (index.css --card-pad, .scene-card).
import React from "react";
import { Glass } from "./Glass";
import { chipStyle } from "./chip";
import { useTheme, themeColors, families, typeScale } from "../utils/theme";
import { SOURCE_LABELS, SOURCE_JOIN } from "../content";
import type { Channel } from "../scene/useListenSession";

// One card: label top-left in the UI face, the source pill top-right (the routing, with a one-word suffix, citywide or typical, when a driving channel is borrowed: D-56), the readout beneath.
export function Card({ label, sources, suffixes, className, children, cardRef }: { label: string; sources?: Channel[]; suffixes?: Partial<Record<Channel, string>>; className: string; children: React.ReactNode; cardRef?: (el: HTMLDivElement | null) => void }) {
  const c = themeColors(useTheme());
  return (
    <Glass ref={cardRef} material="frosted" className={`scene-card ${className}`}>
      {/* The inner column (D-52, 2026-09-16): the card is a size container and this column reads its height, so the padding, the gaps and the value step down as the row gets short (index.css @container), and the gauge is never the thing a short row cuts. A container cannot style itself, hence the column. */}
      <div className="scene-card-in">
        <div className="scene-card-head">
          <span style={{ fontFamily: families.ui, letterSpacing: "0.04em", fontSize: typeScale.caption.size, lineHeight: 1, color: c.textMuted }}>{label}</span>
          {/* The source pill: the chip style in its inactive state, 20 tall with the micro size (Shoro, 2026-09-16: smaller than the card's label, whatever the breakpoint). Cards without a driving measurement (routing, the hero's two) have none. */}
          {sources && <span className="scene-card-src" style={chipStyle(c, false, { height: 20, padding: "0 8px", borderRadius: 10, fontSize: typeScale.micro.size })}>{sources.map((s) => SOURCE_LABELS[s]).join(SOURCE_JOIN)}{sources.map((s) => suffixes?.[s]).filter(Boolean).map((w) => `${SOURCE_JOIN}${w}`).join("")}</span>}
        </div>
        {children}
      </div>
    </Glass>
  );
}

