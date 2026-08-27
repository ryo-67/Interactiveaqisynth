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
| BUG-29 | S2 | SUPERSEDED | `getMusicMapping` in `mockData.ts` still uses v1 mood words (Serene, Dreamy, Pensive, Uneasy, Turbulent) | Replaced by Easy / Shallow / Tight / Ragged / Suffocating in content.ts. DSN-01 |

---

## Template

```
| BUG-XX | SX | OPEN | [Description] | [Repro, root cause, fix item] |
```

## How to update this file

Investigating: IN PROGRESS. Fixed: FIXED with date and commit. Won't fix: WONTFIX with rationale. Replaced by a rewrite: SUPERSEDED with the BACKLOG item. New: bottom of the relevant section, next ID. Reference the BACKLOG item that fixes it, and reference the BUG from the BACKLOG item.
