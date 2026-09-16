# Changelog

Why, not just what. Newest first.

## 2026-09-16 — One spacing system for the cards; no ghosting at a breakpoint flip; a roomier page pill

Shoro's pass on the rows. Every card now spaces the same way: 12 from title to value and between a gauge and its unit line, and the gauge block anchored at the bottom padding, so a ladder card's bar and a value card's unit line both sit 20 above the edge on laptop and a row's spare height goes between the value and the gauge. The routing diagram gives up 16 px so the value rows hold that; short laptops step the card gap to 8 with a shallower diagram; tablets take a 144 row. When the viewport crossed the laptop line the pages' transitions carried them from their old axis positions to the new and painted a slide that meant nothing; during a resize every page transition is off and a drag's leftover transform is cleared, so a breakpoint flip lands in one frame. The vertical page pill's icons sit 12 apart in a 92 px pill.

## 2026-09-16 — The gauges as one family; the missing meters; the detune band to a semitone

Shoro's pass on the monitor. The beats lane was 8 px squares at its own shades beside 4 px ladders; it is now the ladder's shape and shades, a fired step a shade brighter, and every gauge in a row shares one top edge (the beats value's unit span had grown its line by 7 px). The three meters had vanished on laptop: the shared section height gives a value card 148 px against 157 of content, and the meter, the one child with no intrinsic height, was what the column shrank to nothing. Gauges no longer shrink and the card's inner gap is 8 at every breakpoint, so the content fits its row; cards whose gauge sits straight under the value get 16 between them. The detune band is drawn to the 100-cent ceiling the anchors reach, not the old 60.

## 2026-09-16 — Six tiers, one per EPA grade, on one axis (D-44)

The ladder had five scales for six EPA grades, with the top two sharing Chromatic and Whole tone sitting second. Now each grade has its own scale and the scales are ordered on a single axis, loss of tonal centre: Pentatonic, Major, Dorian, Phrygian, Whole tone, Chromatic. Major is inserted at Moderate, where most New York days live; Whole tone moves to Very Unhealthy, since it is the smoothest scale by interval and the one with no centre. The Phase 0 timbre pairs are kept and moved up two grades: the axis is distance from an integer harmonicity ratio, and they were approved by ear. Hazardous is denser, not sparser: the melody's release lengthens to 1.2 s there, walked over a beat, so each eighth still sounds under the next two and the chromatic notes pile into a cluster the 100-cent σ smears. Detune σ is no longer a function of normalized PM2.5 but a slope in the hour's own PM2.5 AQI through fixed anchors, so the jitter grows all the way up while only the scale steps. Bass harmonicity climbs 1 + tier × 0.2 so it still tops out at 2. Six breath words, six tone words. The ladders draw six steps. ShareModal, dead since the scene became the page, is deleted. Amends D-02, D-17 and D-38; the listening pass is Shoro's.

## 2026-09-16 — The hero cards with the widgets' anatomy: label, value, gauge

The subtitle went. In its place each hero card carries a gauge like the synth widgets: the AQI card one bar in the number's own colour on the six-category ramp, the Breath card the five-step ladder the scale and tone cards carry, its lit step in the tier's colour, the word itself now white since the ladder holds the colour. The gauges moved to one file the monitor and the hero share. With the sentence gone went its two-line split, its width probes, its token and its test. The two hero cards are now the same look and feel as the six below them.

## 2026-09-16 — The two sections share one height and one place in the vertical stack

The scene section (hero pair, gap, graph) and the monitor section had their own heights, and since each page centres its content in the band they sat at different y. The scene section's rendered height is now watched and given to the monitor section, whose grid fills it with the routing row at its own height and the two card rows sharing the rest, so the sections are the same height and land at the same y at every laptop size. The cards' sub line lost its extra margin, which had pushed it 5 px past the row.

## 2026-09-16 — The hero cards at fixed widths, the number at the widgets' size, the sentence on one line

Shoro's pass on the two cards. On laptop the pair no longer fills the section: each card is a fixed width measured on hidden probes inside it (the widest three digits and the widest possible label; the longest of the five sentences and the widest tier word), so a change of day or tier moves nothing, and the pair sits centred at 676. The number is set at the widgets' value size, like Phrygian or 7.9. From the tablet width up the sentence runs on one line, the longest of the five fitting the section with room; phones keep two lines. A canvas measurement had under-read Georgia by a tenth, which is why the probes are DOM.

## 2026-09-16 — The hero as two widgets

The one panel with the number beside the text split into two cards in the monitor's style, so the whole scene reads as one family of widgets: the number under "AQI · now" (Live) or "AQI · Jun 7" (an archive day, its own date), and the word and sentence under "Breath". The number card takes its content width, the breath card the rest of the section; the text still fits by scaling down to 0.8 on narrow phones, and the pair keeps the first monitor row's height below laptop. The number's optical centring against a text stack went with the old layout.

## 2026-09-16 — The scene stacked at every width

The tablet's column read better than the laptop's row: the hero centred above the graph, the graph across the section's whole 1040 rather than the 614 the hero left it. It is the layout everywhere now.

## 2026-09-16 — The glass dissolves instead of the page fading; the hero as tall as the first row

The panels flashed grey during the page slide: the fade animated the page's opacity, an ancestor with opacity below 1 is flattened into its own layer, and the backdrop-filter inside it had no sky to sample. Now nothing above a panel ever carries an opacity. One registered, inherited custom property (--glass-on) scales the material itself — blur, fill, lift, edge, shadow, dither and the contents — and a page leaving animates it to nothing, a page arriving from nothing, on the same timing as before. Below laptop the hero is exactly as tall as the monitor's first row: a shared row token on tablets, a quarter of the band on phones. Short laptops (720 tall) step the monitor's grid down so it sits inside the frame.

## 2026-09-16 — The vertical fades a touch slower

A fifth of the travel read as a cut; the fades now take three tenths of it, the leaving page still gone before its panels can reach the frame's edge on any laptop size measured.

## 2026-09-16 — Phone cards as widgets; the neighbouring page rests beyond the clip; smaller source pills

Shoro's fourth pass. The phone cards had 12 px of padding around full-size elements and read as a squeeze; they keep the panel's 16 px (12 on a 667-tall phone) and the elements inside step down instead — the value at 20/24, the lane 6 — so the six cards still fill the band in four rows with nothing scrolling. With no fade on the horizontal axis the neighbouring page had shown a sliver through the clip's 24 px reach; the pages now sit that much further apart and rest beyond it, and a drag starts from the track's measured rest position rather than a constant. The source pills take the micro size, 20 tall, at every breakpoint.

## 2026-09-16 — Horizontal pages without a fade; the pill an even third of the transport; centred on the section

Shoro's third pass. Below laptop the pages slide with no fade at all, both fully opaque throughout. The page pill in the transport group has the phone pill's 12 px sides so it reads as one control, and stands 8 px from the volume like the volume from the play button. On laptop the vertical pill lives inside the band, so its centre is the section's rather than the page's.

## 2026-09-16 — One section width, the fade ahead of the clip, horizontal below laptop

Shoro's second pass. A page leaving faded while it was still crossing the frame's edge, so it read as clipped grey; now it is at nothing within the first fifth of its travel and the arriving page appears only in the last fifth, once it is wholly inside. Both pages are one section of the same width at every breakpoint (1040 on laptop, the band below), the hero-and-graph row and the monitor's grid each filling it, and the page pill stands 16 px left of that section rather than at the page's edge. Where the panels go full width (below 1024) the pages sit side by side like the phone's and the pill joins the transport group beside the volume; a tap on the band's empty space there is still the sky's play/pause.

## 2026-09-16 — The monitor page reworked: a static frame, vertical above phones, the finger's own swipe

Shoro's review of D-43. The band no longer changes height between pages, which had the panels drifting during the slide: it is a frame that takes the height the bars leave, both pages live in it, and a switch pushes them through it with the outgoing page fading to nothing as it goes. Above the phone width the pages stack vertically (the monitor below the scene) and the wheel, the up and down arrows or a vertical glass pill of two icons at the left of the band turn them; on phones the pages sit side by side with a gap and the swipe follows the finger, snapping on release, with the left and right arrows and the pill in the transport row as the other routes. The frame is padded outward by the panels' shadow so the clip never cuts one. The routing card loses its source pill (it is the routing); brightness reads 1.0 to 10.0 and reverb 0 to 100% in the serif, like detune; on phones the six cards fit the band in four equal rows and nothing scrolls, down to a 667-tall phone. Play and pause take Lucide's current filled shapes.

## 2026-09-15 — The monitor page (D-43)

The scene shows the day and the sound plays it, but nothing on the page said what the sound was made of. A second page of the scene, the monitor, does: a bento of frosted cards reading the engine's own beat report — the scale and its ladder, the tone word, the bar's Euclidean lane lit as the engine fires it, the brightness and reverb meters at the normalized values the mappings take, the detune σ — each with a source pill naming the measurement that drives it, so the routing is on the card. Two additions to the report (σ and the bar's pattern) so the page re-derives nothing; at rest the cards read the held hour through the same engine functions. Two translucent icons at the foot, a swipe on phones or the arrow keys switch pages, the band sliding over 1.5 beats with the music running, and the page persists as ?view=monitor. A ROUTING card, the three sources against the six destinations, is on trial on laptop only: at phone width its seven crossing lines read as a tangle and the pills already say what it says. On phones the band scrolls the cards vertically when it must (a 667-tall phone); the page itself never scrolls. STRATEGY §5.3 is brought back to what is built: no pulse row, no clause placeholders in the hero.

## 2026-09-15 — The AQI is the AQI EPA reports (D-42)

Every AQI on the page was the hour's PM2.5 through the 2012 breakpoint table, so an ozone afternoon read green here and orange on AirNow, and 12 µg/m³ read 50 where EPA has said 56 since May 2024. Now one module (engine/aqi.ts, after AirNow's Technical Assistance Document) computes what is reported: the highest pollutant sub-index, from daily statistics for a chosen day's number (PM2.5 24-hour mean, ozone's best 8-hour window from 7 am, NO2's worst hour) and from the NowCast for Live and for the graph's AQI line (PM2.5 a weighted 12-hour mean that leans on recent hours when the air moves; ozone the trailing 8-hour mean, a stated stand-in for EPA's regression NowCast; NO2 the hour). The day's neighbours load with it so the windows reach across midnight. The routes now ship hours only, so the api and the page cannot disagree. The sound's tier stays PM2.5 alone: particles are the dissonance axis, ozone and NO2 already have voices; the mood word follows the graph line at the hour being heard, so the word says what the air is and the ladder says what the particles are. The archive is held at July 20, 2026, the last day EPA has complete PM2.5 for, until the snapshot is rebuilt.

## 2026-09-15 — The current year is cached like the years before it (D-41)

EPA's published days do not change, yet every current-year day went through the EPA route, re-fetched from EPA once a day per month per borough, and the first load of any of them waited on EPA. Now the year so far is a static snapshot per borough, built through the same historical route (so the snapshot and the route cannot disagree on a day) and committed; the loader serves every day up to the snapshot's last day from the CDN and asks the route only for days after it, and the search for the latest available day stops at the snapshot's month instead of walking back through months already on disk. Re-run the script and commit when EPA publishes further.

## 2026-09-15 — The scene is the page (D-40)

/ renders the scene; /scene stays as an alias so earlier links land. The typographic page it stood in for is deleted with the two pieces only it used, the date-status line and the live/archive status words. The scene is imported directly now, since it is the page; the harness at /scene-test stays lazy.

## 2026-09-15 — The hero fits each tier; the number centred by its own ink; phone tabs equal

The fixed width left holes, so the panel fits each tier's content again, on phones too, with the layout fixed instead: two lines, the split, the spacing, and the height. The number is a step larger (80/64/56/48). It is centred optically, not by its box: Georgia's figures are old-style (a 1 sits at x-height, a 6 rises, a 5 drops) and the font here has no lining set, so each shown value's ink is measured and its centre placed on the word-and-sentence stack's centre, then lifted by a small bias for the stack's descenders; measured across four values at laptop, the number's ink centre sits within a 3.5 px band, where the box centring had varied by 16. The sentence's first line has a floor of 28 characters where the sentence allows, so a short sentence is not cut into two stubs. On phones the four graph tabs share the band equally, since their labels are all short now.

## 2026-09-15 — The preset chips never wrap

Around 1360 wide a preset chip folded onto a second line inside its pill, and the script that hugged the pill to its wrapped chips then locked the narrow width in. The chips are one row by construction now, the pill never shrinks, and fit-content is exact without a script; when the date pill and the presets cannot share a row, the day group wraps the whole pill onto its own row, centred. Measured at eleven widths from 580 to 1440: one row of chips every time, the pill inside the viewport.

## 2026-09-15 — The hero's number and text as one centred group; phones full width

Where the panel fits its content, its row is fixed at the widest group any tier makes (the number's three-digit column, the gap, the widest text) and the number and text sit centred in it, so a shorter sentence leaves even room at both sides instead of a hole at the right; the number is centred in its column and the text column takes its own width. Eight pixels of air between the word and the sentence. On phones the hero spans the column like the graph, number and text spread evenly across it, and where the panel is narrower than the two the text scales down to fit, floored at 0.8, its line heights fixed in pixels so the height never moves; measured 12.5 px on a 390-wide phone.

## 2026-09-15 — The hero re-laid to Shoro's mock; the stuck blur

The number sits at the left, and to its right the tier word over the two-line sentence, both left-aligned, the number centred on that block; the hairline is gone. Both columns have fixed widths so the panel never changes size: the number's from a hidden three-digit number laid out in its cell (a canvas cannot see its tabular digits), the text's measured at the widest sentence line or tier word in its own font. Measured across the five tiers and four number widths at two viewports: one size each, no overflow. The tier blur could strand itself: when the tier crossed a boundary and came back before the swap fired, the cleanup cleared the timer and the effect returned early with the blur still on. It lifts the blur now.

## 2026-09-15 — The hero is one size for every tier; the sentence is always two lines

Left to the browser, the five mood sentences (36 to 75 characters) could not all wrap to two lines at one width, so the panel changed size with the tier. Now each sentence is split at the word boundary nearest its middle, at least two words a side so nothing is orphaned, and the break is rendered; the content's width is the widest thing any tier can put in it, measured in the elements' own fonts: the widest line of the five sentences, or the number at three digits plus the row's gap plus the widest tier word; the word and the sentence sit at the right. So the panel's width and height are the same whatever the tier. Measured at four viewports: every sentence two lines, none overflowing, one panel size per viewport.

## 2026-09-15 — The phone graph fills the height it is given; tabs without units

On phones the middle band takes the height the top bar and the transport leave instead of centring in it, the hero keeps its content height, and the graph panel is the flexible child with its plot growing into it, the breakpoint's tab height now a floor rather than the size: on a 390 × 844 phone the plot goes from 268 to 344 tall, and the 88-tall floor on short phones becomes 196 to 240. The tab chips drop their units on phones, AQI, PM2.5, O₃, NO₂, since the band is narrow and the unit is in the axis. The x-axis line under the plot is gone: with the pulse row removed it sat two pixels under the plot's own baseline, which is the axis.

## 2026-09-15 — No pulse row (D-39)

The pulse row beneath the plot is gone at every size: it crowded the panel, and the pulse is the thing the ear already has. With it go its height token, its step and hit-count series, the module that built them and the anchors the graph took only for it.

## 2026-09-15 — The phone graph: taller, tabs across the band, faint lines off, tighter padding

On phones the plot goes from 160 to 240 tall (44 px still spare above the transport on an 844-tall phone; the short-phone steps keep their own heights), the four tabs grow to fill the band from their own text so the longest is never cropped, the faint hour lines are off (the firm four-hour lines stay: dense information on a small display), and the panel's padding tightens to 12 and 8. The faint alpha is a custom property the graph reads per breakpoint, so the token stays one value.

## 2026-09-15 — The line merges into the legend; a softer green

The line ended flat against the legend's left edge, and any cap, join or fill edge there read as a hook. Now the line's last segment runs straight on under the legend's track and the legend is drawn after it, covering the end with the ramp's own colour at that height, so the two cannot disagree at the seam; measured identical to the pixel in three states. The bottom of the ramp is a softer green (#3ed35a to #66df7c): the EPA green at full chroma shouted next to the rest of the ramp.

## 2026-09-15 — The hero fits its content: number and word on one row, a rule, one sentence

The hero stretched to the graph's height and width with the number stacked over the word and a two-clause sentence. Now it fits its content with one padding on every side: the number and the tier word share a row and a baseline, the number left and the word right; a hairline; the sentence beneath, at most two lines. The sentence's second clause ("At 8 pm, ozone carried the line") is cut, and with it the hour and dominant-pollutant plumbing that fed it. The display size drops from 96 to 64 so the number sits with the word rather than over it.

## 2026-09-15 — The whole day group lit on a chip's hover; dither against banding; the cursor above the popover

The top bar's day group has carried the class scene-day since D-30, and the calendar's cells were given the same name, so hovering or pressing any chip in the date or preset pills applied the cell's hover and pressed fills to the whole group. The cells are scene-cal-day now. Frosted panels showed bands: the blur quantizes the sky behind them into 8-bit steps, and the night, golden and plume gradients band on their own; a fine white noise at 4% over every glass fill and 5% over the sky's layers breaks the steps. The page cursor is portaled to the body like the popover, since inside the scene root it painted beneath it. Pressed fills are gone: while the pointer is down the cursor's ring closes to a filled dot, one press signal for every clickable instead of a state per element.

## 2026-09-15 — The page's own cursors; hover and pressed states everywhere; a dismissing press is not a play

The cursor is the page's own element following the pointer, since a cursor image cannot animate: a ring that grows over anything clickable, and grows further while a glyph fades in at its centre over the sky (play, pause) and the graph (Lucide's drag arrows); the native cursor is hidden while it runs, on fine pointers only. Every chip, button, calendar day, borough word and the slider thumb answers the pointer: a lighter fill or a brighter word on hover, a darker fill while pressed (a shrink moved the pill's backdrop with it), 120 ms, none of it under reduced motion. The calendar's cells are 32 px squares centred in their columns; left to the grid they shrank to their text. While a popover is open the sky keeps the ring and the press that dismisses the popover is not also a play or pause: a small store says whether a popover is open and marks the dismissing press, and the sky swallows the click that follows it.

## 2026-09-15 — The calendar popover animates in and out, centred on the picker bar

The popover cut in and out; now it stays mounted through a 180 ms exit and enters from a hidden first frame, opacity with a 4 px settle from the bar it hangs from, none of it under prefers-reduced-motion. On wider viewports it is centred on the picker bar's own centreline instead of hanging from its left edge; on phones it stays centred in the viewport. Its strings are on the UI face with the chips; the calendar grid keeps the data face. Escape and a press outside now close it: a popover with an exit and no way out but its own chip read as stuck.

## 2026-09-15 — Scale ladder on EPA's lines (D-38)

Tiers now change at 50, 100, 150 and 200, the AQI categories the page already colours by; Very Unhealthy and Hazardous share Chromatic. The Phase 0 boundaries (35, 65, 100, 150) had the ear a category ahead of the eye.

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
