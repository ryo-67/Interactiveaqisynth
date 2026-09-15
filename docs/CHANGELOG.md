# Changelog

Why, not just what. Newest first.

## 2026-09-15 — The graph morphs between states; glass slider and caret; Inter and Lucide (D-37)

A change of day, borough or tab used to cut the graph to the new state, which read as a reload. Now every element blends over 1.5 beats from the frame last shown to the new one: the line and the fill in normalized height so a tab on a different scale morphs onto its own ruler as the ruler rescales, missing hours as an alpha so they fade rather than pop, the scale labels and the pulse row cross-fading, the caret easing to its new value. A change made mid-morph continues from where the line is. The volume slider is drawn by hand: the played share light, the rest a darker groove, and the thumb an opaque white knob with a hairline edge and a soft shadow, the way a system slider draws it (a translucent, blurred thumb let the track show through and its ring read heavy); the legend's caret is drawn to the same recipe, one fill and one shadow, since strokes over a fill that small doubled its outline. Chips and buttons other than the borough row are set in Inter at 0.04em tracking, the date and the graph's own labels staying on the data face; play, pause, calendar and the chevrons come from Lucide, one set, the play triangle shifted a unit to read centred.

## 2026-09-15 — The AQI ramp lifts with the panel (D-36)

No fixed colour at the top of the scale clears 3:1 on every panel: what reads on the night panel washes out on a clear noon, and what reads at noon is near-white at night. The ramp now has two ends, dark set for 3:1 on the darkest measured panel and light for the brightest, and the scene lifts between them by the luminance it predicts for the panel: the sky canvas sampled behind each frosted panel four times a second (the graph sits lower and measured brighter than the hero, so each panel lifts its own ramp), the night, golden and plume layers applied with their own gradient maths at the panel's band, the glass fill over a saturated backdrop. The plume's stop colours are now one function shared by the layer and the predictor, so the two cannot disagree. The ramp blends between its ends, and between categories, in linear light so a colour's luminance rises in step with the lift and never dips between stops; blended in sRGB the midpoint measured 8% short and red-to-violet passed through a darker magenta. The frost is a touch denser everywhere (day 0.56, night 0.40, from 0.50 and 0.35) so that the ramp can be more saturated: a darker panel needs a darker colour for 3:1, and at a lower luminance each hue has more chroma to give; every end is the most saturated colour of its hue at the luminance its panel needs. Measured composited in six states: the legend's top against the graph panel 3.05 to 4.29:1, the mood word against the hero 3.08:1 or better.

## 2026-09-15 — The frost tuned to the night and smoke benchmark; hairlines as one lift; grain at every hour

The clear-day fill was still a dark block next to the night and smoke-afternoon panels, which are the benchmark for the material. The day fill drops from 0.62 to 0.50: measured from the composited page, that is the lightest that keeps the primary text at 4.5:1 on the clear-noon hero (0.48 read 4.49:1), so the benchmark's 0.35 is not available by day without a tone switch. The umber tint now keys on the same smoke share that thins the frost, so it appears on grey and orange skies and never on a blue one. The graph's hairlines were a single opaque layer with the faint weight encoded as a dimmer grey, which is only equivalent over black: on the tinted frost they read darker than the panel on warm tints and vanished on cool ones. Now two opaque white layers, each composited once at its own alpha, so every hairline is the same lift over any panel; the faint alpha is 0.05, barely there by design. The display ramp's top goes back up from the EPA purple and maroon, which read as black beside the bright four, to a violet and crimson at 0.41 luminance, the first values that clear 3:1 on the smoke-day panel measured composited; the same two colours serve the mood word there. Film grain is on at every hour, night included, at a 0.035 base rising to 0.08 at the wildfire end; the blend changes from premultiplied overlay, which scales with the pixel's brightness and so measured zero on a night sky, to vivid light, which measured the same amplitude on a night sky and a noon mid-tone with no shift of the mean.

## 2026-09-15 — The washed-out sky, found: the lens effect was discarding the bloom

The intermittent "luminance and rayleigh broke" frame was never a bad value; it was the effect chain's order. The lens field samples the input buffer at displaced coordinates, and without the CONVOLUTION attribute the composer merged it into the bloom's pass, where it re-sampled the raw scene and passed the raw pixels on, discarding the bloom and the saturation grade computed before it. The r3f effect wrappers rebuilt every effect whose props changed (their constructor args are keyed on a JSON of the props) and appended each rebuilt effect at the end of the list, so the order shuffled with every eased change and bloom survived only when it happened to land after the lens. Now the lens declares itself a convolution and gets its own pass; every effect is one instance for the life of the canvas with its values set in place, so the pass chain is built once; a watchdog checks each frame that the chain still carries the bloom and the tone-mapping effect, that the exposure is finite and that the context is alive, and logs a snapshot the first time it is not. Sky inputs are also checked for non-finite values before they reach the renderer.

## 2026-09-15 — A tinted frost keyed to the sky; two AQI ramps (D-35)

The panel fill follows the sky instead of sitting as one grey block on every hour: alpha 0.62 only in clear daylight, where white text needs the darkening (a clear noon sky measured 0.92 behind the hero), thinning to 0.35 at night and under smoke; navy in clear air, umber under smoke and at golden hour so an orange sky is not fought by a cold panel; a faint white lift at night so the panel reads lighter than the sky. The AQI scale now darkens all the way to the EPA purple and maroon for the legend, line and fill, as a standard bar does, while the mood word takes a text ramp of the same hues that clears 3:1 on the lightest panel the scene makes (the frosted hero on a clear noon, measured). The veil thins the frost only past a density of 0.4: a clear day carries 0.23 and its sky is bright, so nothing below that counts.

## 2026-09-15 — One plot width on every tab; tighter sides; hours as "3pm"

The legend's column is reserved on every graph tab, so the plot is the same width whichever tab is up and the readings land on the same x positions; the legend is an addition beside the plot. The graph panel's side padding is one step tighter than its vertical padding (16/12 instead of 20/16), and the short-phone steps set the same variables the tab band reads, so the band spans the panel edge to edge at every size. Every hour is written "3pm": the data is hourly, so minutes were noise.

## 2026-09-15 — Phones from 408 wide: the header on one row

With the day control reduced to one chip, the phone header can be one row where the two pills fit: the chip drops its calendar glyph on phones (the caret is the affordance) and the gap between the pills is 12, so the borough codes and the widest chip label need 404 with page padding. From 408 they share a row; below that they stack. Any one phone always gets the same layout.

## 2026-09-15 — One day control on phones (D-34)

On phones the arrows, the date chip, the Live chip and the preset strip are replaced by one chip that names the current choice and opens a menu: Last 24h, then the presets in order, then "or choose a date" and the calendar. Three stacked pills spent a third of a phone's height on navigation. The calendar grid and the popover placement were extracted so the phone picker and the wider layouts share them.

## 2026-09-15 — The sun's path is planned on screen (D-33)

A setting sun that swung toward the edge of the frame dipped and then climbed again on screen. The cause was structural: the path was chosen in azimuth and elevation but judged on screen, and the camera's rectilinear projection bends constant-elevation paths upward toward the edges. The path is now planned in the camera's own screen space: a straight line on screen while the sun is visible, which is monotonic by construction; angles while it is unseen, behind the camera or below the horizon, with the exit and entry on the frame's edge. A pure module with unit tests over the cases that failed: live 4 pm to Ozone Spike 11 pm goes down and right and out; the reverse comes in at the edge and climbs; noon to a sun behind the camera goes down and right and out without ever going over the top.

## 2026-09-15 — Presets clean to severe; the legend as an upright slider; the 50 line

The presets now run Clear Day, Rush Hour, Summer Haze, Ozone Spike, Wildfire, clean to severe left to right, with Hot & Hazy renamed Summer Haze. The AQI legend is styled like the volume slider turned upright: a 4 px gradient track with a 12 px white thumb, shadow beneath and hairline border, so it reads as a control on the page's own terms rather than a coloured bar. The 50 AQI gridline had been skipped by a stale condition; every category boundary is dotted now.

## 2026-09-15 — A change of day keeps the clock hour; golden hour scaled by visibility

Switching between the live window and an archive day while playing kept the array index, and on the live window index 8 is 11 pm yesterday while on an archive day it is 8 am, so a bright Ozone Spike morning landed in the night and read as the sun's effects dying. The engine is now sought to the new day's index for the old clock hour, which is what "same hour, different air" meant. A seek made after the last beat report now supersedes it for the sky and the mood, so a paused scrub reads the scrubbed hour. Golden hour is scaled by the same visibility term the stars use, (1 − veil)², so a hazy or smoky day has a dim golden hour rather than a super bright one.

## 2026-09-15 — Glide at rest, dissolve while playing (D-32, trial)

While playing, the target keeps moving under a change of day, so the sun's glide bent toward a moving point and headed off in arcs that read as arbitrary. Now a change of day while playing is a cut: the last rendered sky is copied into an overlay and faded out over 1.5 beats while the new day renders beneath with its clock taken as is; the night-blue layer eases so it never pops above the fade. At rest the glide stands. The WebGL buffer is preserved between frames to make the snapshot possible.

## 2026-09-15 — A change of day moves the sun by the shortest path (D-31)

The sunset-then-sunrise sequence of D-29 made a change from 11 am to 7 pm set the sun, raise it again and set it a second time. Now the sun's position itself is interpolated, elevation and azimuth, from where it is to where the new day's time puts it, over 1.5 beats; exposure, the night blue, golden hour and the stars all follow the interpolated elevation. Measured: live noon to Wildfire evening is one arc, 51° down to 3° and 159° round to 297°; the reverse climbs back the same way; live afternoon to Clear Day night is one arc down below the horizon.

## 2026-09-15 — Four header states, from the pills' own widths (D-30)

The Calendar chip is gone and phones show borough codes, so the pills are narrower than when the three header states were set. The states are now four, each threshold the measured need on the widest date label rounded up to a multiple of 8, so nothing flips between a live and an archive day: one row from 1408; borough over day nav and presets from 840; borough and day nav sharing a row over the presets from 576; three rows below that. Phones keep three rows because no two pills fit side by side there, which is geometry rather than a choice.

## 2026-09-15 — The archive ends where EPA's data ends

The day navigation had assumed yesterday was the last playable day. EPA publishes with a lag — six weeks at the time of writing — so yesterday was an empty day. The last available day is now looked up in two stages, the static archive's last day at once and the current-year route's last published day when it answers, and that day bounds everything: the previous arrow from live lands on it, the next arrow past it returns to live, the calendar opens on its month from live and disables everything after it, and a line under the calendar says how far the data goes.

## 2026-09-15 — The date is the calendar

The Calendar chip is gone: the date itself is the chip, with a small calendar glyph on its left, and it opens the picker. When live, it reads "Last 24h" and the next arrow is off; the previous arrow from live is yesterday's full day, and the next arrow from yesterday is live again. One fewer control, and the thing you click is the thing that changes.

## 2026-09-15 — A change of day is a sunset and a sunrise (D-29); golden hour; eased inputs refuse NaN

The forward-only clock made the reverse of a good transition a sixteen-hour sweep with the stars whipping over the night, and the sun snapped to the new day's seasonal path the moment the day changed. Now every change of day is one animation: the current sun sets on the right along its own day's path, the night passes briefly with the stars hidden, and the new day's sun rises on the left along its path and runs to the target time; a start at night skips the sunset, a target at night skips the sunrise. Bounded legs, the sun's date switching in the dark. Dawn and dusk carry a golden-hour grade, orange at the horizon through rose to violet, strongest with the sun two degrees up and gone by fourteen, damped by smoke like the night blue; the day model renders that scattering only faintly at clear-sky turbidity. Every eased input now refuses a non-finite target, holds its last value and names itself in the console once: an eased state fed a NaN eases to NaN for good, which is the shape of "bloom and rayleigh break and never come back", and the name is how the source gets found next time.

## 2026-09-15 — Dawn rises once

The sky brightened at 6 am, darkened at 7, then brightened again at 8. Measured through the Clear Day at quarter-hour steps (mean luminance of the sky band): 82 at night, a 125 spike as the night model's horizon glow arrived, then 43 as the day model took over at its noon exposure — a crater no real dawn has. The causes were structural. At equal exposure the day model at 6° elevation is darker than the night sky and far darker than the night model's dawn glow, and the night model keeps brightening faster than the day model as the sun climbs, so any hand-over above the horizon slid downhill; and the night-blue layer faded before anything replaced it. The hand-over now happens across the horizon itself, −2° to 2°, before the night model's glow appears; the night is darker (exposure 0.45, not 0.65) so a dawn can rise from it; the blue fades out at the horizon; and exposure is a measured curve over sun elevation, the camera's auto-exposure, set point by point so the band rises through dawn and on to noon and falls the same way through dusk. Result: 69 at night, 81 at the horizon, 90 → 107 across the first three hours, 142 by late morning; dusk 101 → 95 → 83 → 81. Sunrise and sunset themselves are astronomical for the date; no weather is modelled, since the data sources carry none.

## 2026-09-15 — The clock runs forward; a null hour holds; the calendar is a real popover

A day switch keeps the transport position, but the same index is a different time of day on the new day, so the clock jumped and the sky flickered. The clock now glides: forward only, at a rate per hour of clock with a one-beat floor, because facing south the sun rises on the left and sets on the right and time in this piece does not run backwards — 11 pm to 1 pm passes through a sunrise, 1 pm to 11 pm through a sunset, each a visible moment rather than a flash. A second switch mid-glide restarts from where the clock is. The dull afternoon had a data cause: AirNow publishes PM2.5 for the newest hour before O3, and a missing O3 was read as zero, which dropped rayleigh, bloom and the disc to their low-ozone ends; the sky now holds a channel's last reported value across a null hour, as the engine holds its effects. The calendar renders at the document level: inside the day pill its blur could only sample the pill, so the graph showed through sharp; it closes on any choice of day. The graph redraws when browser zoom changes the pixel ratio, which Firefox does not report as a resize.

## 2026-09-15 — Pause is immediate

Pausing the transport only stopped the clock: events Tone had already scheduled inside its lookahead still fired, the bed's bar-long notes rang through their 1.2 s release, and the long reverb decayed for 7.5 s, so a pause trailed off for seconds. The mix now sums into one master gain before the destination; pause closes it in 80 ms and releases every held voice under it, resume opens it the same way. The position is untouched, so play still picks up where it stopped.

## 2026-09-15 — Graph time axis: two labels, readings pinned to the bounds

Hour numbers along the x-axis read as a 24-hour clock, which on the rolling live window (2 pm yesterday to now) was more confusing than helpful. The axis now carries two labels: the first reading's date and time at the left ("Sep 14, 2:00 pm", with the year only when it is not this year) and "now" at the right when live, else the last reading's time. The playhead chip carries the date the same way ("Jun 7, 2023, 4:00 am · AQI 216"). With the y values in the gutter there is nothing left for the line to collide with, so the readings are pinned to the plot: the first on the y-axis line, the last on the right edge, no half-column of padding at either end. One consequence: the pulse steps of the last hour run from the last reading towards the hour after it, past the right edge, so they are not drawn.

## 2026-09-15 — Time of day from the timestamp, not the index

The live series is AirNow's last 24 published hours, so it starts wherever the window starts; an archive day starts at midnight. The page had been using the array index as the clock hour everywhere, which is only true for archive days: playing live at 1 pm, the sun showed 4 am four beats in and the mood sentence agreed with the sun, not the air. Now the transport position stays an index (that is what the engine steps through and what the graph's playhead draws) and the time of day comes from each reading's own timestamp through one helper; the sun, the stars, the mood sentence, the tooltip and the x-axis all read that. Found alongside it: the eased clock's first frame after a beat could run a few milliseconds backwards, because a frame's timestamp can precede the performance.now() that started the ease, which put the playhead at −0.004 for one frame. It was silent until the graph indexed the day with it. The progress is now clamped at the source and the index at the read.

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
