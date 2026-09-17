# New York AQI Synth

A web instrument that plays New York's air as music.

Live at **[aqi-synth.vercel.app](https://aqi-synth.vercel.app)**.

Pick a borough and a day. Today's live readings, or any day back to 2020. The hour-by-hour pollutant record drives a synthesizer and a physically based sky that moves with it. Twenty-four hours is twenty-four beats, sixteen seconds at 90 BPM, and it loops.

---

## How the air becomes sound

Three measured pollutants, three separate jobs. Each one took the musical role its data could hold. Nothing is derived from a single "pollution" number, and no channel is ever estimated from another.

| Measurement | Its daily shape | What it drives |
|---|---|---|
| **Ozone (O₃)** | An arch. Trough near 5am, peak around 1pm. | The melody. The day's hourly contour, normalized against the city's own distribution and quantized to the current scale. One note per hour. |
| **Nitrogen dioxide (NO₂)** | A rush-hour spike, with weekday and weekend audible in the raw data. | The pulse and the bass. The hourly contour sets the density and rotation of a Euclidean rhythm. |
| **PM2.5** | None. Day-to-day contour correlation across a July is 0.03. It is pressure, not a phrase. | The dissonance. It picks the scale tier, sets FM harmonicity and modulation index, spreads a Brownian detune across the melody, and opens the reverb. |

An hour no monitor reported is a rest. It is never an interpolated note.

## The scale ladder

Six tiers, one per EPA category, ordered along a single axis: how much tonal centre the piece gives up.

| AQI | Category | Scale | Tone |
|---|---|---|---|
| 0–50 | Good | Major | Clean |
| 51–100 | Moderate | Major Pentatonic | Smooth |
| 101–150 | Unhealthy for Sensitive Groups | Dorian | Warm |
| 151–200 | Unhealthy | Phrygian | Edged |
| 201–300 | Very Unhealthy | Locrian | Metallic |
| 301+ | Hazardous | Chromatic | Harsh |

Locrian sits at Very Unhealthy because it is the darkest diatonic step before chromatic, its fifth diminished. Whole tone was auditioned there first and rejected for floating rather than threatening.

The tempo never moves. Speed at the top of the ladder comes from rhythmic density, shorter notes, and a faster harmonic rhythm in the bed, so the same day is recognizably the same day at every level of dissonance. The ozone arch quantized to Phrygian is the same shape, wrecked. That is the mechanism by which June 7, 2023 sounds like the same piece as a clear October afternoon.

A six-bar chord bed, written once in the clean-air scale and transposed by degree, is the thing the ear holds onto across days. The data plays it and ruins it. The data never rewrites it.

## The sky

A full-bleed scene on the same beat clock as the sound. Hosek-Wilkie in daylight, Preetham at night, crossfaded over sun elevation, at the real solar position for that date and latitude. Ozone drives rayleigh scattering and bloom, so a high-ozone afternoon reads bright and white and a low-ozone morning reads deep blue. PM2.5 drives the aerosol path.

Wildfire smoke is composited above the sky rather than modeled inside it, because a sky model renders clear air holding more aerosol, and June 7 was a plume between the observer and the sky. It is two terms, attenuation and in-scatter, with in-scatter weighted higher, so heavy smoke brightens the sky to orange-tan at midday and goes brown only at the horizon where the sight-line is longest.

The sun is the playhead. Twenty-four hours in sixteen seconds means it crosses the sky in the time of one phrase.

### Sky model credits

The daylight dome is the Hosek-Wilkie analytic sky model. The shader is ported from [diharaw/sky-models](https://github.com/diharaw/sky-models) (MIT), and the coefficients are the official RGB dataset (`ArHosekSkyModelData_RGB`, version 1.4a), converted from the reference release. Copyright 2012–2013 Lukas Hosek and Alexander Wilkie, Charles University in Prague. [Project page](https://cgg.mff.cuni.cz/projects/SkylightModelling/). The dataset's terms require the copyright notice and these citations to be retained, and both are kept in `src/scene/hosek/hosekData.ts`:

- Lukas Hosek and Alexander Wilkie. "An Analytic Model for Full Spectral Sky-Dome Radiance." ACM Transactions on Graphics (SIGGRAPH 2012).
- Lukas Hosek and Alexander Wilkie. "Adding a Solar Radiance Function to the Hosek Skylight Model." IEEE Computer Graphics and Applications, 2013.

The night dome is Preetham, through [drei](https://github.com/pmndrs/drei)'s `<Sky>`, which wraps [three.js's Sky object](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/objects/Sky.js).

- A. J. Preetham, Peter Shirley and Brian Smits. "A Practical Analytic Model for Daylight." SIGGRAPH 1999.

## The monitor

A second page of the same scene, reachable by drag, swipe, arrow keys or the page pill. A bento of frosted cards reads the engine live: which scale tier is lit, the harmonicity and index as one word per tier, the Euclidean pattern as a sixteen-step lane with hits lighting as the engine fires them, the filter ceiling, the detune spread, the reverb wet.

The ROUTING card is a patch bay. Three measurements as pills along the top, six sound parameters along the bottom, a curved cable for every mapping. On each beat, a glowing packet leaves the source pill and travels every cable from it, eased over the beat. The whole sonification model is on one card, moving.

## Data

- **Live.** AirNow's data endpoint over the NYC bounding box, hourly, per monitoring site, mapped to boroughs by county.
- **Archive.** EPA AirData hourly bulk files, 2020 to a committed snapshot, built locally by `scripts/`. No API key needed to read it.
- **Current year past the snapshot.** The EPA AQS API, through a serverless route, one month per request.

Provenance is a design constraint rather than a footnote. A borough with no monitor for a pollutant carries the citywide value and the page names it. The borrowed value is always a real measurement from other boroughs, never a formula, and missing is never zero. New York publishes no live NO₂ at all, so live views use a typical profile for the month and weekday built from the archive, disclosed the same way. The archive runs behind real time and the app states the gap in weeks computed from its own last available day.

Live readings come from [AirNow](https://www.airnow.gov) and are preliminary data that the originating agencies have not fully verified. The archive is built from [EPA AirData](https://www.epa.gov/outdoor-air-quality-data) bulk files and the [EPA AQS API](https://aqs.epa.gov/aqsweb/documents/data_api.html). AQI follows AirNow's Technical Assistance Document for the Reporting of Daily Air Quality, with one stated simplification for ozone's NowCast, documented in `src/engine/aqi.ts`.

## Built with

TypeScript, React, Vite. Tone.js for FM synthesis. Three.js for the sky. Vercel serverless routes for the live and current-year feeds. Hand-styled components against a token file, no component libraries. Vitest and a two-rule ESLint config covering rules-of-hooks and exhaustive-deps.

## Running it

```
npm install
npm run dev       # Vite on :55128, frontend only. Without API keys the live feed fails and says so; the archive still plays.
vercel dev        # frontend plus serverless routes against the real APIs. Needs .env with AIRNOW_API_KEY, EPA_AQS_EMAIL, EPA_AQS_API_KEY.
npm run build     # production build to build/
npm test          # vitest
npm run lint
npx tsc --noEmit  # vite build does not typecheck, so run this too
```

## Layout

```
api/            Vercel serverless routes: AirNow live, EPA AQS current-year, health, diagnostic
public/data/    Committed hourly archive, one file per borough per year, plus corpus anchors
scripts/        Local archive builders. Not part of the deploy.
src/engine/     The synthesizer: FM voices, Euclidean pulse, scale tiers, AQI breakpoints
src/scene/      The sky, the plume, the frost pass
src/components/ Hand-styled UI, tokens only
src/content.ts  All prose and labels
src/utils/      Design tokens, data fetching
docs/           STRATEGY (canonical), BACKLOG, BUGS, CHANGELOG
```

## Design reasoning

[docs/STRATEGY.md](docs/STRATEGY.md) is canonical and holds every decision behind the piece, including the decision log with what was reversed and why. [docs/BACKLOG.md](docs/BACKLOG.md) and [docs/BUGS.md](docs/BUGS.md) are the working record.

## What was cut

An Imagine mode was specced and dropped. It would have let you hear the same day at WHO guideline levels or at a Delhi winter average. Two problems killed it. The Delhi preset turns another city's ordinary air into this city's worst case, a comparison the piece has no standing to make. And WHO guideline levels sit close enough to a clear New York day that the contrast would barely be audible, so the control would have promised a difference it could not deliver.

Every control here is bounded by real measurements at both ends. No referent was found that was both real and hearable, so the mode went.

## Credits

Concept, sonification model, data architecture, interaction design and visual language by Shoro Roy. Figma Make generated the first prototype and Claude Code was the instrument for the rebuild. Neither is a co-designer.

Licensing: the software is MIT ([LICENSE](LICENSE)), the documents and the work itself are CC BY-NC 4.0 ([LICENSE-CONTENT.md](LICENSE-CONTENT.md)), and third-party material keeps its own terms ([NOTICE.md](NOTICE.md)).

Third-party work in the build:

- **Sky models.** Hosek-Wilkie and Preetham, credited in full under [Sky model credits](#sky-model-credits) above.
- **Icons.** [Lucide](https://lucide.dev) (ISC), itself a fork of Feather. The glyphs the page uses are drawn inline from Lucide's paths in `src/components/icons.tsx`, and the favicon is built from two of them.
- **Type.** Four stacks, defined in `src/utils/theme.ts`. [Inter](https://fonts.google.com/specimen/Inter) by Rasmus Andersson, SIL Open Font License, served from Google Fonts, is the only face the app ships, and it sets the chips and buttons. The rest resolve to faces already on the reader's machine and are not distributed here. The editorial serif, set in italic for the mood word and the AQI number, is Georgia (Matthew Carter, 1993) falling back to Times New Roman. The tabular data face for the readouts and hour marks is SF Mono, then Roboto Mono, then Menlo. The UI caps on the borough row and the source line take the system UI face.
- **Base stylesheet.** The reset layer at the top of `src/index.css` is compiled [Tailwind](https://tailwindcss.com) (MIT), kept from the prototype export. No Tailwind utility classes are used above it.
- **Rhythm.** The Euclidean pulse uses Bjorklund's algorithm. Godfried T. Toussaint, "The Euclidean Algorithm Generates Traditional Musical Rhythms," BRIDGES: Mathematical Connections in Art, Music and Science, 2005.
- **Data.** AirNow and the EPA, credited under [Data](#data) above.
- **Libraries.** [Tone.js](https://github.com/Tonejs/Tone.js), [three.js](https://github.com/mrdoob/three.js), [react-three-fiber and drei](https://github.com/pmndrs), [postprocessing](https://github.com/pmndrs/postprocessing), React, Vite, Vitest.
