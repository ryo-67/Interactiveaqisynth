// content.ts — all prose and labels live here (CLAUDE.md, DSN-01). Copy is Shoro's; placeholders are flagged.

// Tier names for the scale ladder (STRATEGY §3.4). Order matches engine/scales.ts TIERS. Mood words are provisional copy; prose pass pending (STRATEGY §9).
export const TIER_NAMES = ["Easy", "Shallow", "Short", "Tight", "Ragged", "Suffocating"] as const; // six, one per EPA grade (D-44, 2026-09-16)

// Score legend, one micro line under the canvas (§5.2).

// Status words in the borough row.

// The credit (Shoro, 2026-09-16): a small pill beside the source line, the name a link to the portfolio.
export const CREDIT_LINE = "by {name}"; // Shoro, 2026-09-16 (was "Designed for fun by {name}", then "Made by {name}")
export const ABOUT_LABEL = "Patch notes"; // the footer button's label (Shoro, 2026-09-16; was "About this", then "About"); it opens the About overlay (D-56)
export const CREDIT_NAME = "Shoro Roy";
export const CREDIT_URL = "https://shoro.framer.website/";
// Source line (§5.3 panel 6). The source in use, as fact (Shoro, 2026-09-16); on laptop only.
export const SOURCE_LINE_LIVE = "Live data from AirNow"; // Shoro, 2026-09-16
export const SOURCE_LINE_ARCHIVE = "Archive data from EPA"; // Shoro, 2026-09-16
export const SOURCE_URL_AIRNOW = "https://www.airnow.gov/";
export const SOURCE_URL_EPA = "https://www.epa.gov/outdoor-air-quality-data";
export const SOURCE_BORROWED = "{borough}'s {list} {isAre} citywide."; // D-16 disclosure, only when a borough has no monitor for a channel (Brooklyn's O3). PLACEHOLDER — Shoro's.
export const SOURCE_AREA_READING = "AirNow area reading; no borough detail."; // zip-code fallback (BUG-12): no borough can honestly be named
export const SOURCE_LINE_TYPICAL_NO2 = "NO₂ is typical, not live."; // D-18 disclosure; Shoro's to revise
// Where a channel is borrowed (D-16, D-18; amended 2026-09-16, D-56): disclosed where the channel is shown, as a one-word suffix on the graph's tab and the monitor cards' source pills, the full account in the About overlay.
export const SOURCE_SUFFIX_CITYWIDE = "citywide"; // the borough has no monitor for this channel and carries the citywide value (D-16)
export const SOURCE_SUFFIX_TYPICAL = "typical"; // live NO₂ is a typical profile from the archive (D-18)
// The entry (D-61, 2026-09-17): the one screen before the tool, held while the live air is being read. PLACEHOLDERS — Shoro's to write.
export const ENTRY = {
  title: "New York AQI Synth",
  line: "Reading the air…",
} as const;

// The live feed's own state (D-60, 2026-09-17), shown as one line above the scene while Live is selected and AirNow has not answered. PLACEHOLDERS — Shoro's to write.
export const LIVE_STATUS = {
  loading: "Reading the air…", // while AirNow is in flight; shown only if it takes longer than a moment
  unavailable: "Can't reach AirNow for live data.", // Shoro, 2026-09-17: the failure is the feed being unreachable, so the line names the feed and says it cannot be reached, rather than saying the air is quiet
  toArchive: "Play a past day", // moves to the last day the archive holds
  retry: "Try again",
} as const;

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

// The About overlay (D-56, 2026-09-16): Shoro's copy, verbatim (rewritten by him the same day). Opened from the Patch notes button; a full-viewport scrim with the text laid on it in a liner-notes layout. {weeks} is computed from the archive's last available day, the calendar footer's own value.
export const ABOUT = {
  title: "New York AQI Synth",
  intro: "Ever seen a smoggy sky out of your window and felt like you could just smell the air quality? Well, I wondered if I could hear it instead. This website turns New York City\u2019s air quality index (AQI) data into sound so that you can affront more than just your nose and eyes on those smoggy days.",
  groups: [
    [
      { label: "Melody", body: "The melody is determined by Ozone levels. Every hour, the reading picks a note. The higher the value, the higher the note. Ozone builds through the morning and peaks mid-afternoon, which is why most days have similar rises and falls in the tune." },
      { label: "Rhythm", body: "The rhythm follows Nitrogen Dioxide (NO\u2082), which mostly comes from traffic. More NO\u2082 in a four-hour stretch means more beats in that bar. Morning rush is the busiest part of most days." },
      { label: "Dissonance", body: "Particulate matter (PM2.5) controls how rough the piece sounds. It picks the scale, pushes the notes out of tune, and adds reverb. On a clean day the notes are in tune, in major. On the worst days the scale is chromatic and everything is about a semitone off." },
      { label: "Scale", body: "The six scale steps match the EPA's six AQI categories: Major, Pentatonic, Dorian, Phrygian, Locrian, Chromatic. The chord progression underneath is fixed." },
      { label: "The sky", body: "The sky is rendered from physical models of the atmosphere, with the sun calculated and rendered where it was over New York at that hour. One model handles daytime, another handles night. Golden and blue hours at dusk/dawn are added on top." },
      { label: "The air", body: "Particulate matter is drawn over the sky as noise and visual aberrations. At low levels it just bends the view a little. At high levels it tints everything amber. At really high levels, it turns into plumes of smoke you can see the sun through." },
      // {weeks} renders as the number Shoro wrote, 8, and keeps saying the truth as the archive moves (About.tsx weeksBehind, from the calendar's own last available day).
      { label: "Data", body: "Live readings come from AirNow every hour. The archive is EPA monitoring data from 2020 onward, and it runs about {weeks} weeks behind. New York doesn't publish live NO\u2082, so live views use a typical NO\u2082 profile for the current month and weekday, built from the archive. Some boroughs don't monitor every pollutant. Where there's no reading, that borough uses the citywide value." },
    ],
  ],
  credit: "Made in all seriousness to have fun, by Shoro Roy",
  creditKeep: "by Shoro Roy", // the one phrase in the credit that never breaks across lines: when the line wraps, this goes to the next one whole (Shoro, 2026-09-17). A substring of credit above; change it with the copy, and if it stops matching the line simply wraps wherever it likes.
  credit2: "Design, sound, data, code.",
  links: { website: "Website", linkedin: "LinkedIn", github: "GitHub" }, // Shoro, 2026-09-16: Website with the circle-user-round glyph, LinkedIn with its mark, GitHub with its mark
  close: "Exhale", // the button that leaves the overlay on laptop (Shoro, 2026-09-16): the Patch notes button becomes it, Lucide's minimize before the label
  dismiss: "Close", // the same control below laptop, a round pill with a close mark and no label: its accessible name. PLACEHOLDER \u2014 Shoro's.
} as const;
export const LINKEDIN_URL = "https://www.linkedin.com/in/royshoro/";
export const GITHUB_URL = "https://github.com/ryo-67/Interactiveaqisynth";
