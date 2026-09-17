# CLAUDE.md

Guidance for Claude Code working in this repository. Read `docs/STRATEGY.md` before any non-trivial change; it is canonical for concept and requirements. When this file, STRATEGY.md, and source disagree, source wins and the docs get updated.

## What this is

NYC AQI Synth: a single-page web app that plays New York's air as music. Live air today, a pinned timeline of the days that mattered, and sourced counterfactuals (WHO guideline, Delhi winter, 2020 lockdown). Designed and directed by Shoro Roy. Figma Make generated the prototype; Claude Code executes the refactor. Neither is a co-designer. Creative decisions and copy are Shoro's.

The sonification model (STRATEGY §3) is the intellectual core. Ozone's hourly contour is the melody, NO2's hourly contour drives a Euclidean pulse, PM2.5 sets dissonance (scale tier, FM harmonicity, detune, reverb). Every parameter change needs a rationale linking a measurement to a sound, in a code comment.

## Current state of the repo (September 17, 2026)

Be precise about what exists. Much of STRATEGY.md is still target state, but far less than it was: the sections below were last reconciled against the working tree on 2026-09-17.

Shipped and working:
- React 18 + TypeScript + Vite (SWC), Tailwind v4, Tone.js, three.js via @react-three/fiber and postprocessing for the sky, Canvas 2D for the graph.
- Vercel serverless routes under `api/`: `aqi/current.ts` (AirNow data endpoint, NYC bbox, per site), `aqi/historical.ts` (EPA AQS, current year only), `health.ts`, `aqi/diagnostic.ts`. Shared logic in `api/_lib/aqi.ts`. CDN caching via `Cache-Control: s-maxage`; `vercel.json` sets `maxDuration: 300` on the historical route.
- Deployed at aqi-synth.vercel.app from GitHub main. Env vars on Vercel: `AIRNOW_API_KEY`, `EPA_AQS_EMAIL`, `EPA_AQS_API_KEY`.
- `/` is the scene (`src/scene/ScenePage.tsx`, D-40); `/scene` is an alias and `/scene-test` is the tuning harness. The earlier typographic page (`App.tsx`) is deleted.
- `src/content.ts` holds the prose (DSN-01). `src/utils/theme.ts` holds the tokens (DSN-02).
- The engine is the Phase 0 engine, not the Figma one: `src/engine/SynthEngine.ts` with `contour.ts`, `euclid.ts`, `scales.ts`, `aqi.ts`. FM voices, Euclidean pulse, six tiers, fixed 90 BPM (SON-01 to SON-03, SON-05, SON-06 done).
- The static archive is built and committed: `public/data/{borough}-{year}.json` for 2020 to the current-year snapshot, plus `anchors.json` — 44 files. `ARCHIVE_LAST_DATE` in `nycOpenData.ts` is 2026-07-20, which is genuinely the last day with complete PM2.5; the snapshot files run to 2026-08-01 with PM2.5 falling away after the 20th.
- Tests exist: vitest, `npm test`, 8 files and 54 tests covering the AQI tables, the Euclidean pulse, the monitor mapping, the graph series, solar position and time helpers.
- The dead code is gone: `src/components/ui/`, `src/imports/`, `src/components/figma/`, `src/assets/`, `src/guidelines/` and the unused dependencies were all deleted (CLN-01 to CLN-05, CLN-07, CLN-08).

Not yet done (see BACKLOG.md):
- Imagine is not built: no virtual-AQI wiring (SON-04), no counterfactual selector (UX-04), no pollutant sliders (UX-05), no speculative indicator (UX-06).
- The bed is still the Phase 0 placeholder; the real one is Shoro's to write (SON-10).
- The timeline's drawn lag gap (UX-03, BUG-02). The lag IS stated in prose in the About overlay.
- No linter, and ten `eslint-disable react-hooks/exhaustive-deps` directives that nothing enforces (CLN-09, BUG-51).
- No landmarks and no `h1` on the page (A11Y-01, BUG-48).
- Copy placeholders awaiting Shoro: `ENTRY.title`, `ENTRY.line`, `LIVE_STATUS.*`, `ABOUT.close`, `ABOUT.dismiss`.

## Commands

```bash
npm install
npm run dev       # Vite dev server on port 55128, frontend only; without API keys the live feed fails and the page says so
vercel dev        # frontend + serverless functions with real APIs (needs .env with the three keys)
npm run build     # production build to build/
npm test          # vitest, 54 tests

# npx tsc --noEmit  # vite build does NOT typecheck; run this too before calling a change done
```

`vercel.json` sets the framework and `outputDirectory: build`, `functions["api/aqi/historical.ts"].maxDuration: 300` (INF-03, done), and rewrites `/scene` and `/scene-test` to the SPA.

## Target architecture (STRATEGY §4 to §6)

```
api/
  _lib/aqi.ts            AQI breakpoint math, borough/county/site maps, fetch + transform. No estimation of missing values.
  aqi/current.ts         AirNow data endpoint: NYC bbox, O3+PM25+NO2, hourly, last 24 h, per site → per borough
  aqi/historical.ts      EPA AQS hourly sampleData for the current year only; 88101+88502, 44201, 42602
  health.ts
public/data/
  {borough}-{year}.json  Hourly archive 2020 → last complete year, built by scripts/build-archive.* from EPA AirData bulk zips
scripts/
  build-archive.*        Local only. No API key. Filters state 36, counties 005/047/061/081/085.
src/
  scene/ScenePage.tsx    The page. Listen loads last 24 h only; archive days load by month on demand.
  content.ts             All prose, mood words, pin labels, counterfactual values with sources, UI labels
  components/            Hand-styled, tokens only: EntryMoment, AQIDisplay, BoroughSelector, PhraseIndicator,
                         Timeline (pins + lag gap), CounterfactualSelector, PollutantSliders, AQIVisualizer,
                         Transport, ShareModal, RecordButton
  engine/                SynthEngine (FM voices), contour.ts (normalize/quantize), euclid.ts, scales.ts, aqi.ts (client breakpoints)
  utils/theme.ts         Design tokens + ThemeContext
docs/
  STRATEGY.md  BACKLOG.md  BUGS.md  CHANGELOG.md
```

Data shape, one record per borough per hour:

```ts
interface HourReading {
  ts: string;                 // ISO local hour
  pm25: number | null;        // µg/m³, max across sites
  o3: number | null;          // ppb
  no2: number | null;         // ppb
  source: { pm25: 'own' | 'citywide'; o3: 'own' | 'citywide'; no2: 'own' | 'citywide' | 'typical' };
}
```

`null` means no borough reported that hour. A borough without its own monitor for a pollutant carries the citywide value in that field and `source.<pollutant> = 'citywide'` alongside it (STRATEGY §4.4, D-16). Nothing is ever estimated from a different pollutant. There is no PM10 field.

## Rules

Sonification
- Read STRATEGY §3 before touching `engine/`. Implement the roles as specified: O3 → melody, NO2 → pulse and bass, PM2.5 → tier/harmonicity/detune/reverb, composed bed inherits tier. Six tiers, one per EPA grade, ordered by loss of tonal centre (D-44, D-46, D-47): Major, Pentatonic, Dorian, Phrygian, Locrian, Chromatic; the bed is voiced in stacked fourths (D-47); the timbre axis is distance from an integer harmonicity ratio; Hazardous is denser (a 1.2 s melody release), never sparser; detune σ slopes with the hour's PM2.5 AQI.
- Fixed 90 BPM. One hour = one beat, one day = 24 beats. Do not encode data in transport tempo (D-12). Perceived speed comes from Euclidean density, articulation, and harmonic rhythm (§3.9).
- Null hour (no borough reporting) = rest. A borough without its own monitor for a pollutant plays the citywide value for it, flagged as borrowed. Never derive one pollutant from another.
- Normalize contours against the loaded NYC distribution, not the AQI theoretical range (§3.10).
- Every mapping gets a comment: which measurement, which parameter, what the metaphor is.
- Imagine mode must recompute everything downstream of virtual AQI, not just the parameter being dragged.

Data
- Missing is null only when no borough reports. Citywide is the per-hour mean of reporting boroughs.
- The AQI is EPA's reported AQI (D-42, `src/engine/aqi.ts`): the highest pollutant sub-index on the current breakpoint tables. A chosen day's number is the official daily AQI from daily statistics; Live and the graph line are the NowCast composite. The routes ship hours only; never compute an AQI anywhere else. The sound's tier is PM2.5 alone.
- Look up API behavior before proposing a fix. AirNow and EPA AQS both have quirks; do not cycle through guesses.
- Live NO2: New York publishes none in real time, so absence is filled from the archive's typical profile, flagged source.no2 = 'typical' and disclosed on the page (D-18, amending §4.2/§4.4).

Code
- TypeScript strict. Functional components. No component libraries. Tokens from `theme.ts` only. All prose from `content.ts`.
- Delete, don't disable. Dead code goes.
- Architectural problems get architectural fixes. The timeline gap (BUG-03) is two sources in one array; fix the structure, not the scrubber.
- api/ has its own CommonJS tsconfig; the root tsconfig scopes to src/. Vercel's function builder uses the nearest tsconfig.
- vercel dev does not reproduce the production function build; after every push that touches api/, hit /api/health and /api/aqi/current on the deployed URL before calling it done.
- Archive data comes from public/data/, including a snapshot of the current year so far (`scripts/build-current-year.ts`, D-41; re-run and commit when EPA publishes more). The EPA API is only ever asked about current-year days after the snapshot's last day. The last day offered is held by `ARCHIVE_LAST_DATE` in `nycOpenData.ts` (2026-07-20, the last day with complete PM2.5); move it when the snapshot is rebuilt.
- Mobile-first layout, two breakpoints (laptop 1024+, phone <768).

Docs
- Change a decision → add a row to STRATEGY §8 with the date and reason.
- Fix a bug → BUGS.md status with date and commit. Finish a task → BACKLOG.md status with date.
- CHANGELOG entries say why, not just what.

## Working with Shoro

- Label substantive output with STAKES = LOW / MED / HIGH. HIGH = anything user-facing or hard to undo; ask before committing.
- Plan mode before any layout change or any change touching more than three files. State what will change and why, wait for approval.
- Honest reporting: say what was tested and how, what wasn't, and what is unverified. A build that compiles is not a build that works. If the audio wasn't listened to, say so.
- Version prompts and files as V-series when iterating on one thing (V1, V2...), with the rule that changed noted inline.
- No hard line-wrapping in prose. Comments and docs wrap naturally.
- Audio level language: "pinch" ≈ −2 dB, "tad" ≈ +3 dB.
- Copy, mood words, and anything a visitor reads are Shoro's to write. Propose; don't ship prose.
- Voice: direct, mechanism-level, no filler. Avoid: delve, tapestry, pivotal, groundbreaking, game-changing, robust, leverage, cutting-edge, "it's important to note," "in conclusion," "not just X but Y." No "from X to Y" without a real measured range.

## Phase status

Phase 0 closed 2026-08-27 (STRATEGY D-17). `prototype/phase0.html` V4 is the reference engine; its locked values are in STRATEGY §3.5 and §3.6. Phase 1 is open. The bed in the prototype is a placeholder; the real bed is Shoro's to write (BACKLOG SON-10) and the engine must transpose whatever degree array it is given.
