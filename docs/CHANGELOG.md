# Changelog

Why, not just what. Newest first.

## 2026-09-15 — The sky as a play button; a paused day reads the new day

Clicking anywhere on the sky now toggles play. It is the largest target on the page, the audio gesture is the click itself, and the panels above it still take their own clicks; Space already did the same from the keyboard, so the box carries a role and label but stays out of the tab order. The paused regression had a structural cause: when pause stopped clearing the engine's last beat report (so the page could show where it paused), that report also stayed the source of the mood, the channels and the plume, so switching days while paused kept the old day's reading until a beat arrived, which it never does while paused. The paused hour is now remembered on its own, the stale report is cleared when the day changes at rest, and the page reads the new day at that hour, so the smoke, grade and grain ease to the new data in place while the playhead holds.

## 2026-09-15 — Adaptive glass, graph tabs, stars that turn

The glass now does what Apple's material does: each panel samples the rendered sky under its own rectangle a few times a second — a handful of single-pixel reads from the finished frame, after post-processing — and switches between a light and a dark material with hysteresis, its children re-theming with it. This exists because no single fill can hold AA for one text colour against both a white horizon and a night sky; two tones with the fill alpha set by the worst-case arithmetic can. Text tokens were raised to pass 4.5:1 on those fills and the faint token is now lines-only. The graph's toggles became tabs, one track at a time with the pulse row always beneath, because stacking four tracks was the wrong instrument; each bar in the pulse row now shows its hit count. The star field turns about the celestial pole fifteen degrees an hour, so facing south the stars rise on the left and set on the right, and it covers the whole sphere so nothing rotates into view as a gap.

## 2026-09-15 — The graph, day navigation, camera south (D-22, D-23)

The score panel was two clocks and three vocabularies: the playhead stepped on the integer beat while the sun glided, and the NO2 marks summarized each bar as one height. The graph fixes the structure. One eased hour lives in the session hook and drives the sun, the playhead and every track; the pulse row draws the engine's own 16-step Euclidean pattern per four-hour bar — 96 steps across the day, four under every hour — from the engine's own functions and rotation rule, pinned by a parity test, so the mark under the playhead is the hit being heard. Sixteen steps per bar, not twenty-four per day: the pulse is the rhythm inside each beat, and k needs sixteenths to act on. PM2.5, O3 and NO2 become labelled tracks in their own units; colour is reserved for AQI, in the standard EPA six-category palette with its legend (D-23), because visitors read AQI against that palette everywhere else. Particulate matter is not drawn on the graph: it is the sky. Day navigation arrives as pagination, the §2.2 pins and a hand-built calendar, with the session hook loading a chosen day through the existing client and restarting the phrase. The camera now faces south (D-22) so the sun arcs left to right, and the disc is on the page with a halo; its size stays a harness benchmark.


## 2026-09-14 — The scene on the physically based sky (D-19 rebuild, D-20, D-21)

Commits 7af8bfb through this one. The Canvas-2D scene failed review on fidelity, so the rebuild went to a real sky: three.js with Hosek-Wilkie for daylight and Preetham for night, because each renders one condition the other cannot — Hosek a real clear sky, Preetham a real night — and the cross-fade ends at 0° because the Hosek dataset is frozen there. Tone mapping was found inert on both models (r3f's ACES default lands through a pre-r155 path, and the composer bypasses material tone mapping anyway) and wired explicitly; every judgment before that fix was measuring its absence. Ground albedo was investigated as the smoke mechanism and rejected: it was 0.1, never 0, and moving it barely shifts a smoke day. Bruneton was evaluated and rejected because every shipped implementation bakes one fixed atmosphere into 16 MB of tables with no runtime aerosol control, and the one configurable option needs React 19. Smoke is therefore a composited plume, and that is the correct model rather than a workaround: a sky model renders clear air holding more aerosol, whereas June 7 was a plume between the observer and the sky. The plume needed two terms, attenuation and in-scatter, because attenuation alone can only darken and midday smoke is bright. The camera pitch is derived from the vertical fov so the horizon never enters the frame at any aspect. Exposure is clock-only; ozone keeps rayleigh and bloom. The page at /scene shares one session hook with the typographic page so the two cannot drift; / stays as it is until the scene passes review. Benchmarking the literal sun surfaced that the camera has always faced away from it — facing is now a harness control and Shoro's call.


## 2026-08-27 — Scene prototype (D-19 task 2)

Commits b43f1aa, 9ef3a27, and the scene commit. The visual direction reversed to the immersive register (D-19), and this is its Phase 0: one full-bleed scene at /scene where everything drawn is a channel — the sun rides the real solar arc for the day's date with its apex scaled by O3, the haze is PM2.5 with the tier's own smoothing, the city band is NO2's pulse made light. The sun was moved from phrase position to the clock because a sun that teleports at the loop seam breaks the sky illusion the register depends on; the clock puts it in the same place on both sides of the wrap. June 7 renders orange because that is what the sky did. Canvas 2D passes the phone budget with 2.4x headroom at 4x CPU throttle, so WebGL stays unnecessary (O-14).


## 2026-08-27 — Phase 1 sprint 3a: the Listen page

Commits 2b3114e, 0c9a731, f6e7606. The page now is the design: one column, controls as words, the score as the picture, per §5. The chrome that made the old build read as a settings page — orbs, map, pills, sliders, icon buttons, the loading overlay's last remnants — is deleted, not hidden, because chrome kept in reserve gets remounted. The mood sentence names the playhead hour and the dominant channel so the static latest-hour number and the moving mood describe different things on purpose and say so. Tier color appears in exactly four places at tokened opacities; measured contrast on the dark ground is 5.7:1 or better at full strength. The historical route pads its EPA window a day each side (O-12) because EPA bounds requests in standard time and summer edge days were arriving an hour short.


## 2026-08-27 — Phase 1 sprint 2: the data pipeline

Commits 6473a4a, 8d4573f, c8aaf4f. The engine can now play any borough, any day since 2020, from real hourly data. One transform implements §4.4 for every source and is pinned by unit tests, because the substitution and citywide rules are the kind of logic that silently rots when reimplemented per route. The archive is committed static JSON (36 borough-year files, ≤79 KB gzipped each) because 2020–2025 never changes and the EPA API should only ever be asked about the current year. Timestamps are true America/New_York wall clock derived from GMT everywhere — EPA reports Standard Time year-round, which would have shifted every summer hour label by one against AirNow's live labels; DST days keep their real 23/25 hours per the Phase 0 ruling. First paint now loads one 24-hour fetch instead of five sequential 150-second historical calls. Found and filed in the process: AirNow's real-time feed carries no New York NO2 at all (BUG-25) — live Listen plays with the pulse voice resting, which §4.4 anticipated, and a source decision is open.


## 2026-08-27 — Phase 1 sprint 1: cleanup and engine port

Commits e5e2d2c, 48762f4, 52bf7f3. The Figma Make scaffold went first (9,761 lines, 39 dependencies, the alias table) so the port landed in a repo where everything present is real. The Phase 0 engine moved from prototype/phase0.html V4 into src/engine/ unchanged in behavior — the prototype is the spec's reference implementation, so the port is deliberately a transcription, not a redesign. The app now plays the six fixture days through the real engine behind the existing play/pause; the random-walk PolySynth engine and the v1 mood copy are gone because two sonification vocabularies in one repo would drift. Strict tsconfig added because the TypeScript-strict rule previously had nothing enforcing it.


## 2026-08-27 — Phase 0 closed

Prototype `prototype/phase0.html` V1 → V4, built by Claude Code against STRATEGY §3, audited by Shoro by ear.

- V1: engine as specified. Two engineering fixes surfaced Tone.js behaviors the product engine must carry: start the transport with an offset rather than pre-setting `position` (pre-setting fires every skipped beat at once), and guard the loop boundary (it fires twice at the same audio time).
- V2: bed lengthened from four bars to six so it cycles with the 24-beat day and the 5→1 cadence at the wrap is composed rather than accidental. Brooklyn June 7 added as a real all-null O3/NO2 record to exercise the missing-data path.
- V3: bass and pulse given separate timbral identities (sub vs click) because they were the same FM voice at two octaves. Brooklyn October 29 added as the clean control for the absence rendering.
- V4: Brooklyn days switched from null channels to citywide substitution. Reason: with two voices missing, Brooklyn June 7 sounded more alarming than the Queens wildfire day itself, so absence was carrying a meaning the data hadn't earned. Decision D-16; §4.4 rewritten; one-lung rendering dropped.

Verdict: sound approved by the author. Three-listener test skipped (D-17); stranger-recognition moved to O-11. Phase 1 open.

## 2026-08-26 — Concept revision, docs v2

- Data audit of the live deployment and EPA archive found: live NO2 always zero and identical PM2.5 across boroughs (AirNow zip endpoint), PM10 synthesized from PM2.5, only Bronx and Queens carrying three channels, June 2023 outside the historical window. Recorded as BUG-11 to BUG-24.
- Hourly EPA data showed O3 has a daily arch, NO2 a rush-hour spike, and PM2.5 no daily shape. Roles reassigned: O3 melody, NO2 pulse, PM2.5 dissonance (D-04, D-05, D-06). Four semantic voices, coefficient-of-variation arp, data-driven chord roots, AQI-driven tempo, and PM10 dropped (§12).
- Dissonance kept as the core mapping after considering constriction; the mapping translates a bodily sensation, not a cultural verdict (D-03).
- Fixed 90 BPM phrase clock; perceived speed from density, articulation, harmonic rhythm (D-12).
- Visual direction: the 24-hour graphic score is the primary visual; all controls typographic (D-14).
- STRATEGY v2, BACKLOG v2, BUGS v2, CLAUDE.md v2 written; v1 items dispositioned.

## 2026-05 — Supabase migration

Commit 6e5bb35. Supabase Edge Functions and KV cache replaced 1:1 by Vercel serverless routes with CDN cache headers. Reason: free-tier project paused after a week of inactivity and broke data fetch (BUG-01). Deployed to interactive-aqi-synth.vercel.app with real keys.

## 2026-03 — Figma Make export

Initial codebase from Figma Make under Shoro's direction. React 18, Tone.js PolySynth engine, Supabase backend, shadcn scaffold.
