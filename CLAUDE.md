# CLAUDE.md

Guidance for Claude Code working in this repository. Read `docs/STRATEGY.md` before any non-trivial change; it is canonical for concept and requirements. When this file, STRATEGY.md, and source disagree, source wins and the docs get updated.

## What this is

NYC AQI Synth: a single-page web app that plays New York's air as music. Live air today, a pinned timeline of the days that mattered, and sourced counterfactuals (WHO guideline, Delhi winter, 2020 lockdown). Designed and directed by Shoro Roy. Figma Make generated the prototype; Claude Code executes the refactor. Neither is a co-designer. Creative decisions and copy are Shoro's.

The sonification model (STRATEGY §3) is the intellectual core. Ozone's hourly contour is the melody, NO2's hourly contour drives a Euclidean pulse, PM2.5 sets dissonance (scale tier, FM harmonicity, detune, reverb). Every parameter change needs a rationale linking a measurement to a sound, in a code comment.

## Current state of the repo (August 26, 2026)

Be precise about what exists. Most of STRATEGY.md is target state, not shipped state.

Shipped and working:
- React 18 + TypeScript + Vite (SWC), Tailwind v4, Tone.js, motion/react, Canvas API.
- Vercel serverless routes under `api/`: `aqi/current.ts` (AirNow proxy), `aqi/historical.ts` (EPA AQS proxy), `health.ts`, `aqi/diagnostic.ts`. Shared logic in `api/_lib/aqi.ts`. CDN caching via `Cache-Control: s-maxage` (current 1800, historical 86400 with swr 604800). No storage layer.
- Deployed at interactive-aqi-synth.vercel.app from GitHub main. Env vars on Vercel: `AIRNOW_API_KEY`, `EPA_AQS_EMAIL`, `EPA_AQS_API_KEY`.
- `App.tsx` orchestrates all state. Components: `SynthEngine`, `AQIVisualizer`, `TimelineScrubber`, `NYCBoroughMap`, `AQIInfo`, `RecordButton`, `ShareModal`. Utilities: `utils/theme.ts`, `utils/mockData.ts`, `utils/nycOpenData.ts`.

Not yet done (see BACKLOG.md):
- The engine in `SynthEngine.tsx` is the Figma Make PolySynth random-walk engine. It does not implement STRATEGY §3. Do not extend it; it is replaced wholesale by the Phase 0 engine (BACKLOG PH0-02, SON-01).
- Live data uses AirNow's zip-code endpoint, which returns no NO2 and the same reading for all boroughs (BUG-11, BUG-12). Historical uses PM2.5 parameter 88101 only, window `currentYear − 2` (BUG-15, BUG-16). PM10 is synthesized when missing (BUG-13). These are fixed by DAT-01 to DAT-05.
- Dead code is still present: `src/components/ui/` (48 files), `src/imports/`, `src/components/figma/`, `src/assets/*.png`, 33 unused dependencies. None of it is imported. Do not import from it. Deleting it is CLN-01 to CLN-05.
- No `content.ts`, no static archive under `public/data/`, no tests, no linter.

## Commands

```bash
npm install       # uses .npmrc for the JSR registry (can be removed after CLN-03)
npm run dev       # Vite dev server on port 55128, frontend only, mock data
vercel dev        # frontend + serverless functions with real APIs (needs .env with the three keys)
npm run build     # production build to build/
```

`vercel.json`: `{ "framework": "vite", "outputDirectory": "build" }`. Add `functions.maxDuration` for the historical route once INF-03 verifies the plan limit.

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
  App.tsx                Orchestrator. Listen loads last 24 h only; archive loads when the timeline opens.
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
  source: { pm25: 'own' | 'citywide'; o3: 'own' | 'citywide'; no2: 'own' | 'citywide' };
}
```

`null` means no borough reported that hour. A borough without its own monitor for a pollutant carries the citywide value in that field and `source.<pollutant> = 'citywide'` alongside it (STRATEGY §4.4, D-16). Nothing is ever estimated from a different pollutant. There is no PM10 field.

## Rules

Sonification
- Read STRATEGY §3 before touching `engine/`. Implement the roles as specified: O3 → melody, NO2 → pulse and bass, PM2.5 → tier/harmonicity/detune/reverb, composed bed inherits tier.
- Fixed 90 BPM. One hour = one beat, one day = 24 beats. Do not encode data in transport tempo (D-12). Perceived speed comes from Euclidean density, articulation, and harmonic rhythm (§3.9).
- Null hour (no borough reporting) = rest. A borough without its own monitor for a pollutant plays the citywide value for it, flagged as borrowed. Never derive one pollutant from another.
- Normalize contours against the loaded NYC distribution, not the AQI theoretical range (§3.10).
- Every mapping gets a comment: which measurement, which parameter, what the metaphor is.
- Imagine mode must recompute everything downstream of virtual AQI, not just the parameter being dragged.

Data
- Missing is null only when no borough reports. Citywide is the per-hour mean of reporting boroughs.
- Daily AQI comes from EPA where present, else from the 24-h mean. Hourly max is kept for the phrase and pin labels, never for the AQI number.
- Look up API behavior before proposing a fix. AirNow and EPA AQS both have quirks; do not cycle through guesses.

Code
- TypeScript strict. Functional components. No component libraries. Tokens from `theme.ts` only. All prose from `content.ts`.
- Delete, don't disable. Dead code goes.
- Architectural problems get architectural fixes. The timeline gap (BUG-03) is two sources in one array; fix the structure, not the scrubber.
- api/ has its own CommonJS tsconfig; the root tsconfig scopes to src/. Vercel's function builder uses the nearest tsconfig.
- vercel dev does not reproduce the production function build; after every push that touches api/, hit /api/health and /api/aqi/current on the deployed URL before calling it done.
- Archive data comes from public/data/; the EPA API is only ever asked about the current year.
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
