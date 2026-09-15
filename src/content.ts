// content.ts — all prose and labels live here (CLAUDE.md, DSN-01). Copy is Shoro's; placeholders are flagged.

// Tier names for the scale ladder (STRATEGY §3.4). Order matches engine/scales.ts TIERS. Mood words are provisional copy; prose pass pending (STRATEGY §9).
export const TIER_NAMES = ["Easy", "Shallow", "Tight", "Ragged", "Suffocating"] as const;

// Mood sentences, one per tier, shown under the mood word (§5.2). {pollutant} is the channel carrying the line this hour (highest normalized value); {hour} is the playhead hour, so the sentence names what you are hearing while the big number stays at the latest reading.
// PLACEHOLDER — Shoro to write. Two sentences each, drafted only so the layout has true copy to set.
export const MOOD_SENTENCES: readonly string[] = [
  "The air is doing almost nothing, and the piece does almost nothing with it.",
  "Something is in the air, thin enough to argue about.",
  "The day has a grip on the music now.",
  "This is air you would mention to someone.",
  "The piece is still the piece, and that is the problem.",
];


// Score legend, one micro line under the canvas (§5.2).

// Status words in the borough row.
export const STATUS_LIVE = "live";
export const STATUS_ARCHIVE = "archive";

// Source line (§5.3 panel 6). The coverage clause is built from the source flags, never hardcoded. Shortened 2026-09-15 at Shoro's request; Shoro's to revise. Two parts: the sources, then coverage.
export const SOURCE_LINE_BASE = "Live from AirNow · Archive from EPA"; // LOCKED (Shoro, 2026-09-15). Rendered with AirNow and EPA as links.
export const SOURCE_URL_AIRNOW = "https://www.airnow.gov/";
export const SOURCE_URL_EPA = "https://www.epa.gov/outdoor-air-quality-data";
// The source line carries the sources and, only when they apply, two disclosures: a channel the borough borrows from the citywide reading (SOURCE_BORROWED, D-16) and live NO2 being a typical archive day (SOURCE_LINE_TYPICAL_NO2, D-18). Which pollutants a borough measures is no longer spelled out — it read as a wall.
export const SOURCE_BORROWED = "{borough}'s {list} {isAre} citywide."; // D-16 disclosure, only when a borough has no monitor for a channel (Brooklyn's O3). PLACEHOLDER — Shoro's.
export const SOURCE_AREA_READING = "AirNow area reading; no borough detail."; // zip-code fallback (BUG-12): no borough can honestly be named

// Transport (the first glass control, §5.3). PLACEHOLDERS — Shoro's to write.
export const TRANSPORT_PLAY = "Play";
export const TRANSPORT_PAUSE = "Pause";
export const TRANSPORT_VOLUME = "Volume";
export const SKY_TOGGLE_LABEL = "Play or pause"; // the sky itself as a play/pause target, for screen readers. PLACEHOLDER — Shoro's.

// Graph track labels and units. Units are the measurements'; the labels are PLACEHOLDERS — Shoro's.
export const TRACK_LABELS = { aqi: "AQI", pm25: "PM2.5", o3: "O₃", no2: "NO₂" } as const; // chemical subscripts (U+2083, U+2082): the data font carries them (Shoro, 2026-09-15) // the pulse row's numbers are hits per bar
export const TRACK_UNITS = { aqi: "", pm25: "µg/m³", o3: "ppb", no2: "ppb" } as const;

// Day navigation. Pin names are Shoro's (from the Figma scaffold, 2026-09-15); the rest are PLACEHOLDERS — Shoro's.
export const PINS = [
  { date: "2023-10-29", name: "Clear Day" },
  { date: "2023-02-09", name: "Rush Hour" },
  { date: "2023-06-30", name: "Summer Haze" },
  { date: "2023-07-12", name: "Ozone Spike" },
  { date: "2023-06-07", name: "Wildfire" },
] as const; // order and names: Shoro, 2026-09-15 — clean to severe, left to right
// Borough names on phones, where the full row cannot fit at the caption size (445 px of labels for 303 px of room).
export const BOROUGH_SHORT: Record<string, string> = { Citywide: "NYC", Manhattan: "MN", Brooklyn: "BK", Queens: "QN", Bronx: "BX", "Staten Island": "SI" }; // the official two-letter borough codes (Shoro, 2026-09-15)
export const NAV_LIVE = "Live";
export const NAV_CALENDAR = "Calendar"; // the date chip's accessible name and the popover's
export const NAV_LAST_24H = "Last 24h";
export const CAL_AVAILABLE_UNTIL = "EPA data available till {date}";
export const PICK_OR_DATE = "or choose a date"; // phone day picker, between the presets and the calendar (Shoro, 2026-09-15) // under the calendar (Shoro, 2026-09-15) // the date chip's label when live (Shoro, 2026-09-15)
export const NAV_UNAVAILABLE = "Not yet reported."; // a day past the archive and the EPA feed
export const SOURCE_LINE_TYPICAL_NO2 = "NO₂ is typical, not live."; // D-18 disclosure; Shoro's to revise
