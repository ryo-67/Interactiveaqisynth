// content.ts — all prose and labels live here (CLAUDE.md, DSN-01). Copy is Shoro's; placeholders are flagged.

// Tier names for the scale ladder (STRATEGY §3.4). Order matches engine/scales.ts TIERS. Mood words are provisional copy; prose pass pending (STRATEGY §9).
export const TIER_NAMES = ["Easy", "Shallow", "Tight", "Ragged", "Suffocating"] as const;

// Mood sentences, one per tier, shown under the mood word (§5.2). {pollutant} is the channel carrying the line this hour (highest normalized value); {hour} is the playhead hour, so the sentence names what you are hearing while the big number stays at the latest reading.
// PLACEHOLDER — Shoro to write. Two sentences each, drafted only so the layout has true copy to set.
export const MOOD_SENTENCES: readonly string[] = [
  "The air is doing almost nothing, and the piece does almost nothing with it. At {hour}, {pollutant} carried the line.",
  "Something is in the air, thin enough to argue about. At {hour}, {pollutant} carried the line.",
  "The day has a grip on the music now. At {hour}, {pollutant} carried the line.",
  "This is air you would mention to someone. At {hour}, {pollutant} carried the line.",
  "The piece is still the piece, and that is the problem. At {hour}, {pollutant} carried the line.",
];

// Pollutant display names for the mood sentence's data clause.
export const POLLUTANT_NAMES = { pm25: "fine particulates", o3: "ozone", no2: "nitrogen dioxide" } as const;

// Score legend, one micro line under the canvas (§5.2).
export const SCORE_LEGEND = "ozone line · nitrogen dioxide pulse · particulate haze";

// Status words in the borough row.
export const STATUS_LIVE = "live";
export const STATUS_ARCHIVE = "archive";

// Source line (§5.2 footer line three). Coverage clause is built from the source flags, never hardcoded.
export const SOURCE_LINE_BASE = "Live from AirNow · Archive from EPA";
export const SOURCE_MONITORS = "{borough} monitors {list}.";
export const SOURCE_BORROWED = "{borough} monitors {ownList}; {borrowedList} {isAre} citywide.";
export const SOURCE_AREA_READING = "AirNow area reading."; // zip-code fallback (BUG-12): no borough can honestly be named

// Source-line copy for the D-18 typical-NO2 case (Shoro, 2026-08-27).
export const SOURCE_LINE_TYPICAL_NO2 = "NO2 is a typical profile from the archive; New York does not publish live NO2.";
