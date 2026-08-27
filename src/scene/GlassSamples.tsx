// GlassSamples — the transport control at its real size in three materials, for row 6 of the test harness. Same content in each; the caller places one over the sun disc and one over open sky, since edges are where displacement shows.
import React from "react";
import { LiquidGlass } from "liquid-glass-web-react";
import LiquidGlassLeonard from "liquid-glass-react";
import { families, typeScale, space } from "../utils/theme";

export type GlassImpl = "css" | "lgr" | "lgw";
export const GLASS_IMPLS: GlassImpl[] = ["css", "lgr", "lgw"];
export const GLASS_LABELS: Record<GlassImpl, string> = {
  css: "in-house CSS material",
  lgr: "liquid-glass-react",
  lgw: "liquid-glass-web-react",
};

// The transport's real content and size: play word + volume slider.
function TransportContent() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: space.md, whiteSpace: "nowrap" }}>
      <span
        style={{
          fontFamily: families.uiCaps,
          fontSize: typeScale.caption.size,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.92)",
        }}
      >
        Play
      </span>
      <input type="range" min={0} max={1} step={0.01} defaultValue={0.65} aria-label="Volume" style={{ width: 96, accentColor: "rgba(255,255,255,0.85)" }} />
    </div>
  );
}

// css and lgr float over whatever is behind them. lgw is a content-side lens: it refracts its own children, so the caller passes the background as `refracted`.
export function GlassSample({ impl, refracted }: { impl: GlassImpl; refracted?: React.ReactNode }) {
  if (impl === "css") {
    return (
      <div className="glass" style={{ padding: `${space.sm} ${space.md}`, display: "inline-flex" }}>
        <TransportContent />
      </div>
    );
  }
  if (impl === "lgr") {
    return (
      <LiquidGlassLeonard displacementScale={64} blurAmount={0.06} saturation={140} cornerRadius={40} padding="12px 20px">
        <TransportContent />
      </LiquidGlassLeonard>
    );
  }
  return (
    <LiquidGlass
      style={{ position: "absolute", inset: 0 }}
      width={232}
      height={52}
      radius="auto"
      x={0.5}
      y={0.5}
      strength={0.16}
      blur={1.5}
      chromaticAberration={0.4}
      glow={0.55}
      edgeHighlight={0.8}
    >
      {refracted}
    </LiquidGlass>
  );
}
