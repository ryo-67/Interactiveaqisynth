# New York AQI Synth

A single-page web app that plays New York's air as music. Pick a borough and a day — today's live readings, or any day back to 2020 — and the hour-by-hour pollutant record drives a synthesizer and a sky that moves with it.

Live at **[aqi-synth.vercel.app](https://aqi-synth.vercel.app)**.

Designed and directed by Shoro Roy.

## How the air becomes sound

Three measured pollutants, three separate jobs. Nothing is derived from a single "pollution" number, and no channel is ever estimated from another.

| Measurement | What it does |
|---|---|
| **Ozone (O₃)** | The melody. The day's hourly contour, normalized against the loaded NYC distribution and quantized to the current scale. |
| **Nitrogen dioxide (NO₂)** | The pulse and the bass. The hourly contour sets the density and rotation of a Euclidean rhythm. |
| **PM2.5** | The dissonance. It picks the scale tier, sets FM harmonicity and detune spread, and opens the reverb. |

Six scale tiers, one per EPA grade, ordered by how much tonal centre they give up: Major, Pentatonic, Dorian, Phrygian, Locrian, Chromatic. The clock is fixed at 90 BPM — one hour is one beat, one day is 24 beats — so speed comes from rhythmic density and articulation rather than tempo. An hour no borough reported is a rest.

The sky is a physically based Hosek–Wilkie model at the real solar position for that date and latitude, with a smoke plume composited from the same smoothed PM2.5 the engine is hearing.

## Data

- **Live** — AirNow's data endpoint over the NYC bounding box, hourly, per monitoring site, mapped to boroughs by county.
- **Archive** — EPA AirData hourly bulk files, 2020 to a committed current-year snapshot, built locally by `scripts/`. No API key needed to read it.
- **Current year past the snapshot** — the EPA AQS API, via a serverless route, one month per request.

A borough with no monitor for a pollutant carries the citywide value for it and says so on the page. New York publishes no live NO₂ at all, so live views use a typical NO₂ profile for the month and weekday built from the archive, disclosed the same way. The archive runs several weeks behind real time, which the app states in weeks computed from its own last available day.

## Running it

```bash
npm install
npm run dev     # Vite on :55128 — frontend only. Without API keys the live feed fails and the app says so; the archive still plays.
vercel dev      # frontend plus the serverless routes, with real APIs. Needs .env with AIRNOW_API_KEY, EPA_AQS_EMAIL, EPA_AQS_API_KEY.
npm run build   # production build to build/
npm test        # vitest
npx tsc --noEmit  # vite build does not typecheck; run this too
```

## Layout

```
api/            Vercel serverless routes: AirNow live, EPA AQS current-year, health, diagnostic
public/data/    The committed hourly archive, one file per borough per year, plus corpus anchors
scripts/        Local archive builders. Not part of the deploy.
src/engine/     The synthesizer: FM voices, Euclidean pulse, scale tiers, AQI breakpoints
src/scene/      The page and the sky
src/components/ Hand-styled UI. No component libraries; tokens only.
src/content.ts  All prose and labels
src/utils/      Design tokens, data fetching
docs/           STRATEGY (canonical), BACKLOG, BUGS, CHANGELOG
```

## Status

Built and working: live and archive playback, borough and day selection, the graph, the monitor readouts, the sky and its plume, and the liner notes.

Not built yet: the Imagine side of the piece — virtual AQI, the counterfactual selector (WHO guideline, Delhi winter, 2020 lockdown) and the pollutant sliders. The composed bed is still a placeholder. See [docs/BACKLOG.md](docs/BACKLOG.md) for the full list and [docs/BUGS.md](docs/BUGS.md) for known defects.

[docs/STRATEGY.md](docs/STRATEGY.md) is canonical for the concept, the sonification model and every decision behind it.
