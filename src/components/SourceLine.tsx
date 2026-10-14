// SourceLine — footer line three (§5.2): the source in use, muted, as fact (Shoro, 2026-09-16: AirNow while Live is selected, EPA on any other day), and only when it applies the one disclosure that matters: live NO2 is a typical archive day (D-18). Whether a channel is typical is read from the hour records' source flags, never from a hardcoded list.
import React from "react";
import { useTheme, themeColors, families, typeScale } from "../utils/theme";
import { SOURCE_LINE_LIVE, SOURCE_LINE_ARCHIVE, SOURCE_URL_AIRNOW, SOURCE_URL_EPA, SOURCE_BORROWED, SOURCE_AREA_READING, SOURCE_LINE_TYPICAL_NO2 } from "../content";
import type { Borough } from "../utils/nycOpenData";
import type { Day } from "../engine/SynthEngine";

const CHANNEL_LABELS = { pm25: "PM2.5", o3: "O₃", no2: "NO₂" } as const; // the same labels the graph's tabs use
type Channel = keyof typeof CHANNEL_LABELS;

interface Props {
  borough: Borough;
  hours: Day;
  fallback: "zipcode" | null;
  live: boolean; // the Live chip is selected: the last 24 hours from AirNow; any other day is the EPA archive
}

// The base line with its source name as a link to the agency. The strings stay whole in content.ts; the names are found in them here, so a rewording that keeps the name keeps the link.
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

export function SourceLine({ borough, hours, fallback, live }: Props) {
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

  return (
    <div
      style={{
        fontFamily: families.uiCaps,
        fontSize: typeScale.caption.size,
        lineHeight: 1.5,
        // Secondary, not faint: faint is a line token (0.18 alpha) and fails AA as text. Secondary holds ≥ 6:1 on the panel fill.
        color: c.textSecondary,
      }}
    >
      {/* Two parts: the sources, then the coverage. One line joined by a separator where there is room; on phone the separator hides and the coverage takes its own line, so the break falls at the sentence rather than wherever the width lands. */}
      <span className="source-base">{linkSources(live ? SOURCE_LINE_LIVE : SOURCE_LINE_ARCHIVE, linkStyle)}</span>
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
