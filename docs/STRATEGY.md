# NYC AQI Synth — Product Strategy & Requirements

## §0. About this document

Single source of truth for concept, sonification model, data architecture, and phasing. Canonical among the project docs (BACKLOG.md, BUGS.md, CLAUDE.md, CHANGELOG.md). When this document and source code disagree, source wins; update this document. Section anchors (§3.2 style) are stable; link to them from prompts and issues.

Version 2. Supersedes the March 12, 2026 version in full. The decision log in §8 records what changed and why.

Last updated: August 27, 2026.

---

## §1. Project identity

### §1.1 One-liner

A web page that plays New York's air as music. Today's air, live. The day the smoke came, on request. The air we could have, on a slider.

### §1.2 The argument

Polluted air is felt as dissonance in the body. This piece translates that dissonance from the lungs to the ears. Worse air is a more dissonant version of the same piece. The mapping is somatic, not moral: it renders a sensation the listener already knows.

### §1.3 Position in the portfolio

Three sound works, three subjects, three production methods, three interaction models.

| | Body Politic | Bushwick Nightcrawlers | NYC AQI Synth |
|---|---|---|---|
| Subject | How the city's media speaks | What the city's animals say | What the city breathes |
| Material | Orchestration and effects (Ableton, M4L) | Sampling (recorded USVs) | Synthesis (FM, Tone.js) |
| Runtime | Installation, unattended | Web, explorable | Web, live, running |
| Data | Static corpus, interpretive models | Static, curated | Live time series plus archive, physical measurements |
| Visitor | Performs a metaphor mixer | Explores a map | Picks a borough, scrubs time, moves one slider |

AQI Synth is the only one of the three that is happening now. Liveness is its identity. Everything the visitor can do is bounded by measurements: both ends of every control are real readings or sourced guideline values.

### §1.4 Ownership

Concept, sonification model, data architecture, interaction design, and visual language are Shoro Roy's. Figma Make was the code generation instrument for the prototype. Claude Code is the instrument for the refactor. Neither is a co-designer.

---

## §2. Experience modes

Three verbs, one instrument. No explicit mode switching. Today is home; history is depth; speculation is lateral.

### §2.1 Listen (default state)

Open the page, hear today. The last 24 hours of the selected borough's air, as one looping phrase (see §3.3). The AQI number, the mood word (Easy / Shallow / Tight / Ragged / Suffocating), and the canvas orbs reflect the current hour. Nothing is required of the visitor except pressing play.

Every borough plays all three channels; where a borough lacks a monitor it uses the citywide value and the source line says so (§4.4). NYC (citywide) is the default.

### §2.2 Remember (pinned timeline)

A timeline from January 2020 to the present. Scrubbing plays each day as its phrase. The live reading is the rightmost pin. The EPA reporting lag is drawn as a dashed gap between the last EPA day and today, labeled with its length in weeks, computed at load.

Days that matter are pinned and named. Pins are the only presets in this mode; every pin is a measured day.

| Pin | Date | Why |
|---|---|---|
| The smoke | June 7, 2023 | Canadian wildfire smoke. Queens hourly PM2.5 peaked at 270 µg/m³; 24-hour means of 116 to 174 across all five boroughs (AQI 193 to 249). O3 and NO2 were ordinary. |
| Ozone and smoke | June 30, 2023 | O3 83 ppb with PM2.5 101 µg/m³ on the same day. |
| Ozone day | July 12, 2023 | Classic summer arch, O3 86 ppb hourly peak, PM2.5 low. |
| Rush hour | February 9, 2023 | NO2 70 ppb morning peak; overnight O3 near zero (NO titration). |
| Cleanest | October 29, 2023 | PM2.5 3.3, O3 14 ppb, NO2 10 ppb. The piece at full range. |
| Lockdown | April 2020 (TBD) | Pull from EPA 2020 bulk files. Pin as a period if the data supports it. |

Pins from 2024 onward to be added as they are found in the data (see BACKLOG DAT-06).

### §2.3 Imagine (counterfactuals and bounded sliders)

Air that hasn't happened here. Three named counterfactuals, visually distinct from pins because they are not measurements of New York:

| Counterfactual | PM2.5 | O3 | NO2 | Source | Status |
|---|---|---|---|---|---|
| WHO guideline | 15 µg/m³ (24-h) | ~51 ppb (100 µg/m³ 8-h) | ~13 ppb (25 µg/m³ 24-h) | WHO Global Air Quality Guidelines, 2021 | Unit conversions at 25 °C, verify |
| Average Delhi winter day | TBD | TBD | TBD | CPCB annual report or WHO Ambient Air Quality Database | Must be a sourced measured mean, with copy that names it as Delhi's normal, not a caricature |
| 2020 lockdown | TBD | TBD | TBD | EPA bulk files, April 2020 NYC | If measured, this becomes a pin in §2.2 instead |

Under the counterfactuals, three sliders (PM2.5, O3, NO2). The real reading for the current hour stays drawn on each track as an anchor. Dragging changes a virtual profile; the virtual AQI, scale, FM parameters, effects, visualization, and displayed scores recompute (§3.7). The borough map keeps real values.

A visitor can never remove the data from the piece. They can only put another measured or sourced condition next to it.

---

## §3. Sonification system

### §3.1 Principle

One composed piece. The data plays it and wrecks it. Every parameter has a rationale linking a measurement to a sound, documented in code.

### §3.2 Pollutant roles (locked)

The three reliably monitored pollutants have three distinct daily shapes in the EPA hourly record for NYC (Queens 2023, June to August means, each day normalized to its own peak):

- O3 is an arch. Trough around 5 am (0.39 of peak), climb from 8 am, peak at 1 pm (0.91), decline through evening. Every summer day sings a version of it; winter days a flatter one.
- NO2 is a rush-hour spike. Weekday peak at 5 to 6 am (0.80), midday trough (0.34), evening shoulder. Weekends are flatter and later. Weekday and weekend are audible in the raw data.
- PM2.5 has no daily shape. Mean contour is flat; day-to-day contour correlation across July 2023 is 0.03. It is event-driven pressure, not a phrase.

Therefore:

| Pollutant | Role | What it drives |
|---|---|---|
| O3 | Melody | The day's hourly O3 contour, corpus-normalized, quantized to the current scale. One note per hour. |
| NO2 | Pulse and bass | Euclidean rhythm density k and rotation from the hourly NO2 contour. Bass pitch follows the composed bed's chord root; NO2 drives bass density (extra hit on beat 3 at k ≥ 8) and modulation depth, not pitch. |
| PM2.5 | Dissonance | AQI tier (scale ladder), FM harmonicity and modulation index, Brownian pitch detune on the melody, reverb wet/decay. PM2.5 picks no notes. |

PM10 is not a channel. It is monitored one day in six in two boroughs and is otherwise estimated. See §8, decision D-07.

### §3.3 The day as a phrase

24 hourly readings become 24 beats: six bars of 4/4. At 90 BPM one day is 16 seconds. Listen mode loops the last 24 hours. Remember mode plays each scrubbed day as its phrase. Hours with no reading are rests, never interpolated notes (§4.4).

Timelapse compression ratio is an open item (§9). 365 days at 16 s each is 97 minutes; timelapse needs its own clock.

### §3.4 Scale ladder (unchanged from v1)

| AQI | Mood | Scale | Character |
|---|---|---|---|
| 0–35 | Easy | Major Pentatonic | Consonant, open |
| 36–65 | Shallow | Whole Tone | Suspended, ambiguous |
| 66–100 | Tight | Dorian | Minor, bittersweet |
| 101–150 | Ragged | Phrygian | Flat second, tense |
| 151+ | Suffocating | Chromatic | No center |

The melody contour is preserved across scales: the same O3 arch quantized to Phrygian is the same shape, wrecked. That is the mechanism by which June 7 sounds like the same piece.

Mood words are provisional copy; prose pass pending (§9).

### §3.5 FM synthesis

All voices are Tone.FMSynth. Modulation index and harmonicity follow AQI tier: low AQI, low index and integer ratios (warm, simple); high AQI, high index and irrational ratios (metallic, beating). Timbral degradation happens at the oscillator, not in an external distortion stage.

Voices, with the identities locked in Phase 0 (prototype/phase0.html V4):
- Melody: FM lead, O3-driven (§3.2). Tier table harmonicity and index. Brownian detune (§3.6). Note length by tier: Easy 1n, Shallow 2n., Tight 2n, Ragged 4n, Suffocating 8n.
- Pulse: click/mallet. Fixed harmonicity 7 (11 auditioned as the alternative, not adopted), full tier index plus up to +50% from NO2, attack 1 ms, decay 80 ms, no sustain, pitch envelope from one octave above snapping to target over 30 ms. Pitch = chord root +1 octave. Euclidean E(k,16) per bar, k = round(3 + 8 × bar-mean normalized NO2) clamped 3..11, rotation = bar-start hour mod 16.
- Bass: sub. Harmonicity 1 at Easy rising linearly to 2 at Suffocating (never metallic), index at 0.5× the tier table plus NO2 boost, attack 40 ms, release 0.8 s, two octaves below the chord root, private 400 Hz lowpass before the shared chain. Beat 1 of every bar; beat 3 also when k ≥ 8.
- Bed: FM pad playing the composed six-bar chord bed (§3.8), tier table harmonicity and index, the fixed thing the ear holds onto.

Tier table (locked from Phase 0, applied to melody and bed; pulse and bass as above):

| Tier | harmonicity | modulationIndex |
|---|---|---|
| Easy | 1 | 1 |
| Shallow | 2 | 3 |
| Tight | 3 | 6 |
| Ragged | 2.76 | 12 |
| Suffocating | 1.414 | 24 |

Parameter changes ramp over one beat. Tier is computed per hour from the hourly PM2.5 AQI with exponential smoothing α = 0.3, state carried across the loop wrap.

Four voices, three data channels. The bed carries no data of its own; it inherits tier.

### §3.6 Effects and texture

| Pollutant | Effect | Metaphor |
|---|---|---|
| PM2.5 | Reverb wet and decay; Brownian microtonal detune on melody | Fog; particulate jitter on the line |
| O3 | Lowpass filter ceiling | Visibility |
| NO2 | FM modulation depth on pulse and bass | Combustion grit |

Locked values from Phase 0. Reverb: two static reverbs (1.5 s and 7.5 s decay) crossfaded by normalized PM2.5, wet = 0.15 + 0.6 × normalizedPM25 clamped 0.9; Tone.Reverb cannot ramp decay, so the crossfade is the implementation. Lowpass: 2500 Hz at normalized O3 = 0 rising to 12000 Hz at 1; on high-NO2 mornings overnight O3 near zero holds the piece under 2.6 kHz until noon, which is NO titration rendered as arrangement and is intended. Detune: per note, normal distribution σ = 40 × min(normalizedPM25, 1.5) cents. Normalization: p05 → 0, p95 → 1 per pollutant from the borough's own hourly distribution (Phase 0 used 2023 Queens: PM2.5 1.3/20.8, O3 1.0/54.0, NO2 3.3/35.8).

The effects chain is uniform across voices: lowpass → reverb → destination. Every voice passes through it (v1 routed melody around it; see BUGS).

### §3.7 Virtual AQI (Imagine)

Slider or counterfactual values → recompute AQI from concentrations using the breakpoint functions in api/_lib/aqi.ts → tier → scale, FM parameters, effects, visualization, displayed component scores. The O3 and NO2 contours used for melody and pulse are the current day's shapes scaled to the new levels, so a counterfactual keeps today's phrase at a different pressure. Borough map stays real. A visual indicator marks the speculative state.

### §3.8 Composed bed

A six-bar chord loop written once in the clean-air scale, cycling with the six-bar day so the cadence at the wrap is composed. Phase 0 placeholder: degrees [1, 5, 4, 1, 5, 1], triads stacked every-other-degree within the current scale. The data never rewrites it; it is transposed into the current scale by degree. Its purpose is identity: the listener needs something that is the same on October 29 and June 7. Harmonic rhythm is one chord per bar; from Ragged upward the bed changes on beats 1 and 3 (§3.9). Bass plays the bed's chord root on beat 1 of every bar regardless of NO2; the beat-1 bass belongs to the bed, not the NO2 channel. Faster harmonic rhythm read as churn in Body Politic and is not the default here.

### §3.9 BPM

Fixed 90 BPM as the phrase clock (§3.3). The transport never encodes data, so October 29 and June 7 stay the same 24 beats over 16 seconds and the A/B holds. This replaces the v1 60 to 140 curve.

Perceived speed comes from event rate and articulation, not from the clock:

1. Pulse density. Euclidean k rises with NO2 and, at the top tiers, with tier: E(3,16) at Easy reads as slow, E(11,16) at Suffocating reads as a hammering sixteenth-note pulse at the same BPM.
2. Melody articulation. Note length shortens with tier: sustained through the beat at Easy, staccato at Suffocating. Same notes, less air between them.
3. Bed harmonic rhythm. One chord per bar at Easy; from Ragged upward the bed may change on beats 1 and 3. Harmonic acceleration without a tempo change.

Fallback, only if Phase 0 listening says Suffocating still feels too composed: stepped tempo per tier (on the order of 84 / 88 / 92 / 98 / 108 BPM), applied at tier boundaries only, never continuously, with the day still quantized to 24 beats. Stepped changes are the only form that keeps timeline scrubbing from wobbling. See O-09.

### §3.10 Normalization

All contours are normalized against NYC's own distribution (per pollutant, per borough, over the loaded archive), not the AQI theoretical range. Normalizing against 0 to 500 clusters every ordinary day into one band; corpus normalization spreads them and lets June 7 sit off the top.

---

## §4. Data

### §4.1 What the audit found (August 26, 2026)

Live (AirNow zip-code endpoint, current pipeline): O3 and PM2.5 only; NO2 always zero; PM10 estimated; all five zip codes resolve to the same reporting area, so PM2.5 is identical across boroughs. Borough granularity in Listen mode is cosmetic under this endpoint.

Historical (EPA AQS, parameter 88101 only, January 2024 to July 21, 2026, 933 days):

| Borough | PM2.5 | O3 | NO2 | PM10 |
|---|---|---|---|---|
| Bronx | 100% | 87% | 97% | ~15% |
| Queens | 100% | 88% | 98% | ~15% |
| Manhattan | 74% | 98% | 0% | 0% |
| Staten Island | 75% | 76% | 0% | 0% |
| Brooklyn | 100% | 0% | 0% | 0% |

Adding parameter 88502 (continuous PM2.5 monitors) raises Manhattan and Staten Island PM2.5 to full coverage and gives Brooklyn the wildfire days it otherwise lacks. Only Bronx and Queens carry all three channels.

EPA reporting lag on audit day: about five weeks.

### §4.2 Live pipeline (required change)

Switch from AirNow observation/zipCode/current to the AirNow data endpoint (bounding box, explicit parameters O3, PM2.5, NO2, hourly, last 24 hours, per monitoring site, filtered to state 36 and the five NYC counties; the box also captures New Jersey sites). This gives real per-site readings and the hourly contour Listen mode needs. New York does not publish NO2 to AirNow's real-time feed (verified over a 7-day window: every NO2 row was New Jersey), so live NO2 is filled from a typical profile (D-18). Vercel serverless route api/aqi/current.ts, CDN cache s-maxage 1800. Whole-response fallback to the zip-code endpoint only if the data endpoint returns zero New York rows; the response then carries fallback: 'zipcode' and every channel is flagged citywide.

### §4.3 Historical pipeline (required change)

Two layers.

1. Static archive. Hourly data for all five boroughs, parameters 88101 + 88502 (PM2.5), 44201 (O3), 42602 (NO2), from EPA AirData bulk files (no API key), 2020 to the last complete year. Built by a local script, committed as static JSON under public/data/. Order of magnitude: five boroughs × three pollutants × ~2,000 days × 24 hours, single-digit megabytes gzipped.
2. Live-year fill. The current year via the EPA AQS API (api/aqi/historical.ts), hourly (sampleData endpoint), 88101 + 88502 + 44201 + 42602, CDN cache s-maxage 86400. Window starts January 1 of the current year; the static archive covers earlier years.

Per-hour aggregation across sites within a borough: maximum. Daily AQI: EPA-provided daily AQI where present, else computed from the 24-hour mean (not the hourly max).

### §4.4 Missing data policy

A borough that does not monitor a pollutant uses the citywide value for that pollutant, and the page says so (§5.2 source line: "Brooklyn monitors PM2.5; O3 and NO2 are citywide"). This is substitution with provenance, not estimation: the value is a measurement from the other boroughs, never a formula. Nothing is ever derived from a different pollutant (the v1 PM10-from-PM2.5 estimator stays dead). Missing is never zero.

Citywide, one rule for live and historical: per-hour mean of the reporting boroughs' concentrations; AQI computed from that mean. If no borough reports a pollutant for an hour, that hour is null for everyone and the affected voice rests.

Known weakness, for copy: O3 is regional and citywide is a close proxy. NO2 is traffic-local, so a borrowed NO2 pulse is the city's rush hour, not the borough's.

Borrowing across time (D-18). When a pollutant is not published live for New York at all, the live route fills it from the borough's own archive: the mean hourly contour for the current month and day type (weekday/weekend) over 2020 to 2025, stored in public/data/typical-no2.json, flagged source = 'typical'. Precedence: own reading beats citywide beats typical. The historical route never fills from typical. Source line copy: "NO2 is a typical profile from the archive; New York does not publish live NO2." This is the one place the live piece plays something not happening right now, which is why it is stated in plain words on the page. If it ever reads as dishonest, the fallback is a rest, and it is one flag.

### §4.5 Counterfactual data

Sourced values only (§2.3). Stored in content.ts with the source cited in a comment.

---

## §5. Visual language

### §5.1 Principle

The score is the picture. The visual is the thing being played, drawn as a 24-hour graphic score, and everything else on the page is typography. No dashboard chrome: no chips, pills, bordered buttons, slider tracks, icons, panels, or decorative backgrounds. The register is editorial and notational (graphic scores, printed data reports), not product UI.

Benchmark, August 26, 2026: the shipped build has the right typographic voice (large serif AQI number, italic mood word, serif/caps pairing) and reads as a settings page anyway, because of pill selectors, uniform slider rows, icon buttons, a sparkline timeline, and bokeh orbs that carry no data. v2 keeps the type and removes the chrome.

### §5.2 Page order (laptop)

1. Borough toggle. One horizontal row of words at the very top: NYC, Manhattan, Brooklyn, Queens, Bronx, Staten Island. The selected borough is set in italic serif; the rest in the UI face. Date, hour, and live/archive status right-aligned on the same row.
2. The number. AQI, display size, serif. Never animates.
3. Mood word and mood sentence. Italic serif. The word is from the five-tier scale (§3.4); the sentence is written per tier by Shoro in content.ts, with one data-driven clause (which pollutant carries the line this hour). Changes only at tier boundaries, with the blur transition.
4. The score. Full width. 24 columns, one per hour. O3 contour as a line in the tier color. NO2 as pulse marks at the foot of each column, height by density. PM2.5 as haze density over the field (live grain, not flat fill). A vertical playhead advances one column per beat. Hour marks at 0, 6, 12, 18, and "now" for live. Clicking the score toggles play.
5. The timeline. A ruled line from January 2020 to today. Pins are ticks with names in italic serif. The EPA lag is a dashed segment labeled with the computed lag ("5 weeks unreported"). The live reading is the rightmost tick. Scrubbing plays each day as its phrase.
6. Footer, three lines.
   - Imagine, as a sentence: "Hear this same afternoon at WHO guideline levels, on a Delhi winter morning, or in April 2020, under the COVID-19 lockdown." Each condition is a link. Opening one reveals the three pollutant numbers, which are the sliders: drag the number itself. The real reading stays printed beside it as the anchor.
   - Actions, as words: "Record 16 s · Share this hour."
   - Sources and coverage, muted: "Live from AirNow · Archive from EPA · Queens monitors PM2.5, O3, NO2." For a borough using substitutions: "Brooklyn monitors PM2.5; O3 and NO2 are citywide." The coverage clause is how borrowed channels are disclosed: as fact, in the attribution line, with no further framing. See O-07.

Phone: same order, stacked. Borough row scrolls horizontally. Score keeps 24 columns at reduced height.

### §5.3 Color

Monochrome ground with one hue from the AQI tier (existing five-tier AQI color system). The hue appears on the O3 line, the playhead, pin ticks, and the mood word, and nowhere else. Dark mode is the default and is ink-on-dark; light mode is the paper inversion. No bokeh, no gradients, no glow. The haze field is grain in the ground color at varying density.

### §5.4 Motion

Everything moves on the 90 BPM grid or not at all. The playhead advances per beat. Pulse marks can flash on their hit. The haze field drifts slowly and continuously (it is particulate, not rhythmic). Mood word swaps on tier change (0.5 s, blur). Borough or day change crossfades the score (0.3 s). The number never animates.

### §5.5 Design tokens

src/utils/theme.ts stays the single source of truth: five-tier AQI color, surface layers, text hierarchy, three type families (editorial serif italic, data tabular, UI caps), a named type scale (display, heading, body, caption, micro), spacing tokens, the four motion profiles above, and the opacity scale. No component libraries.

### §5.6 Components (hand-styled)

BoroughToggle, AQINumber, MoodLine, Score (canvas), Timeline (canvas, pins, gap), ImagineSentence with inline scrubbable numbers, FooterActions, SourceLine, EntryMoment. Nine.

### §5.7 Alternatives considered

The Field (full-screen PM2.5 grain, melody drawn faintly through it): more installation, closer to Body Politic's TouchDesigner side; held as a Phase 2 dark-mode variant if wanted. The Ledger (typography only, no drawing): rejected because the sound would have no visual counterpart during playback.

## §6. Infrastructure

### §6.1 Current state (repo, August 2026)

- GitHub: ryo-67/Interactiveaqisynth, main. Vercel project interactive-aqi-synth, auto-deploy on push. Live at interactive-aqi-synth.vercel.app.
- Supabase fully removed. Four Vercel serverless routes under api/ with shared api/_lib/aqi.ts. CDN caching via Cache-Control.
- Environment variables: AIRNOW_API_KEY, EPA_AQS_EMAIL, EPA_AQS_API_KEY.
- Dead code still present: 48 shadcn/Radix wrappers, the 2,277-line Figma Make export, 33 unused dependencies including hono. No tests, no linter.

### §6.2 Target state

Same hosting. Static archive under public/data/. Two serverless routes (current, historical) plus health. Vite dev on port 55128; use vercel dev for functions. vercel.json sets framework vite and outputDirectory build; add maxDuration for the historical route once verified.

---

## §7. Phasing

### Phase 0: Prove the mapping — DONE 2026-08-27

- [x] Headless Tone.js prototype at prototype/phase0.html (V4). Six days: four Queens, two Brooklyn with citywide substitution.
- [x] Placeholder bed, six bars, degrees [1, 5, 4, 1, 5, 1].
- [x] Listening verdict: Shoro, by ear, "sound is good." The three-listener test was not run (see D-17).

Phase 1 is unblocked. Findings carried into §3.5, §3.6, §3.8, §4.4.

### Phase 1: The piece

Sonification
- [ ] Port the Phase 0 engine (V4) into src/engine/, replacing the PolySynth random-walk engine. Carry the two Tone.js findings: start the transport with an offset rather than pre-setting position, and drop a second loop-boundary event closer than half the interval.
- [ ] Write the real bed (the Phase 0 bed is a placeholder).
- [ ] Virtual AQI wiring (§3.7).
- [ ] Uniform effects chain.

Data
- [ ] AirNow data-endpoint route, hourly, per site, with NO2.
- [ ] Bulk-file archive script and static JSON, 2020 onward, hourly, 88101 + 88502 + 44201 + 42602.
- [ ] Live-year EPA route on the hourly endpoint.
- [ ] Missing-data policy and citywide rule implemented (§4.4).
- [ ] Source the Delhi and lockdown values.

Experience
- [ ] Entry moment. Listen loads with the last 24 hours only; historical loads when the timeline is opened.
- [ ] Timeline with pins and lag gap.
- [ ] Counterfactual selector and bounded sliders with anchors.
- [ ] Borough selector that reflects monitoring coverage.
- [ ] Responsive layout, laptop and phone.

Code
- [ ] Strip dead code and dependencies.
- [ ] content.ts, expanded theme.ts, hand-styled components.
- [ ] Replace Make README.

### Phase 2

- [ ] Timelapse with its own clock and accumulation model.
- [ ] Differentiated dark/light modes.
- [ ] Additional pins from 2024 to 2026.
- [ ] Scrollytelling wrapper, if still wanted after Phase 1 ships.

---

## §8. Decision log

| ID | Date | Decision | Alternatives rejected | Why |
|---|---|---|---|---|
| D-01 | 2026-03-12 | Three verbs, one instrument; today as home | Explicit mode tabs | Continuity over navigation |
| D-02 | 2026-03-12 | Scale ladder Pentatonic to Chromatic; mood scale Easy to Suffocating | "Dreamy" and other pleasant labels | Semantic honesty about the subject |
| D-03 | 2026-08-26 | Dissonance kept as the core mapping | Constriction (register narrowing, phrase shortening) | The mapping translates a bodily sensation, not a cultural verdict; Body Politic's refusal of major/minor does not apply |
| D-04 | 2026-08-26 | O3 is melody, NO2 is pulse, PM2.5 is dissonance | Dominant pollutant drives melody; four semantic voices | Hourly EPA data shows O3 and NO2 have daily shapes and PM2.5 does not |
| D-05 | 2026-08-26 | Day as 24-beat phrase, one note per hour | Random-walk melody; composed motif with data transformations | The data itself is the melody; no hook has to be invented |
| D-06 | 2026-08-26 | Euclidean rhythm for pulse | Arp driven by coefficient of variation | Deterministic, reads as musical, gives the professor's "beats" without a drum machine |
| D-07 | 2026-08-26 | PM10 dropped as a channel | Keep with estimation | Monitored 1 day in 6 in two boroughs; estimated elsewhere; a synthesized channel is dishonest |
| D-08 | 2026-08-26 | Missing data is null, never estimated | Estimate PM10 from PM2.5; average zeros into citywide | Name the thing honestly; monitoring gaps are content. Amended by D-16 |
| D-09 | 2026-08-26 | Presets split into measured pins and sourced counterfactuals | One preset table with approximate values | v1 preset numbers were off by 2 to 7× against real data |
| D-10 | 2026-08-26 | Liveness kept as identity; AirNow data endpoint adopted | Curated-only (no live) | Live is the one axis the other two portfolio pieces can't claim; the endpoint change makes it honest |
| D-11 | 2026-08-26 | Synthesis as the production method | Recorded breath; samples | Body Politic owns effects/orchestration, Bushwick owns sampling |
| D-12 | 2026-08-26 | Fixed 90 BPM phrase clock | 60 to 140 AQI-driven tempo | Tempo encoding conflicts with the day-as-phrase clock; NO2 density carries urgency instead |
| D-13 | 2026-08-26 | Phase 0 listening test gates Phase 1 | Start refactor immediately | The concept has stalled once already; prove the mapping first. Gate closed by D-17 |
| D-15 | 2026-08-26 | Bass pitch follows the bed; NO2 drives bass density and grit only | NO2-driven bass root motion | The bed is the fixed identity; a bass that wanders against it breaks the same-piece test. Caught by Claude Code in the Phase 0 plan |
| D-16 | 2026-08-26 | Unmonitored pollutants substitute the citywide value, disclosed in the source line | Null channel (voice absent); one-lung rendering | Phase 0 listening: Brooklyn with two voices missing was more alarming than the wildfire day itself, so absence was carrying meaning the data hadn't earned. Citywide is a measurement with provenance; the substitution is stated on the page |
| D-17 | 2026-08-27 | Phase 0 closed on the author's verdict; three-listener test skipped | Run the test before Phase 1 | Shoro judged the sound good after V4. The stranger-recognition question stays open and should be asked informally during Phase 1 with the real bed |
| D-18 | 2026-08-27 | Live NO2 uses a typical archive profile per borough, month, and day type, flagged 'typical' and disclosed | Pulse rests in Listen (§4.4 null rule); most-recent EPA NO2 (5 weeks stale) | AirNow carries no New York NO2 (BUG-25). Listen is the landing state; a landing state without its pulse is the no-hook version as the default. Same logic as D-16 applied across time instead of across boroughs: same pollutant, measured, provenance stated |
| D-14 | 2026-08-26 | The 24-hour graphic score is the primary visual; all controls are typographic | Orbs as centerpiece; dashboard controls; typography-only page | The visual must be the thing being played; chrome reads as SaaS; type alone leaves playback inert |

---

## §9. Open items

| ID | Item | Owner | Blocking |
|---|---|---|---|
| O-01 | Timelapse compression ratio and clock | Shoro | Phase 2 |
| O-02 | Mood word copy pass | Shoro | Phase 1 content |
| O-03 | Delhi winter mean, sourced | Shoro | Imagine presets |
| O-04 | Lockdown: measured pin or counterfactual | Data script | Timeline pins |
| O-05 | Whether any NO2 monitor exists in Manhattan, Brooklyn, or Staten Island under a parameter code other than 42602 | Data script | Source-line copy per borough |
| O-06 | Vercel maxDuration for historical route | Claude Code | Infra |
| O-07 | Closed by D-16. Borrowed channels are disclosed in the source line; nothing more | — | — |
| O-08 | Professor's cultural-scale question: scale system vs instrumentation | Shoro, professor | Delhi counterfactual copy |
| O-09 | Closed. Fixed clock with density/articulation held up in Phase 0; stepped fallback not needed | — | — |
| O-11 | Stranger-recognition: does someone who hasn't heard Oct 29 recognize Jun 7 as the same piece? Ask informally once the real bed exists | Shoro | Phase 1 copy claims |
| O-10 | Hourly vs 24-hour mean as the displayed number when they disagree | Shoro | Pin labels |
| O-12 | Historical route edge days: EPA bounds requests in standard time, so converting to wall clock leaves the first and last day of any range one hour short. Pad the request window by an hour each side or trim edge days | Sprint 3 cleanup | Pin playback of range-edge days |
| O-13 | git push without explicit remote reported "up-to-date" while pushing nothing; explicit `git push origin main` worked. Check upstream tracking config | Shoro | Nothing |

---

## §10. How to talk about this

### V1

I designed a sonification of New York's air where the day itself is the melody. Ozone traces an arch every day, nitrogen dioxide spikes at rush hour, and fine particulate matter has no daily shape at all, so each pollutant took the musical role its data could hold. Ozone plays the line, NO2 sets the pulse, and PM2.5 sets how dissonant the piece is, from a major pentatonic on the cleanest day to chromatic on the day the wildfire smoke came. The piece runs live on today's air, lets you scrub a pinned timeline of the days that mattered, and lets you hear the same day at WHO guideline levels or on an average Delhi winter morning. Where a borough has no monitor, it borrows the city's reading and the page says so. I audited the data before designing the mapping and dropped the channel the sensors couldn't support.

### V2

New York's air already has a tune. Ozone arches over every afternoon; nitrogen dioxide hits at 6 am when the trucks do; particulate matter has no shape, only weight. So I let the day play itself: O3 is the melody, NO2 is the pulse, and PM2.5 decides how wrecked the piece is. June 7, 2023 is the same piece in Phrygian with the partials coming apart. You can hear today, live. You can hear the smoke. You can hear what a WHO-compliant morning would sound like here, or what Delhi's normal Tuesday would. Brooklyn only measures particulate matter, so its ozone and NO2 are the city's, and the page says so.

---

## §11. Tradeoffs still open

| Option | Upside | Downside | When to choose it |
|---|---|---|---|
| Live via AirNow data endpoint (D-10) | Real boroughs, real NO2, hourly contour | New route, bounding-box logic, site-to-borough mapping to maintain | Default; chosen |
| Curated only, no live | Zero runtime dependencies, no keys, no lag | Loses the one axis that distinguishes this from the other two projects | If the AirNow data endpoint proves unreliable in Phase 1 |
| Static archive from bulk files (§4.3) | No key, no cold start, full hourly history | Refresh is manual; archive lags a calendar year | Default; chosen |
| Hourly max vs 24-h mean as the displayed value (O-10) | Max is dramatic and matches the felt peak | Max disagrees with the official daily AQI | Decide per surface: max for the phrase, official for the number |

---

## §12. Dropped from v1

Recorded explicitly so nobody re-proposes them without reading the decision log.

- Four semantic voice roles (pad = tier, melody = pollutant profile, arp = volatility, bass = PM residue). Replaced by §3.2.
- Coefficient-of-variation volatility measure.
- Dominant-pollutant register and voicing shifts.
- Data-responsive chord roots. The bed is composed (§3.8); bass root motion follows NO2.
- AQI-driven BPM curve.
- PM10 as a channel and PM10-to-delay mapping.
- Estimating PM10 from PM2.5; averaging zeros into citywide.
- Static daily JSON per borough as the only historical source. Replaced by hourly bulk archive plus live-year API.
- Preset table with approximate values.
- Free pollutant sliders without anchors.
- Loading gate on all five boroughs' historical data before first paint.
