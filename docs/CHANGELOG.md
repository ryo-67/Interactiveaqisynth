# Changelog

Why, not just what. Newest first.

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
