// content.ts — all prose and labels live here (CLAUDE.md, DSN-01). Copy is Shoro's; placeholders are flagged.

// Tier names for the scale ladder (STRATEGY §3.4). Order matches engine/scales.ts TIERS. Mood words are provisional copy; prose pass pending (STRATEGY §9).
export const TIER_NAMES = ["Easy", "Shallow", "Short", "Tight", "Ragged", "Suffocating"] as const; // six, one per EPA grade (D-44, 2026-09-16)

// Score legend, one micro line under the canvas (§5.2).

// Status words in the borough row.

// Source line (§5.3 panel 6). The coverage clause is built from the source flags, never hardcoded. Shortened 2026-09-15 at Shoro's request; Shoro's to revise. Two parts: the sources, then coverage.
// The source line names the one source in use (Shoro, 2026-09-16): AirNow while the Live chip is selected, EPA for every other day, since every other day is archival. Rendered with the agency's name as a link.
export const SOURCE_LINE_LIVE = "Live data from AirNow"; // Shoro, 2026-09-16
export const SOURCE_LINE_ARCHIVE = "Archive data from EPA"; // Shoro, 2026-09-16
// The credit (Shoro, 2026-09-16): a small pill beside the source line, the name a link to the portfolio.
export const CREDIT_LINE = "Made by {name}"; // Shoro, 2026-09-16 (was "Designed for fun by {name}")
export const ABOUT_LABEL = "Patch notes"; // the footer button's label (Shoro, 2026-09-16; was "About this", then "About"); the page it opens is still to come
export const CREDIT_NAME = "Shoro Roy";
export const CREDIT_URL = "https://shoro.framer.website/";
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
export const TRACK_QUALIFIERS: Partial<Record<keyof typeof TRACK_LABELS, string>> = { aqi: "Hourly" }; // a word before the label on the graph's tab, where there is room (Shoro, 2026-09-16: "Hourly AQI", since the number is the hour's NowCast, not the day's); phones show the label alone, like the units
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

// The monitor page (D-43, 2026-09-15): card labels, source-pill labels, the tone words and the scale names as shown. PLACEHOLDERS — Shoro's. The source pill is the routing: which measurement drives the card.
export const VIEW_LABELS = { scene: "Scene", monitor: "Monitor" } as const; // the two page icons' accessible names
export const MONITOR_LABELS = { routing: "Routing", scale: "Scale", tone: "Tone", beats: "Beats", brightness: "Brightness", detune: "Detune", reverb: "Reverb" } as const;
export const SOURCE_LABELS = { pm25: "PM2.5", o3: "O₃", no2: "NO₂" } as const; // the same subscripts as the graph tabs
export const SOURCE_JOIN = " · "; // between two sources on one pill: "PM2.5 · NO₂"
// Harmonicity and modulation index folded into one listener-facing word per tier (§3.5 tier table); indexed like TIER_NAMES.
export const TONE_WORDS = ["Clean", "Smooth", "Warm", "Edged", "Metallic", "Harsh"] as const; // six (D-44); the first two are Shoro's of 2026-09-16 (were Pure, Clean)
// The scale names as the card shows them, keyed by the engine's own names (scales.ts).
export const SCALE_DISPLAY: Record<string, string> = { "Major Pentatonic": "Pentatonic", Major: "Major", Dorian: "Dorian", Phrygian: "Phrygian", Locrian: "Locrian", Chromatic: "Chromatic" };
export const MONITOR_UNITS = { beats: "/ 16", detune: "semitones", o3: "ppb", pm25: "µg/m³" } as const;
export const MONITOR_REST = "—"; // a value the held hour lacks

// The hero's two cards (2026-09-16): the number under "AQI · now" on Live or "AQI · Oct 29" on an archive day, the word and sentence under "Breath". PLACEHOLDERS — Shoro's.
export const HERO_AQI_LABEL = "AQI · {when}";
export const HERO_AQI_NOW = "now";
export const HERO_BREATH_LABEL = "Breath";
