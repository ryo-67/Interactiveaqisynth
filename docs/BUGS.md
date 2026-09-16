# Bug Tracker

Known issues for NYC AQI Synth. Severity: S0 (broken, blocks usage), S1 (visible, misleading, or wrong data), S2 (minor or cosmetic), S3 (tech debt). Status: OPEN, IN PROGRESS, FIXED (date, commit), WONTFIX (rationale), SUPERSEDED (which BACKLOG item replaces the fix).

Version 2, August 26, 2026. BUG-01 to BUG-10 are the March list with statuses updated against the repo at commit 6e5bb35. BUG-11 onward were found in the August 26 code review and data audit.

---

## v1 bugs, status updated

| ID | Severity | Status | Description | Notes |
|---|---|---|---|---|
| BUG-01 | S0 | FIXED 2026-05, 6e5bb35 | Supabase paused after a week of inactivity | Supabase removed; Vercel serverless with CDN cache |
| BUG-02 | S1 | OPEN | EPA lag not communicated to the user | Lag is ~5 weeks as of audit. Fix: dashed gap with computed label, UX-03 |
| BUG-03 | S1 | OPEN | Live reading appended directly after last EPA day | `App.tsx` `timelineData` memo does `[...historical, current]`. TimelineScrubber has no gap rendering. Architectural: two sources, one array. Fix: UX-03. Do not patch the scrubber |
| BUG-04 | S2 | FIXED 2026-08-27, 52bf7f3 | Tone.js "scheduled callbacks" and "polyphony" warnings suppressed by monkey-patching `console.warn` | Root cause is the PolySynth engine. Goes away with SON-01; remove the patch in CLN-07 |
| BUG-05 | S2 | FIXED 2026-08-27, e5e2d2c | 48 shadcn/Radix wrappers shipped with zero imports | Count corrected from 60+. CLN-01 |
| BUG-06 | S2 | FIXED 2026-08-27, 0c9a731 | Map on desktop, pills on mobile, no continuity | UX-09 |
| BUG-07 | S3 | FIXED 2026-08-27, e5e2d2c | Make export `src/imports/InteractiveAqiSynth.tsx` (2,277 lines) + `svg-1l4tu5jyx0.ts` dead | Zero imports. CLN-02 |
| BUG-08 | S3 | FIXED 2026-08-27, e5e2d2c | ~40 versioned aliases in vite.config.ts | CLN-04 |
| BUG-09 | S2 | OPEN | Theme doesn't persist across refresh | POL-03 |
| BUG-10 | S2 | OPEN | Orb trails visible on dark→light switch | Fade-rect alpha tuned for dark. VIZ-02 |

## Bugs found August 26, 2026

### Data correctness

| ID | Severity | Status | Description | Notes |
|---|---|---|---|---|
| BUG-11 | S1 | FIXED 2026-08-27, 6473a4a | Live NO2 is always 0 | AirNow observation/zipCode/current returns O3, PM2.5, PM10 only. Confirmed against live endpoint and AirNow docs. The NO2→distortion mapping is silent in Listen mode. SUPERSEDED by DAT-01 |
| BUG-12 | S1 | FIXED 2026-08-27, 6473a4a | All five boroughs return identical live PM2.5 | All five zips resolve to one AirNow reporting area; the endpoint returns the area max. Live borough selection is cosmetic. SUPERSEDED by DAT-01 |
| BUG-13 | S1 | FIXED 2026-08-27, 6473a4a | PM10 synthesized as `round(pm25 × 1.6 + 5)` whenever missing | Both AirNow and EPA paths in `_lib/aqi.ts`. Live: always. Historical: 85% to 100% of days by borough. Two "independent" channels collapse to one. Fix: DAT-04 removes PM10 |
| BUG-14 | S1 | FIXED 2026-08-27, 6473a4a | Citywide averages missing values as zero | `aggregateByDate` in `nycOpenData.ts` averages all five boroughs; Brooklyn contributes 0 for O3 and NO2, so citywide NO2 is 2/5 of the measured mean. Fix: DAT-04 |
| BUG-15 | S1 | FIXED 2026-08-27, c8aaf4f | Historical window is `currentYear − 2`, so June 2023 is unreachable | `fetchHistorical` in `_lib/aqi.ts`. Window today = 2024 to 2026. Fix: DAT-02 (bulk archive from 2020) + DAT-03 |
| BUG-16 | S1 | FIXED 2026-08-27, c8aaf4f | Only PM2.5 parameter 88101 requested | Manhattan and Staten Island lose ~25% of PM2.5 days; Brooklyn loses June 6 and 7, 2023. Parameter 88502 (continuous monitors) fills them. Fix: DAT-02, DAT-03 |
| BUG-17 | S2 | FIXED 2026-08-27, 48762f4 | Melody voice bypasses distortion and the master filter | `SynthEngine.tsx` routes melody through its own filter → delay, skipping `distRef` and `filterRef`. NO2 grit and O3 ceiling never touch the lead. Fix: SON-02 |
| BUG-18 | S2 | FIXED 2026-08-27, 6473a4a | Concentration is hourly max, AQI is 24-h based | `processEPAData` uses `first_max_value` for concentrations and EPA's daily AQI for the number. June 7 Queens shows PM2.5 412 alongside AQI 278. Fix: DAT-05, decide display rule (O-10) |
| BUG-19 | S2 | FIXED 2026-08-27, 6473a4a | O3 1-hour max evaluated against 8-hour breakpoints | Overstates O3 AQI on hot days. Fix: DAT-05 |
| BUG-20 | S1 | FIXED 2026-08-27, 8d4573f | First paint gated on five sequential historical fetches | `App.tsx` load effect: health → current → `preloadAllHistorical` (sequential, 150 s timeout each). Cold CDN worst case is minutes; skip button after 12 s. Listen needs none of it. Fix: UX-01 |
| BUG-21 | S2 | FIXED 2026-08-27, 8d4573f | Loading copy says "Waking up the server..." | Supabase-era. Fix: UX-10 |
| BUG-22 | S3 | FIXED 2026-08-27, e5e2d2c | `hono` still in dependencies | Leftover from the Deno server. Fix: INF-04, CLN-03 |
| BUG-23 | S2 | FIXED 2026-08-27, 6473a4a | `fetchHistorical` assumes a 90 s deadline; `vercel.json` sets no `maxDuration` | A 16 s cold fetch has succeeded, so the budget is above 10 s, but the actual limit is unverified. Fix: INF-03 |
| BUG-24 | S3 | OPEN | README is Figma Make boilerplate with a link to the Figma file | Fix: CLN-06 |
| BUG-25 | S1 | FIXED 2026-08-27, see sprint 2 D-18 commit | AirNow real-time feed carries no New York NO2 | Verified empirically 2026-08-27: 7-day /aq/data/ pull over the NYC bbox returned 638 NO2 rows, all state 34 (New Jersey); zero NY sites. NYSDEC pushes O3 and PM2.5 to AirNow but not NO2, so the live pulse voice rests (per §4.4) even though Bronx/Queens NO2 exists in EPA AQS at ~5 weeks lag. Ruled D-18: live absence filled from the archive typical profile per borough/month/day-type, source 'typical', disclosed. DAT-12 researches a real live source |

### Engine (superseded wholesale by SON-01, recorded for the case study)

| ID | Severity | Status | Description | Notes |
|---|---|---|---|---|
| BUG-25 | S1 | SUPERSEDED | Every musical decision derives from one scalar, `tension = aqi/180` | Pollutant values touch only effects. "Melody encodes pollutant profile," "arp reflects volatility," "bass carries PM residue" do not exist in code. SON-01 |
| BUG-26 | S2 | SUPERSEDED | Bass and pad read the same hardcoded `PROG` array | Bass is a root doubler. SON-01 |
| BUG-27 | S2 | SUPERSEDED | All triggers except pad and bass root are probabilistic | No metrical commitment; the "no hook" critique in code form. SON-01 |
| BUG-28 | S2 | SUPERSEDED | Displayed BPM range 72 to 110 does not match the v1 spec's 60 to 140 | Moot under D-12 (fixed 90). SON-01 |
| BUG-41 | S2 | FIXED 2026-09-16 | "WebGL context was lost" in the tab console at load | Not the sky's context: importing `@react-three/drei` by its index runs three-stdlib's WebGL capabilities probe, which creates a throwaway context Firefox later reclaims and reports. Fix: the sky imports Sky from its own module, so the index and the probe never load |
| BUG-40 | S1 | FIXED 2026-09-16 | The graph's plot ran past its panel on short laptops and the axis was cut off | The breakpoint's plot height was the floor even when the panel fills its space, and at 678 px tall the floor was taller than the space. Fix: filling its panel, the plot takes what the panel gives down to a 72 px floor (D-53) |
| BUG-39 | S1 | FIXED 2026-09-16 | On short rows (820×720, a tablet in landscape) the monitor cards' gauges were cut off; on phones the value cards kept their value under the title with the spare room below | The cards' spacing stepped by viewport breakpoint, which cannot see the row's height, and the gauge was the last element the column's overflow cut; the value cards were left out of the below-laptop centring rule when they lost their fourth line. Fix: the card is a size container and its inner column caps padding, gap and value type by the card's height (D-52); one centring rule for every card below laptop |
| BUG-38 | S2 | FIXED 2026-09-16 | The playhead's readout ran off the plot's left edge on a phone, and was the one element on the page in no material | A canvas-drawn chip centred on the playhead, with the live window's date in it. Fix: a frosted pill in the DOM placed by the graph each frame, clamped inside the plot, the date only on a plot 420 px or wider (D-52) |
| BUG-37 | S1 | FIXED 2026-09-16 | On a Mac trackpad the sideways swipe that turns the page back also fired the browser's back navigation | The page cannot scroll sideways, so a horizontal wheel gesture the page does not consume falls through to the browser's swipe-to-go-back. Fix: the root declares `overscroll-behavior: none`, which Chromium and Firefox honour as "this page owns its overscroll" and Safari from 16; the wheel handler keeps turning the page |
| BUG-36 | S0 | FIXED 2026-09-16 | Below laptop the bars' pills answered only along their far edge; the presets could not be tapped on a phone | Introduced the same day by D-48: the frame's box reaches 40 px past the band and is painted after the bars, and below laptop it took the pointer for the swipe, so it sat over the pills' near 24 px. Fix: the track, inset to exactly the band, takes the pointer; the frame's handlers still hear it |
| BUG-35 | S2 | FIXED 2026-09-16 | The graph's line and the legend disagreed in some views | Each hour carried a stored colour, blended between frames in sRGB during a morph (a grey at a height where the legend showed red), and a segment's two-stop gradient skipped the hues between its ends on a steep rise. Fix: one vertical ramp gradient for line, dots, dashes and fill columns, the legend's own stops (D-51) |
| BUG-34 | S1 | FIXED 2026-09-16 | A band across the frosted cards on cursor movement, on Firefox | Shoro's bisect: needs the DOM cursor and the backdrop blur, none of the sky layers. Firefox's WebRender re-renders only the strip the cursor damaged and recomputes the backdrop blur for that strip on a different sampling grid from the cached rest (the family of Firefox bugs 1741305 and 1573886); machine dependent because the dirty-region path depends on the compositor configuration. Chromium's earlier tile seams were the same class. Fix: the sky draws the blur itself inside every glass rectangle and no panel uses backdrop-filter (D-50, scene/FrostEffect.ts). Confirmed in Chromium; Firefox is Shoro's to confirm |
| BUG-33 | S1 | FIXED 2026-09-16 | Below laptop the monitor's grid ran past the bars; the value cards' unit line was cut on short rows | Tablet rows were fixed at --row-h, so on a tablet in landscape four rows outgrew the band and the first and last cards were clipped; on laptop the value card needs 157 px and the rows fall under that between 761 and 851 px tall (a 13" laptop with browser chrome), cutting the unit line. Fix: the section fills the band up to four rows with equal rows (D-49); the unit moved to the right end of the value line, so every card is three elements |
| BUG-32 | S2 | FIXED 2026-09-16 | The panel shadow was cut in a hard line at the band's edge on short viewports | The frame clipped at the gap (20 px) to keep a page mid-switch off the bars; the shadow reaches 40, and its 4% tail at 20 read as an edge wherever the graph sat on the band's edge. Fix: the visible drift of a switch is bounded to 12 px and the frame reaches the shadow (D-48) |
| BUG-31 | S2 | FIXED 2026-09-16 | The graph redrew the whole plot and rebuilt its observers on every render of the page | `themeColors()` returned a new object per call and the graph's draw effect listed it (and the target frame) as dependencies, so every page render tore the effect down: about a thousand full canvas redraws and 150 ResizeObserver rebuilds a second while anything eased, and the scene page arriving from the monitor stuttered while its ramp lift eased (Shoro: the swipe up was smooth, the inverse choppy; the monitor has no canvas). Fix: one colour object per theme; the draw effect owns only the canvas, observers and loop, a second effect asks for one redraw when the frame changes; the sampler skips panels on the off-screen page and every panel while a switch is in flight; the hidden graph gets no moving playhead. At rest and through paused switches the plot now draws zero times a second in either direction. |
| BUG-30 | S1 | FIXED 2026-09-15 | AQI is PM2.5 alone on the 2012 breakpoints | Every AQI on the page (number, word, graph line, daily) ran the hour's PM2.5 through the pre-2024 table; O3 and NO2 sub-indices existed in api/_lib/aqi.ts unused. EPA reports the highest sub-index, daily from daily statistics, real time from the NowCast, PM2.5 Good ending at 9.0 since May 2024. Fix: engine/aqi.ts, D-42 |
| BUG-29 | S2 | SUPERSEDED | `getMusicMapping` in `mockData.ts` still uses v1 mood words (Serene, Dreamy, Pensive, Uneasy, Turbulent) | Replaced by Easy / Shallow / Tight / Ragged / Suffocating in content.ts. DSN-01 |

---

## Template

```
| BUG-XX | SX | OPEN | [Description] | [Repro, root cause, fix item] |
```

## How to update this file

Investigating: IN PROGRESS. Fixed: FIXED with date and commit. Won't fix: WONTFIX with rationale. Replaced by a rewrite: SUPERSEDED with the BACKLOG item. New: bottom of the relevant section, next ID. Reference the BACKLOG item that fixes it, and reference the BUG from the BACKLOG item.
