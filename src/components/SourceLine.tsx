// SourceLine — footer line three (§5.2): sources and coverage, muted, as fact. The coverage clause is built from the hour records' source flags, never from a hardcoded list; borrowed channels are disclosed here and drawn identically in the score. When any channel is typical, the D-18 sentence follows.
import React from "react";
import { useTheme, themeColors, families, typeScale } from "../utils/theme";
import {
  SOURCE_LINE_BASE,
  SOURCE_MONITORS,
  SOURCE_BORROWED,
  SOURCE_AREA_READING,
  SOURCE_LINE_TYPICAL_NO2,
} from "../content";
import type { Borough } from "../utils/nycOpenData";
import type { Day } from "../engine/SynthEngine";

const CHANNEL_LABELS = { pm25: "PM2.5", o3: "O3", no2: "NO2" } as const;
type Channel = keyof typeof CHANNEL_LABELS;

interface Props {
  borough: Borough;
  hours: Day;
  fallback: "zipcode" | null;
}

export function SourceLine({ borough, hours, fallback }: Props) {
  const c = themeColors(useTheme());

  // A channel counts as the borough's own if any hour this day is 'own'; borrowed if it only ever arrives as 'citywide'; typical likewise.
  const own: Channel[] = [];
  const borrowed: Channel[] = [];
  let anyTypical = false;
  for (const ch of Object.keys(CHANNEL_LABELS) as Channel[]) {
    const tags = hours.filter((h) => h[ch] != null).map((h) => h.source[ch]);
    if (tags.some((t) => t === "typical")) anyTypical = true;
    if (tags.some((t) => t === "own")) own.push(ch);
    else if (tags.some((t) => t === "citywide")) borrowed.push(ch);
  }

  // "PM2.5 and O3", "PM2.5, O3 and NO2": a spoken list, not a comma dump.
  const list = (chs: Channel[]) => {
    const names = chs.map((ch) => CHANNEL_LABELS[ch]);
    return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  };
  const boroughName = borough === "Citywide" ? "NYC" : borough;

  let coverage: string;
  if (fallback === "zipcode") {
    coverage = SOURCE_AREA_READING;
  } else if (borrowed.length === 0) {
    coverage = SOURCE_MONITORS.replace("{borough}", boroughName).replace("{list}", list(own));
  } else {
    coverage = SOURCE_BORROWED.replace("{borough}", boroughName)
      .replace("{ownList}", list(own))
      .replace("{borrowedList}", list(borrowed))
      .replace("{isAre}", borrowed.length === 1 ? "is" : "are");
  }

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
      <span className="source-base">{SOURCE_LINE_BASE}</span>
      <span className="source-sep"> · </span>
      {/* A real space before the detail, so selected or read-aloud text does not run the two parts together when the separator is hidden. */}
      {" "}
      <span className="source-detail">
        {coverage}
        {anyTypical ? ` ${SOURCE_LINE_TYPICAL_NO2}` : ""}
      </span>
    </div>
  );
}
