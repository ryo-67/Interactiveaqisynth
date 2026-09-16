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

### §3.4 Scale ladder (boundaries on EPA's category lines since D-38, 2026-09-15)

| AQI | EPA category | Mood | Scale | Character |
|---|---|---|---|---|
| 0–50 | Good | Easy | Major Pentatonic | Consonant, open |
| 51–100 | Moderate | Shallow | Whole Tone | Suspended, ambiguous |
| 101–150 | Unhealthy for Sensitive Groups | Tight | Dorian | Minor, bittersweet |
| 151–200 | Unhealthy | Ragged | Phrygian | Flat second, tense |
| 201+ | Very Unhealthy, Hazardous | Suffocating | Chromatic | No center |

The tier is PM2.5 alone, through EPA's PM2.5 table (the May 2024 revision: Good ends at 9.0 µg/m³). The number and the mood word the page shows are EPA's reported AQI, the highest pollutant sub-index (D-42), so on an ozone afternoon the word can read a category above the tier the ear is in: the sound is the particles, the word is the air. The word follows the graph's AQI line at the hour being heard.

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

Per-hour aggregation across sites within a borough: maximum. AQI (D-42, engine/aqi.ts, after the AirNow Technical Assistance Document): the highest of the pollutant sub-indices. A chosen day shows the official daily AQI (PM2.5 from the 24-hour mean, ozone from the highest 8-hour mean of the windows starting 7 am to 11 pm, NO2 from the highest hour). Live shows the current AQI, the NowCast composite at the latest hour (PM2.5 a weighted 12-hour mean, ozone the trailing 8-hour mean in place of EPA's regression NowCast, NO2 the hour). The graph's AQI line is that current AQI hour by hour. The routes ship hours only; the client computes every AQI by one rule.

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

The scene is the day being played. A full-bleed sky that changes with the hour under the playhead and with the air, in the register of Apple Weather: photographic gradients, a literal sun, atmospheric particles, and glass panels for the readouts. Everything on screen is data. Nothing is decoration, because the reference app's rule is the same: everything on that screen is weather.

Why this and not the typographic score (D-14, reversed by D-19): the portfolio has an installation (Body Politic) and a hand-drawn character piece (Bushwick) and needs one polished, immersive, product-grade web piece. That is the slot a design-engineer hiring manager checks first. The score survives as a component inside a glass panel; it stops being the whole page.

### §5.2 The scene (data to scene mapping)

Two layers on the same beat clock as the sound, each a pure function of what the engine already reports every beat: the hour under the playhead and the normalized channels.

1. Sky and sun, from the clock, O3 and PM2.5. A physically based sky: Hosek-Wilkie in daylight, Preetham at night, cross-faded over sun elevation +6° to 0° (D-20). The sun's position is the real solar position for the day's date at the hour under the playhead (solar.ts), so it is in the same place on both sides of the loop seam. Tone-mapping exposure is clock-only: the settled noon value in daylight, the settled night value with the sun down, lerped across the same band. O3 drives rayleigh and bloom (photochemical intensity: a high-ozone afternoon reads bright and white, a low-ozone morning deep blue) and the brightness of the sun disc. PM2.5 drives the ordinary-haze aerosol path (turbidity 2 to 6, mie 0.005 to 0.02): the sky as clear air holding more aerosol. Stars fade in below the horizon and are hidden by haze.
2. The plume, from PM2.5. Wildfire smoke is not a sky-model parameter: a sky model renders clear air with more aerosol in it, whereas June 7 was a plume between the observer and the sky. The plume is a composited layer above the sky in two terms — attenuation (multiply: the sky behind dims and loses its blue) and in-scatter (screen: the sunlight the plume throws back), the second weighted above the first so the sky brightens rather than dims as smoke rises, reading as bright orange-tan at midday and brown only at the horizon where the sight-line is longest. Density is the engine's own smoothed normalized PM2.5 (the scene never re-derives the smoothing).

NO2 has no visual in the scene yet. The city band of the Canvas-2D prototype was dropped with the physically based rebuild (D-19 task 3); what replaces it — a skyline silhouette, an abstract ground band, or a pulse rendered elsewhere — is open (O-15).

The playhead is the sun's motion. Twenty-four hours in 16 seconds means the sun crosses the sky in the time of one phrase; on loop it does it again, easing per beat rather than stepping. Framing rule: the camera pitches up by half its vertical field of view plus a margin, so the horizon sits at or below the bottom edge at every viewport size and the dome's ground half is never in frame. Which way the camera faces is under benchmark: it has faced north, which in New York puts the daytime sun behind the viewer, so the literal sun (§5.1) is only in frame facing south or tracking the sun's azimuth. Borough switch crossfades the whole scene over one beat with the phrase continuing.

### §5.3 The glass layer

Two materials, following Apple's HIG Materials guidance (June 2025): a glass material for the functional layer (controls and navigation that float above content) and a standard frosted material for content within the scene. The HIG rule is adopted as written: glass is never used in the content layer, and glass is never stacked on glass. On the web both are approximations: `backdrop-filter` blur and saturation, a layered translucent fill, and an inset specular edge for glass; a heavier blur and higher fill alpha for frosted. True refraction (SVG displacement) is Phase 2. Copy describes this as "translucent materials following Apple's HIG"; "Liquid Glass" is Apple's name for its own material and is not used.

Controls (glass): the borough control and the timeline ribbon. Content (frosted): the hero readout, the score panel, the Imagine panel, the source line. Text on either material must meet contrast against the brightest and darkest sky stops; fill alpha is tuned to guarantee that, per material.

Panels:

1. Hero: two cards in the monitor's style (2026-09-16), set like its values. The AQI card holds the number under the label "AQI · now" on Live or "AQI · Oct 29" on an archive day, the number being the current AQI or the day's official AQI (D-42). The Breath card holds the mood word coloured by its AQI on the EPA ramp over the tier's sentence, the word following the graph's AQI line at the hour being heard. Each card is a fixed width, measured from the widest thing it could show (three of the widest digit and the widest label; the longest sentence and the widest word), so nothing moves between days or tiers; on laptop the pair sits centred at its own width rather than the section's, below laptop it spans the section and is exactly as tall as the monitor's first row. The sentence is one line from the tablet width up and two lines on phones. No clause placeholders and no beat pulse (2026-09-15).
2. Borough control: a segmented glass toggle, NYC first. The selected segment has a moving highlight that settles on the beat.
3. Graph panel: the day as four tracks on one hour-aligned x-scale, one at a time behind a tab band — AQI (the current AQI hour by hour, D-42, coloured by the EPA categories with the legend as an upright scale, D-23), PM2.5 µg/m³, O3 ppb, NO2 ppb — a line through the hourly points with gaps where the hour is null and a soft fill beneath it. One playhead on the same eased hour that moves the sun, with the hour's value in a chip at its head. A change of day or tab morphs the line over 1.5 beats (D-37). No pulse row (D-39): the pulse is heard, and shown on the monitor page. PM2.5 is not drawn as a sky strip: particulate matter is the sky itself. The plot is a transport surface: press or drag to seek.
4. Day navigation (the timeline, as page-level controls for now): pagination one day at a time, the §2.2 pins as glass chips, and a hand-built month calendar from January 2020 to yesterday; "Live" returns to the last 24 hours. A chosen day restarts the phrase from hour 0 and shows its daily AQI. The scrubbable ribbon with the drawn lag gap remains the target form (UX-03); the computed-weeks label is still to be written.
5. Imagine panel (sprint 3c): the counterfactual sentence and the three scrubbable pollutant numbers with real-value anchors.
6. Source line: muted, at the foot, built from the `source` flags exactly as in v2.
7. Monitor page (D-43): a second page of the scene. Both pages are one section of the same width (1040 on laptop, the band's width below), centred in the band; on the scene page the hero sits centred above the graph, which takes the section's full width, and below laptop the hero is exactly as tall as the monitor's first row. On laptop the monitor sits below the scene and the wheel, the up and down arrows or a vertical glass pill of two icons 16 px left of the section move between them; below laptop, where the panels are full width, the pages sit side by side and a swipe that follows the finger, the left and right arrows or the same pill beside the volume slider do. The page persists as `?view=monitor`. The sky, the top bar, the transport and the source line stay; the middle band is a frame that never changes size, and the pages push through it over 1.5 beats, the outgoing one gone within the first three tenths of its travel, before its panels can reach the frame's edge, and the incoming one appearing only in the last three tenths once it is wholly inside (a cross-fade in place under reduced motion); the music never stops. A bento of frosted cards reads the engine: SCALE (PM2.5; the scale's name and a five-step ladder on EPA's lines, the lit step in the category colour), TONE (PM2.5 · NO₂; harmonicity and index as one word per tier, the same ladder), BEATS (NO₂; k / 16 and the bar's 16-step lane, hits lit as the engine fires them), BRIGHTNESS (O₃; 1.0 to 10.0 over the normalized value the lowpass takes, a meter, the hour's ppb beneath), DETUNE (PM2.5; ±σ in semitones and a band about the centre), REVERB (PM2.5; 0 to 100% of the normalized value the wet takes, a meter, the hour's µg/m³ beneath), and a ROUTING card on trial, laptop only: the three sources against the six destinations, a line per mapping brightening on the beat its source moved. At two columns its seven crossing lines read as a tangle, so below laptop width it is not shown; the source pills carry the routing there. Every card but ROUTING carries a source pill naming the measurement that drives it; the pill is the routing, and ROUTING is the whole of it. Values move on the beat report; meters ease over a beat; at rest the cards show the held hour.

### §5.4 Motion and microinteractions

Everything moves on the 90 BPM grid or drifts continuously as atmosphere. Nothing moves for its own sake. Per component, one microinteraction, added last:

- Hero panel breathes on the beat.
- Sun eases along its path per beat; a flare on tier change.
- Haze particles react to a tap or pointer move with a local displacement that settles within one bar.
- Borough highlight glides and settles on the beat.
- Pins lift on hover and ring on the beat when selected.
- Timeline drag has inertia that quantizes to a day on release.
- Mood word swap keeps the 0.5 s blur.

Glass motion follows the HIG model: elements materialize by sharpening (blur and fill ramping in) rather than fading, and control highlights move like a drop settling, with a short overshoot and no linear slides.

Accessibility fallbacks are part of the material, defined in `theme.ts`, not bolted on: `prefers-reduced-transparency` raises fill alpha and blur so both materials go frosted and opaque enough to read without the scene; `prefers-contrast: more` switches panels to near-solid black or white with a contrasting border; `prefers-reduced-motion` disables the particles' drift, all beat pulses, the settle overshoot, and the materialize effect (panels then fade). The sun still moves under reduced motion because it is the playhead.

### §5.5 Color

The sky carries the palette; there is no fixed background color. One data colour scheme: the standard EPA AQI categories, lifted to pass 3:1 on the panel (D-23), drawn as a continuous scale — it colours the graph's AQI line and bar and the mood word by its AQI (D-27), and nothing else in the glass layer. Haze color temperature is a separate ramp from clear-blue through white-gray to amber, driven by PM2.5, not by tier. Dark and light modes become night and day: the same scene at different hours, so a separate theme is unnecessary. Text hierarchy sits on glass and must meet contrast against the brightest and darkest sky stops; the panel fill alpha is tuned to guarantee that.

### §5.6 Tokens and technology

`theme.ts` stays the source of truth: the sky table (24 stops), the haze ramp, tier colors, glass parameters (blur radius, fill alpha, edge alpha), type scale, spacing, motion profiles (beat 667 ms, bar 2.67 s, blur 0.5 s, crossfade one beat). Scene rendered with three.js: Hosek-Wilkie for daylight and Preetham for night, cross-faded across sun elevation +6° to 0° (D-20), with the wildfire plume as a composited layer above the sky. Bruneton was evaluated and rejected (D-21). Glass via CSS `backdrop-filter`; refraction effects (SVG displacement) are Phase 2 polish. No component libraries.

### §5.7 Responsive

Laptop (≥1024): scene full-bleed; a top bar of three pills (borough words, day navigation, pins), the hero centred above the graph in one 1040 px section centred in the remaining height (stacked at every breakpoint since 2026-09-16: side by side the graph was squeezed), the page pill 16 px left of the section, a bottom bar with the transport at left and the source line at right (D-26). Phone (<1024): the same pieces in one column — borough, nav, pins as a scrolling strip, hero, graph, source — with the transport pinned above the safe area; the borough words scroll horizontally inside their glass. The scene's particle budget halves on phone.

### §5.8 Components (hand-styled)

Scene (SkyView: the two sky models, stars, bloom, the sun disc; SmokeLayer, NightLayer, GoldenLayer), Glass (the two materials), MoodLine and AQINumber (the hero), BoroughToggle, Graph, DayNav (the picker, the pins, the calendar), Transport, SourceLine, Cursor, Monitor and Routing (the monitor page's cards), PageIndicator. ImaginePanel and the timeline ribbon are target state.

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
| D-19 | 2026-08-27 | Immersive Apple-Weather register: full-bleed data-driven sky scene with glass panels, replacing the typographic score-as-page | Keep D-14 (typographic); illustrated register (gauravi.design style) | Portfolio needs one polished, immersive, product-grade web piece; the typographic register could not fill that slot however well executed. The scene keeps every visual element data-driven (sun = O3, haze = PM2.5, city = NO2), so the honesty rule holds. Apple Weather chosen over illustration because the scene must be tuned in code and the sky is the day being played. Sprint 3a (typographic) stays deployed until the scene replaces it |
| D-20 | 2026-08-27 | Sky = Hosek-Wilkie for daylight (albedo 0.15, clear-noon exposure 0.2) + Preetham for night (exposure ~0.65), cross-faded across sun elevation +6° to 0°; wildfire smoke is a composited layer, not a sky-model parameter | Single analytic model for everything; Bruneton precomputed atmospheric scattering | Hosek renders a real clear sky where Preetham is flat; Preetham renders a real night where Hosek is undefined (its dataset is frozen at elevation 0, which is why the fade ends there and does not go below). Neither renders smoke at any turbidity, and correctly so: a sky model renders clear air containing more aerosol, whereas June 7 was a plume between the observer and the sky. Those are different physical situations, so the plume is composited. Ground albedo was investigated and rejected as the smoke mechanism (it was 0.1, never 0) |
| D-21 | 2026-08-27 | Bruneton Precomputed Atmospheric Scattering evaluated and rejected; do not revisit without new evidence | Port it as the single physical model | The model is right in principle (Rayleigh, Mie, ozone and custom aerosol density profiles are first-class inputs, and night comes free), but every shipped implementation bakes one fixed atmosphere into precomputed LUTs with no runtime aerosol control: the reference WebGL2 demo exposes only camera, sun direction, sun size, exposure and white point, and ships 16.3 MB of .dat tables (scattering.dat alone is 16.0 MB, against a 295 KB gzipped scene chunk today). The three.js port (jeantimex, MIT) ships the same tables and the same C++ precompute. The one implementation with configurable LUTs, @takram/three-atmosphere (MIT), requires React 19 and react-three-fiber 9; this app is React 18 / r3f 8. The remaining path is porting the precompute pipeline (transmittance → single scattering → multiple-scattering iterations → irradiance) to WebGL2 and re-running it per haze level, which is not worth it to drive one channel |
| D-22 | 2026-09-15 | Scene camera faces south, so the sun arcs left to right | Track the sun's azimuth (always centered); face north (the framing every early frame used) | North put New York's daytime sun behind the camera: no disc, Preetham's included, was ever in frame. Tracking the sun has no arc. South keeps the sun in frame roughly 10–16 h; summer noon (67° on Jun 7) sits above the 63.5° frame top and only its aureole shows |
| D-23 | 2026-09-15 | The graph's AQI line and legend use the standard EPA six-category palette; the five tier colours stay on the mood word | Tier colours for the AQI line too | Visitors read AQI against the palette every AQI tool uses. The tier colours are the piece's own voice and are deliberately not EPA's; putting them on a numeric AQI axis would misread as a wrong legend |
| D-24 | 2026-09-15 | Glass tone follows the clock: light material with dark text in daylight, dark with light text at night, switching at the middle of the sky's dusk fade | Per-panel pixel sampling of the rendered sky | Sampling answered late (one GPU read per panel, at best every 120 ms) and each panel switched on its own, which read as inconsistency. The clock switches every panel together and at a moment the sky itself is changing |
| D-25 | 2026-09-15 | One neutral glass surface at every hour; the graph's AQI axis is fixed at 0–300; a day switch never stops the music | Day/night glass tones (D-24); AQI axis autoscaled per day; restart the phrase on a chosen day | The tone switch was unnecessary: a dark translucent fill at 0.62 holds AA for light text under any sky, so one surface is simpler and consistent. A fixed AQI ruler means the line and the standard-colour bar beside it always mean the same thing. The engine now swaps the day under a running transport and lets the smoothers glide, which is the "same hour, different air" rule extended from boroughs to days |
| D-26 | 2026-09-15 | Page scaffold from Shoro's Figma frame: top bar of three pills (borough · day nav · pins), hero and graph side by side centred, bottom bar (transport · source); phone stacks the same pieces with the transport pinned above the safe area. The graph is a DAW-style transport surface: press or drag moves the playhead and the engine seeks; play/pause live in the transport pill only | Single centred column on every width; tap-the-graph-to-play | The column wasted the desktop and left no room for more visualizations; the frame gives the scene the width. Scrubbing and toggling cannot share one surface |
| D-27 | 2026-09-15 | One colour scheme: the mood word takes its colour from its own AQI on the same continuous scale as the graph's line and bar (the standard EPA categories, lifted to pass 3:1 on the panel). The five tier colours are deleted | Map each tier to a category colour | The tiers (≤35, ≤65, ≤100, ≤150, above) do not share boundaries with the six categories, so a tier-to-category map still disagreed with the line at many values. Colouring the word by the AQI it describes makes the word and the line agree by construction |
| D-28 | 2026-09-15 | The header has exactly three states by width: A (≥1536) one row, borough left and the day group right; B (911–1535) two rows, borough centred over the picker and presets centred as a pair; C (≤910) three centred rows | Let flex-wrap decide | Wrapping produced in-between arrangements (borough left with the group wrapped right; picker right with the others centred) that read as wrong. Three named states, each a rule, and no pill with an alignment of its own |
| D-29 | 2026-09-15 | A change of day is one animation whatever the two times are: the current sun sets on the right along its own day's path, the night passes briefly with the stars hidden, the new day's sun rises on the left along its own path and runs to the target time (a start at night skips the sunset, a target at night skips the sunrise). Legs at 0.15 s per hour of clock, each bounded 0.3–1.0 s, the night 0.4 s. Playback and scrubbing follow the clock exactly in either direction | Glide the clock forward from one time to the other; or the shortest way round | Forward-only made 11 pm → 3 pm a sixteen-hour sweep with the stars whipping over the night; shortest-way ran the sun backwards. A day change is a cut between two days, and the sun of one day setting and the sun of the next rising is what a cut between days looks like, at any two times, in bounded time. The sun's date switches during the night leg, so the two suns are on their own seasonal paths and the change never snaps the sun to a new position |
| D-30 | 2026-09-15 | The header has four states by width, thresholds from the measured pills on the widest date label: A (≥1408) one row, borough left, day nav and presets right; B (840–1407) borough centred over day nav and presets as a pair; C2 (576–839) borough codes and day nav side by side over the presets; C (≤575) three centred rows. Amends D-28 | Three states with the old Calendar chip; or let flex-wrap decide | With the Calendar chip gone and borough codes on phones the pills are narrower, so day nav can share a row with the borough from 576 and the one-row state starts at 1408 rather than 1536. Below 576 no two pills fit side by side, so phones keep three rows; that is geometry, not a choice. Each threshold is the measured need rounded up to a multiple of 8, so a state never flips between a live and an archive day |
| D-31 | 2026-09-15 | A change of day moves the sun by the shortest path: elevation and azimuth interpolated directly from where the sun is to where the new day's time puts it, over 1.5 beats, ease-in-out; everything derived from elevation follows; the stars' clock takes the shortest way round. Amends D-29 | D-29's sunset → night → sunrise sequence | The sequence made 11 am → 7 pm set the sun and then raise it again to set it a second time, and it forced a hidden night between any two daytimes. One arc from A to B is shorter, predictable, and reads as a change of light rather than a day passing |
| D-32 | 2026-09-15 | A change of day while PLAYING is a dissolve: the last rendered sky is copied over the scene and faded out over 1.5 beats while the new day renders beneath with its clock taken as is; the night-blue layer eases so nothing pops above the fade. At rest the D-31 glide stands. Trial | Glide always; dissolve always | While playing the target keeps moving, so a glide bends toward a moving point and the sun heads off in arcs that read as arbitrary. A cut between days shown as a dissolve is predictable; the glide at rest keeps the sunset feel Shoro liked. Two behaviours, on trial |
| D-33 | 2026-09-15 | A change of day's sun path is planned in the camera's screen space (sunPath.ts): a straight screen line while the sun is visible, angles while it is unseen (behind the camera or below the horizon), with exit and entry points on the frame's edge. Amends D-31 | Interpolate azimuth and elevation (D-31); the great circle | The viewer judges the path on screen, and the rectilinear projection bends constant-elevation paths upward toward the frame's edges, so a setting sun swinging toward the edge dipped and then climbed; the great circle between a morning and an evening sun passes over the zenith. A straight line on screen is monotonic by construction, and what is unseen need not be planned for the eye. Pinned by unit tests over the cases that failed |
| D-43 | 2026-09-15 | Monitor page: a second scene page, a bento of synth readouts with a source pill per card; pagination by two translucent icons and swipe; the page persists in the URL | One page: the hero and the graph | The sonification has to be legible without an about page or a crowded score, and the synth construct explains itself when its parameters are labelled with what drives them. The sound's state comes from the beat report (σ and the bar's pattern added to it), never re-derived on the page. The ROUTING card is a trial |
| D-42 | 2026-09-15 | The AQI is EPA's reported AQI: the highest pollutant sub-index, the daily value from daily statistics for a chosen day, the NowCast composite for Live and for the graph's line, on the May 2024 PM2.5 breakpoints; the sound's tier stays PM2.5 alone; the archive is held at 2026-07-20 until EPA's PM2.5 catches up | Every AQI on the page was the hour's PM2.5 through the 2012 breakpoints; the O3 and NO2 sub-indices existed unused | "That's not how it's reported." The number a visitor compares with their weather app is the daily or NowCast composite; an ozone day read green here and orange everywhere else, and 12 µg/m³ read 50 where EPA now says 56. Sound stays PM2.5 because particles are the dissonance axis (§3) and the other two already have voices; the word follows the air. Source: AirNow TAD, May 2026 revision |
| D-41 | 2026-09-15 | The current year has a static snapshot too: public/data/{borough}-{year}.json for the year so far, built by scripts/build-current-year.ts through the historical route and committed; the loader serves every day up to the snapshot's last day from the CDN and asks the EPA route only for days after it. Amends §4.3 (archive is past years only) | The whole current year through the EPA route, CDN-cached a day per month URL | Days EPA has already published do not change; serving them through the route re-fetched from EPA once a day per month per borough and made the first load of any current-year day wait on EPA. The snapshot makes them as immediate as 2025, and the route's job shrinks to the weeks EPA has not yet published |
| D-40 | 2026-09-15 | The scene is the page: / renders it, /scene stays as an alias, the typographic page is deleted | / was the typographic page until the scene passed review (D-19) | The scene passed review on 2026-09-15 |
| D-39 | 2026-09-15 | The graph has no pulse row; the plot and the axis are the panel | The pulse row beneath the plot (§5.3) | It crowded the panel at every size and the pulse is the thing the ear already has; the graph is for the contours |
| D-38 | 2026-09-15 | The scale ladder changes tier at EPA's category lines: 50, 100, 150, 200; Very Unhealthy and Hazardous share Chromatic | Phase 0 boundaries 35, 65, 100, 150 (§3.4) | The page colours the number and the graph by EPA's categories; with the Phase 0 lines the ear was a category ahead of the eye, Whole Tone under a Moderate green-yellow. One ladder for both, and the category a visitor already knows |
| D-37 | 2026-09-15 | The graph morphs between states: on a change of day, borough or tab the line, the fill, the scale, the caret and the pulse row blend from the frame last shown to the new one over 1.5 beats, values in normalized height so two scales can be blended, presence as an alpha so a missing hour fades. Chips and buttons other than the borough row are set in Inter at 0.04em; the date and the graph labels stay on the data face; play, pause, calendar and the chevrons are Lucide | Cut to the new state; system fonts; hand-drawn glyphs | A cut read as a reload; the morph says "same hour, different air", the rule the sound already follows. One icon set reads as one hand |
| D-36 | 2026-09-15 | The AQI ramp adapts to the panel as the material does: one ramp with a dark end set for 3:1 on the darkest panel the scene makes and a light end for the brightest, lifted between them by the predicted luminance of the panel it sits on. The scene predicts each frosted panel by sampling the sky canvas behind it and applying the DOM layers' own gradient maths and the glass; the graph and the hero each lift their own ramp. Legend, line and fill read the graph's lift, the mood word the hero's. Amends D-35's two fixed ramps | Two fixed ramps | No fixed colour clears 3:1 on both the night panel (0.065) and the clear-noon panel (0.15) without going near-white; a violet at 0.25 luminance measured 2.0:1 on the smoke panel. The material already adapts to the same inputs, so the scale changing with the panel is the same trade the material makes |
| D-35 | 2026-09-15 | The glass is a tinted frost keyed to the sky: its alpha runs from 0.62 in clear daylight to 0.35 at night and under smoke, its tint from navy in clear air to umber under smoke and golden light, with a faint white lift at night. Two AQI ramps of one hue per category: a display ramp for the legend, line and fill that darkens to the EPA purple and maroon, and a text ramp for the mood word that clears 3:1 on the panel. Amends D-25 (one neutral surface) and D-27 (one colour for line and word) | One neutral dark fill at 0.62 everywhere; one hex shared by line and word | The neutral fill sat as a grey block on every sky. Measured sky luminance behind the panels runs from 0.09 at night to 0.92 at a clear noon, so the darkening is needed only in bright clear daylight; elsewhere a thinner, sky-tinted frost lets the scene through and stays above 4.5:1 for white text. A navy tint on an orange smoke sky looked wrong, so the tint follows the sky. The true maroon is 2.1:1 on the panel, fine for a bar and not for a word |
| D-34 | 2026-09-15 | On phones (state C, ≤575) the day is one control: a chip naming the current choice that opens a menu — Last 24h, then the presets in order — followed by "or choose a date" and the calendar. Replaces the arrows, date chip, Live chip and preset strip there. Amends D-30's state C | Keep the three pills stacked on phones | Three stacked pills spent a third of a phone's height on navigation, and the arrows and preset chips were small targets; one dropdown is the mobile idiom and holds every choice in one place |
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
| O-14 | Scene performance budget on phone at Suffocating haze density; whether Canvas 2D holds or WebGL is required | Scene prototype | §5.6 |
| O-15 | Whether a skyline silhouette reads as NYC without becoming a logo; alternative is an abstract ground band | Scene prototype | §5.2 item 3 |

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
