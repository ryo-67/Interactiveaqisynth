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

// Status words in the borough row.
export const STATUS_LIVE = "live";
export const STATUS_ARCHIVE = "archive";

// Source line (§5.3 panel 6). The coverage clause is built from the source flags, never hardcoded. Shortened 2026-09-15 at Shoro's request; Shoro's to revise. Two parts: the sources, then coverage.
export const SOURCE_LINE_BASE = "Live from AirNow · Archive from EPA";
export const SOURCE_MONITORS = "{borough} measures {list}.";
export const SOURCE_BORROWED = "{borough} measures {ownList}; {borrowedList} from the citywide reading.";
export const SOURCE_AREA_READING = "AirNow area reading; no borough detail."; // zip-code fallback (BUG-12): no borough can honestly be named

// Transport (the first glass control, §5.3). PLACEHOLDERS — Shoro's to write.
export const TRANSPORT_PLAY = "Play";
export const TRANSPORT_PAUSE = "Pause";
export const TRANSPORT_VOLUME = "Volume";

// Graph track labels and units. Units are the measurements'; the labels are PLACEHOLDERS — Shoro's.
export const TRACK_LABELS = { aqi: "AQI", pm25: "PM2.5", o3: "O3", no2: "NO2", pulse: "pulse" } as const; // the pulse row's numbers are hits per bar
export const TRACK_UNITS = { aqi: "", pm25: "µg/m³", o3: "ppb", no2: "ppb" } as const;

// Day navigation. Pin names are Shoro's (from the Figma scaffold, 2026-09-15); the rest are PLACEHOLDERS — Shoro's.
export const PINS = [
  { date: "2023-06-07", name: "Wildfire" },
  { date: "2023-06-30", name: "Hot & Hazy" },
  { date: "2023-07-12", name: "Ozone Spike" },
  { date: "2023-02-09", name: "Rush Hour" },
  { date: "2023-10-29", name: "Clear Day" },
] as const;
export const NAV_LIVE = "Live";
export const NAV_PREV = "‹";
export const NAV_NEXT = "›";
export const NAV_CALENDAR = "Calendar";
export const NAV_UNAVAILABLE = "Not yet reported."; // a day past the archive and the EPA feed
export const SOURCE_LINE_TYPICAL_NO2 = "No live NO2 in New York; a typical archive profile stands in.";
