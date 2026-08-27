# Backlog

Prioritized task backlog for NYC AQI Synth. Keyed to STRATEGY.md v2 section anchors. Priority: P0 (must ship for the phase named), P1 (should), P2 (stretch), P3 (later). Status: TODO, IN PROGRESS, DONE (with date), BLOCKED (with blocker), PARKED (logged, not committed), WONTFIX (with rationale).

Version 2, August 26, 2026. Supersedes the March 12 backlog. Every v1 item is accounted for in §Disposition at the bottom.

Phase 0 closed 2026-08-27 (STRATEGY D-17). Phase 1 is open.

---

## Phase 0: Prove the mapping (STRATEGY §7)

| ID | Priority | Status | Task | Notes |
|---|---|---|---|---|
| PH0-01 | P0 | DONE 2026-08-27 | Headless Tone.js prototype, no UI | Single HTML file or a `/prototype` route. Hardcode Queens hourly arrays for 2023-10-29, 2023-07-12, 2023-06-07, 2023-02-09 (PM2.5, O3, NO2). Arrays already extracted; see `/home/claude/contours.json` from the Aug 26 session or re-pull from EPA bulk files |
| PH0-02 | P0 | DONE 2026-08-27 | Engine per STRATEGY §3.2 to §3.6 | O3 contour → melody (24 notes, corpus-normalized, quantized to tier scale). NO2 contour → Euclidean k and rotation. PM2.5 → tier, FM harmonicity/index, detune, reverb. Fixed 90 BPM |
| PH0-03 | P0 | DONE 2026-08-27 (placeholder; real bed is SON-10) | Write the composed bed | Chord progression and bass figure in the clean-air scale, transposed by degree. One chord per bar |
| PH0-04 | P0 | WONTFIX 2026-08-27 | Listening test | Skipped on the author's verdict (D-17). Stranger-recognition question moved to O-11, to be asked informally once the real bed exists |
| PH0-05 | P1 | DONE 2026-08-27 | Audition perceived-tempo mechanisms (§3.9) | Density, articulation, harmonic rhythm at each tier. Only if Suffocating still feels composed, try stepped tempo fallback |
| PH0-06 | P2 | DONE 2026-08-27 | Audition Brownian detune amount | PM2.5-scaled microtonal jitter on melody. Find the range between "particulate" and "out of tune" |

## Data (STRATEGY §4)

| ID | Priority | Status | Task | Notes |
|---|---|---|---|---|
| DAT-01 | P0 | DONE 2026-08-27 (see BUG-25: AirNow carries no live NY NO2) | Live route on AirNow data endpoint | Replace observation/zipCode/current with the data endpoint: NYC bounding box, parameters O3,PM25,NO2, hourly, last 24 h, per site. Map sites to boroughs by county. Keep s-maxage=1800. Fixes BUG-11, BUG-12, BUG-13 |
| DAT-02 | P0 | DONE 2026-08-27 | Bulk-file archive script | Local script: download EPA AirData hourly zips for 88101, 88502, 44201, 42602 for 2020 to last complete year; filter state 36, counties 005/047/061/081/085; per-hour max across sites; write `public/data/{borough}-{year}.json`. No API key needed |
| DAT-03 | P0 | DONE 2026-08-27 | Live-year historical route on hourly EPA endpoint | `api/aqi/historical.ts` → AQS sampleData (hourly), params 88101,88502,44201,42602, window Jan 1 of current year to yesterday. Fixes BUG-15, BUG-16 |
| DAT-04 | P0 | DONE 2026-08-27 | Missing-data policy in `_lib/aqi.ts` and client | Per §4.4 as amended (D-16): unmonitored pollutant → citywide value, flagged as borrowed in the record. Remove PM10 estimator and field. Citywide = per-hour mean of reporting boroughs. Null only when no borough reports. Fixes BUG-13, BUG-14 |
| DAT-05 | P0 | DONE 2026-08-27 | Daily AQI from 24-h mean, not hourly max | Use EPA daily AQI where present; else compute from 24-h mean. Keep hourly max available for the phrase and pin labels (O-10). Fixes BUG-18, BUG-19 |
| DAT-06 | P1 | TODO | Find and pin notable days 2024 to 2026 | Script: top PM2.5, top O3, top NO2, cleanest per year. Propose to Shoro; only Shoro pins |
| DAT-07 | P1 | TODO | Source Delhi winter mean | WHO Ambient Air Quality Database or CPCB annual report. PM2.5, O3, NO2 with citation in content.ts. O-03 |
| DAT-08 | P1 | TODO | Lockdown: measured or counterfactual | Pull April 2020 from bulk files. If coverage is good, it's a pin; else a sourced counterfactual. O-04 |
| DAT-09 | P1 | TODO | Verify WHO guideline unit conversions | 100 µg/m³ O3 8-h and 25 µg/m³ NO2 24-h to ppb at 25 °C. Cite conversion |
| DAT-10 | P2 | TODO | Check for NO2 monitors outside Bronx/Queens under other parameter codes | O-05. Affects which boroughs borrow NO2 |
| DAT-11 | P2 | TODO | Verify 88502 coverage holds for 2024 to 2026 | 2023 checked. Spot-check before relying on it in copy |
| DAT-12 | P2 | TODO | Research whether NYSDEC's own real-time monitoring page exposes NO2 outside AirNow | BUG-25 follow-up: live NO2 currently a typical archive profile (D-18). A real live source would retire the fill |

## Infrastructure (STRATEGY §6)

| ID | Priority | Status | Task | Notes |
|---|---|---|---|---|
| INF-01 | P0 | DONE 2026-05 | Migrate off Supabase to Vercel serverless | Commit 6e5bb35. Four routes under `api/`, shared `_lib/aqi.ts`, CDN caching |
| INF-02 | P0 | DONE 2026-05 | GitHub repo and Vercel project | ryo-67/Interactiveaqisynth → interactive-aqi-synth.vercel.app, env vars set |
| INF-03 | P0 | DONE 2026-08-27 | Verify/set `maxDuration` for historical route | `_lib/aqi.ts` assumes a 90 s deadline; vercel.json sets none. Check plan limits, set explicitly. O-06, BUG-23 |
| INF-04 | P1 | DONE 2026-08-27 | Remove `hono` and other server leftovers from package.json | Leftover from the Deno server. BUG-22 |
| INF-05 | P2 | TODO | Cron or on-deploy warm of the historical route | Only if cold EPA fetch is still visible after UX-01 defers historical load |

## Code cleanup

| ID | Priority | Status | Task | Notes |
|---|---|---|---|---|
| CLN-01 | P0 | DONE 2026-08-27 | Delete `src/components/ui/` (48 files) | Zero imports from live code. BUG-05 |
| CLN-02 | P0 | DONE 2026-08-27 | Delete `src/imports/` (Make export, 2,295 lines) and `src/components/figma/` | Zero imports. BUG-07 |
| CLN-03 | P0 | DONE 2026-08-27 | Remove 33 unused dependencies | All @radix-ui/*, class-variance-authority, cmdk, embla-carousel-react, hono, input-otp, next-themes, react-day-picker, react-hook-form, react-resizable-panels, recharts, sonner, vaul, tailwind-merge (verify), clsx (verify). Keep: react, react-dom, tone, motion, lucide-react |
| CLN-04 | P0 | DONE 2026-08-27 | Clean vite.config.ts aliases | Remove versioned package aliases and `figma:asset` alias once assets are gone. BUG-08 |
| CLN-05 | P1 | DONE 2026-08-27 | Delete `src/assets/*.png`, `src/Attributions.md`, `src/guidelines/` | Make scaffold |
| CLN-06 | P1 | TODO | Replace README | Currently Make boilerplate. One paragraph, link to STRATEGY.md. BUG-24 |
| CLN-07 | P1 | DONE 2026-08-27 | Remove `console.warn` monkey-patch in SynthEngine | Address polyphony/scheduling at root once the engine is replaced. BUG-04 |
| CLN-08 | P2 | TODO | Remove `warmupEdgeFunction`, `runDiagnostic` from load path | Diagnostic route can stay; it should not run on first paint |

## Sonification (STRATEGY §3)

| ID | Priority | Status | Task | Notes |
|---|---|---|---|---|
| SON-01 | P0 | DONE 2026-08-27 | Port prototype/phase0.html V4 into src/engine/ | Delete PolySynth voices, PROG array, random-walk melody, texture controls. Carry: transport offset start, loop-boundary dedup, two-reverb crossfade, private bass lowpass |
| SON-02 | P0 | DONE 2026-08-27 | Uniform effects chain | Every voice through the same filter and reverb. BUG-17 |
| SON-03 | P0 | DONE 2026-08-27 | Corpus normalization per pollutant per borough | Computed from loaded archive. §3.10 |
| SON-04 | P0 | TODO | Virtual AQI wiring | Slider/counterfactual → AQI via `pm25ToAQI`, `o3ToAQI`, `no2ToAQI` → tier → everything. Today's contours scaled to new levels. §3.7 |
| SON-05 | P1 | DONE 2026-08-27 (code paths ported; no fixture exercises a true null hour) | Rest handling | Null hour → melody rest, pulse hit skipped. §3.3, §4.4 |
| SON-06 | P1 | DONE 2026-08-27 | Borrowed-channel flag in the engine | Engine reads per-channel provenance (own vs citywide) so the source line and readout can state it. No sonic difference |
| SON-07 | P2 | TODO | Phrase-boundary behavior in Listen | What happens at the top of each 16 s loop as the hour rolls over |
| SON-08 | P3 | TODO | Timelapse clock and accumulation model | Own compression ratio. Reverb bleed across days. O-01 |
| SON-09 | PARKED | WONTFIX 2026-08-27 | Stepped tempo fallback | Fixed clock held up in Phase 0 (O-09 closed) |
| SON-10 | P0 | TODO | Write the real bed | Six bars, cycles with the day. Phase 0 bed [1, 5, 4, 1, 5, 1] is a placeholder. Shoro writes; engine transposes by degree |

## Experience / UX (STRATEGY §2, §5)

| ID | Priority | Status | Task | Notes |
|---|---|---|---|---|
| UX-01 | P0 | DONE 2026-08-27 | Load sequence: Listen needs only the last 24 h | Remove health warmup and five sequential historical fetches from first paint. Historical loads when the timeline opens. Fixes BUG-20 |
| UX-02 | P0 | TODO | Entry moment | Framing copy, first-listen, Tone.start() gesture. Covers any live-fetch latency |
| UX-03 | P0 | TODO | Timeline with pins and lag gap | Dashed gap from last EPA day to today, label with weeks computed at load. Pins from §2.2. Replaces stitched timeline. Fixes BUG-02, BUG-03 |
| UX-04 | P0 | TODO | Counterfactual selector | WHO, Delhi, Lockdown. Visually distinct from pins. §2.3 |
| UX-05 | P0 | TODO | Pollutant sliders with real-value anchors | PM2.5, O3, NO2. Anchor = current hour's reading. No PM10 slider |
| UX-06 | P0 | TODO | Speculative state indicator | On AQI number and orbs |
| UX-07 | P0 | DONE 2026-08-27 | Source line states borrowed channels per borough | "Brooklyn monitors PM2.5; O3 and NO2 are citywide." Per §5.2 |
| UX-08 | P0 | DONE 2026-08-27 (the score playhead is the indicator) | Phrase indicator | 24-step marker showing which hour is playing |
| UX-09 | P1 | DONE 2026-08-27 (map/pills concept superseded by §5 words-only page) | Responsive layout, laptop and phone | Map on laptop, pills on phone. BUG-06 |
| UX-10 | P1 | DONE 2026-08-27 (loading overlay deleted with UX-01) | Loading copy | Remove "Waking up the server." BUG-21 |
| UX-11 | P1 | TODO | Progressive disclosure | Mood + AQI + play first; timeline, counterfactuals, sliders discoverable |
| UX-12 | P2 | TODO | Keyboard accessibility audit | Sliders, timeline, focus order |
| UX-13 | P3 | TODO | Scrollytelling wrapper | Only if wanted after Phase 1 ships |

## Design system and content

| ID | Priority | Status | Task | Notes |
|---|---|---|---|---|
| DSN-01 | P0 | DONE 2026-08-27 | Create `src/content.ts` | All prose, mood words, pin labels and blurbs, counterfactual definitions with sources, UI labels |
| DSN-02 | P0 | DONE 2026-08-27 | Expand `theme.ts` tokens | Type scale, spacing, motion, opacity per STRATEGY §5 |
| DSN-03 | P1 | IN PROGRESS (Listen components done; Timeline, Imagine, actions are 3b/3c) | Hand-style all components | No shadcn remnants, tokens only |
| DSN-04 | P1 | TODO | Mood word copy pass | O-02. Shoro writes |
| DSN-05 | P2 | TODO | Figma variables matching tokens | For MCP sync. Not blocking |
| DSN-06 | P3 | TODO | Differentiated dark/light | Phase 2 |

## Visualization

| ID | Priority | Status | Task | Notes |
|---|---|---|---|---|
| VIZ-01 | P1 | TODO | Orbs respond to virtual AQI in Imagine | |
| VIZ-02 | P1 | TODO | Orbs clear correctly on theme switch | BUG-10 |
| VIZ-03 | P2 | TODO | Orb behavior by mode | Present breathing, past settled |

## Polish

| ID | Priority | Status | Task | Notes |
|---|---|---|---|---|
| POL-01 | P1 | TODO | Recording filename with borough, date, AQI | |
| POL-02 | P1 | TODO | Share modal shows real vs virtual in Imagine | |
| POL-03 | P2 | TODO | Theme persists across refresh | BUG-09. localStorage is fine in the deployed app |

## Docs

| ID | Priority | Status | Task | Notes |
|---|---|---|---|---|
| DOC-01 | P0 | DONE 2026-08-26 | STRATEGY v2, BACKLOG v2, BUGS v2, CLAUDE.md v2 | This session |
| DOC-02 | P1 | TODO | CHANGELOG entry for the concept revision | |
| DOC-03 | P2 | TODO | Handoff doc set at ship: technical doc, concept statement, runbook, entry-moment copy as signage | Body Politic template |

---

## Disposition of v1 items

| v1 ID | Disposition |
|---|---|
| INF-01 Export Supabase data | WONTFIX. Supabase removed; historical now fetched live and, in v2, from bulk files |
| INF-02 GitHub repo | DONE → INF-02 |
| INF-03 Vercel project | DONE → INF-02 |
| INF-04 Edge function for AirNow | DONE as serverless route → INF-01; endpoint change → DAT-01 |
| INF-05 Static JSON per borough | Superseded → DAT-02 (hourly bulk archive) |
| INF-06 Remove Supabase | DONE → INF-01 |
| INF-07 Update fetch functions | DONE → INF-01; further changes → DAT-01, DAT-03 |
| INF-08 Local EPA refresh script | Superseded → DAT-02 |
| CLN-01 to CLN-05 | Carried → CLN-01 to CLN-05 |
| DSN-01 theme tokens | → DSN-02 |
| DSN-02 content.ts | → DSN-01 |
| DSN-03 Figma variables | → DSN-05, deprioritized |
| DSN-04 hand-style | → DSN-03 |
| DSN-05 responsive | → UX-09 |
| SON-01 FM refactor | → PH0-02, SON-01 |
| SON-02 dominant-pollutant voicing | WONTFIX. Dropped, STRATEGY D-04 |
| SON-03 four voice roles | WONTFIX. Replaced by §3.2 roles |
| SON-04 data-responsive chord roots | WONTFIX. Bed is composed; bass follows NO2 |
| SON-05 BPM curve | WONTFIX. Fixed clock, D-12 |
| SON-06, SON-07 virtual AQI | → SON-04 |
| SON-08 pollutant melodic behavior | WONTFIX. Melody is O3 contour |
| SON-09 BPM curve testing | WONTFIX |
| SON-10 arp volatility | WONTFIX. Euclidean pulse, D-06 |
| SON-11 timelapse composition | → SON-08 |
| UX-01 entry moment | → UX-02 |
| UX-02 speculative sliders | → UX-05, PM10 removed |
| UX-03 presets | Split → UX-03 (pins) and UX-04 (counterfactuals) |
| UX-04 speculative indicator | → UX-06 |
| UX-05 progressive disclosure | → UX-11 |
| UX-06 responsive borough | → UX-07, UX-09 |
| UX-07 loading redesign | → UX-01, UX-10 |
| UX-08 Remember mode | → UX-03, now Phase 1 P0 |
| UX-09 gap handling | → UX-03 |
| UX-10 scrollytelling | → UX-13 |
| UX-11 dark/light | → DSN-06 |
| VIZ-01 to VIZ-03 | → VIZ-01, VIZ-03; VIZ-02 is new |
| POL-01 to POL-03 | → POL-01, POL-02, UX-12 |

## How to update this file

Start: IN PROGRESS. Finish: DONE with date. Blocked: BLOCKED with blocker. Drop: WONTFIX with rationale, and add a line to STRATEGY §8 if it reverses a decision. New tasks: bottom of the relevant section, next ID.
