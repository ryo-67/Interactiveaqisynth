# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Interactive AQI Synth — a single-page React app that sonifies (converts to sound) air quality data for NYC boroughs. It fetches real-time and historical AQI data, visualizes it with animated canvas orbs and a timeline, and maps pollutant levels to audio synthesis parameters using Tone.js. Originally exported from Figma Make.

## Commands

```bash
npm install       # Install dependencies (uses .npmrc for JSR registry)
npm run dev       # Start Vite dev server on port 55128 (auto-opens browser)
npm run build     # Production build to build/ directory
```

No test runner or linter is configured.

## Architecture

### Tech Stack
- **React 18 + TypeScript** with Vite (SWC plugin)
- **Tone.js** for audio synthesis
- **Tailwind CSS** + Radix UI/Shadcn components
- **Vercel serverless functions** (`api/` directory) for API proxying
- **Canvas API** for visualizations (orbs, timeline)

### Path Alias
`@` → `./src` (configured in vite.config.ts)

### Key Data Flow
`App.tsx` is the sole orchestrator — it manages all global state (timeline position, playback, selected borough, theme) and passes data down to child components. No routing library; entirely state-driven UI.

**Data loading sequence in App.tsx:**
1. Warmup API health check (`/api/health`)
2. Fetch current AQI from AirNow API
3. Preload historical AQI for all boroughs from EPA AQS API (with progress tracking)
4. Falls back to mock data (`utils/mockData.ts`) if APIs are unavailable

### Core Components (src/components/)
- **SynthEngine.tsx** — Tone.js synthesis; maps AQI to musical scales (major pentatonic → chromatic as AQI worsens) and pollutant levels to audio effects (reverb, filter, distortion, delay)
- **AQIVisualizer.tsx** — Canvas-based animated orbs that respond to AQI values
- **TimelineScrubber.tsx** — Canvas-rendered interactive timeline with playhead, hover preview, and keyboard controls (Space, Arrow keys)
- **NYCBoroughMap.tsx** — SVG-based interactive borough selector
- **RecordButton.tsx** — MediaRecorder capture to WAV/WebM
- **AQIInfo.tsx** — Pollutant breakdown display (PM2.5, PM10, O3, NO2)

### Backend (api/)
Vercel serverless functions (same-origin, deployed with the frontend). Caching is done at Vercel's CDN via `Cache-Control: s-maxage` headers — there is no storage layer:
- `GET /api/aqi/current` — proxies AirNow API (CDN-cached 30 min)
- `GET /api/aqi/historical?borough=X` — proxies EPA AQS API (CDN-cached 1 day per borough URL)
- `GET /api/health` — warmup/health check; `GET /api/aqi/diagnostic` — env + EPA connectivity test
- `api/_lib/aqi.ts` — shared API integration logic (underscore prefix = not exposed as an endpoint)

Requires env vars on Vercel for live data: `AIRNOW_API_KEY`, `EPA_AQS_EMAIL`, `EPA_AQS_API_KEY`. Without them the endpoints return 500 and the frontend falls back to mock data. `npm run dev` serves only the frontend (mock data); use `vercel dev` to run the functions locally.

### Data & Utilities (src/utils/)
- **mockData.ts** — Mock AQI data generator + AQI-to-music mapping constants (scales, note selection, texture mappings)
- **nycOpenData.ts** — Borough definitions (names, coordinates, EPA site IDs) and API fetch functions
- **theme.ts** — ThemeContext provider with dark/light color palettes

### UI Library (src/components/ui/)
60+ Shadcn/Radix wrapper components. These are standard Shadcn components — modify only when needed for project-specific behavior.

### Figma Exports (src/imports/)
`InteractiveAqiSynth.tsx` is a large Figma Make export. The active app uses `App.tsx` and the components above, not this file directly.

## Vite Config Notes
- Versioned package aliases (e.g., `recharts@2.15.2` → `recharts`) handle Figma Make's versioned imports
- `figma:asset/*` aliases map to `src/assets/` PNGs
- Build target: `esnext`, output dir: `build/`
