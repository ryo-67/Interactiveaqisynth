// SourceLine — footer line three (§5.2): the sources, muted, as fact, and only when it applies the one disclosure that matters: live NO2 is a typical archive day (D-18). Whether a channel is typical is read from the hour records' source flags, never from a hardcoded list.
import React, { useLayoutEffect, useRef } from "react";
import { useTheme, themeColors, families, typeScale } from "../utils/theme";
import { SOURCE_LINE_BASE, SOURCE_URL_AIRNOW, SOURCE_URL_EPA, SOURCE_BORROWED, SOURCE_AREA_READING, SOURCE_LINE_TYPICAL_NO2 } from "../content";
import type { Borough } from "../utils/nycOpenData";
import type { Day } from "../engine/SynthEngine";

const CHANNEL_LABELS = { pm25: "PM2.5", o3: "O3", no2: "NO2" } as const;
type Channel = keyof typeof CHANNEL_LABELS;

interface Props {
  borough: Borough;
  hours: Day;
  fallback: "zipcode" | null;
}

// The locked base line with its two source names as links to the agencies. The string stays whole in content.ts; the names are found in it here, so a rewording that keeps the names keeps the links.
const SOURCES: Array<[name: string, url: string]> = [["AirNow", SOURCE_URL_AIRNOW], ["EPA", SOURCE_URL_EPA]];
function linkSources(line: string, style: React.CSSProperties): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let rest = line;
  while (rest.length) {
    const hit = SOURCES.map(([name, url]) => ({ i: rest.indexOf(name), name, url })).filter((h) => h.i >= 0).sort((a, b) => a.i - b.i)[0];
    if (!hit) { out.push(rest); break; }
    if (hit.i > 0) out.push(rest.slice(0, hit.i));
    out.push(<a key={out.length} className="source-link" href={hit.url} target="_blank" rel="noopener noreferrer" style={style}>{hit.name}</a>);
    rest = rest.slice(hit.i + hit.name.length);
  }
  return out;
}

export function SourceLine({ borough, hours, fallback }: Props) {
  const c = themeColors(useTheme());
  // Links read as the line does; the underline appears on hover and keyboard focus only (index.css .source-link). AA is the text colour's.
  const linkStyle: React.CSSProperties = { color: "inherit", textUnderlineOffset: 2 };

  // A channel is borrowed when the borough never reports it itself and carries the citywide value instead (D-16: substitution with provenance — Brooklyn's O3). Live NO2 arrives flagged 'typical' (D-18); an archive day carries real NO2 and says nothing more.
  const borrowed: Channel[] = [];
  let anyTypical = false;
  for (const ch of Object.keys(CHANNEL_LABELS) as Channel[]) {
    const tags = hours.filter((h) => h[ch] != null).map((h) => h.source[ch]);
    if (tags.some((t) => t === "typical")) anyTypical = true;
    if (!tags.some((t) => t === "own") && tags.some((t) => t === "citywide")) borrowed.push(ch);
  }
  // "O3", "O3 and NO2": a spoken list.
  const names = borrowed.map((ch) => CHANNEL_LABELS[ch]);
  const list = names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  const boroughName = borough === "Citywide" ? "NYC" : borough;
  const parts = fallback === "zipcode"
    ? [SOURCE_AREA_READING]
    : [borrowed.length ? SOURCE_BORROWED.replace("{borough}", boroughName).replace("{list}", list).replace("{isAre}", borrowed.length === 1 ? "is" : "are") : null, anyTypical ? SOURCE_LINE_TYPICAL_NO2 : null];
  const detail = parts.filter((p): p is string => p != null).join(" ") || null;

  // Hug the text even when it wraps: fit-content on a wrapping block is the container's width, so after layout the panel (the parent glass, when it is sized to content) is set to its widest rendered line plus its padding. That line still fits exactly, so nothing re-wraps. Re-measured on resize.
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const panel = el?.parentElement;
    if (!el || !panel || !panel.classList.contains("glass")) return;
    const belowLaptop = window.matchMedia("(max-width: 1023px)");
    const fit = () => {
      panel.style.width = "";
      // Only where the scene sizes the panel to content (tablet and phone). On laptop the panel already hugs one line, and a sub-pixel round-trip there re-wrapped it and cascaded the width down.
      if (!belowLaptop.matches) return;
      const lines: number[] = [];
      for (const span of el.querySelectorAll("span")) for (const r of span.getClientRects()) lines.push(r.width);
      if (!lines.length) return;
      const cs = getComputedStyle(panel);
      const w = Math.ceil(Math.max(...lines) + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)) + 2;
      if (w < panel.getBoundingClientRect().width - 2) panel.style.width = `${w}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(panel.parentElement ?? panel);
    return () => { ro.disconnect(); panel.style.width = ""; };
  }, [borough, hours, fallback]);

  return (
    <div
      ref={ref}
      style={{
        fontFamily: families.uiCaps,
        fontSize: typeScale.caption.size,
        lineHeight: 1.5,
        // Secondary, not faint: faint is a line token (0.18 alpha) and fails AA as text. Secondary holds ≥ 6:1 on the panel fill.
        color: c.textSecondary,
      }}
    >
      {/* Two parts: the sources, then the coverage. One line joined by a separator where there is room; on phone the separator hides and the coverage takes its own line, so the break falls at the sentence rather than wherever the width lands. */}
      <span className="source-base">{linkSources(SOURCE_LINE_BASE, linkStyle)}</span>
      {detail && (
        <>
          <span className="source-sep"> · </span>
          {/* A real space before the detail, so selected or read-aloud text does not run the two parts together when the separator is hidden. */}
          {" "}
          <span className="source-detail">{detail}</span>
        </>
      )}
    </div>
  );
}
