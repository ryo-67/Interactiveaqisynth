# GitHub project metadata

What the repository says about itself on its own page. Written 2026-09-17 (homepage updated 2026-10-12, D-67), when the repository had an empty description, no topics and a homepage pointing at the superseded domain. Shoro applied it the same day; what is recorded below is what is LIVE, with the drafts kept underneath.

## Description — live

> A web instrument that turns New York's hourly air quality into music and weather.

Shoro's pick of the three drafted. The two not taken:

> Plays New York's air as music. Hourly ozone, nitrogen dioxide and PM2.5 — live from AirNow or from an EPA archive back to 2020 — drive a synthesizer and a physically based sky.

> New York's air, played as music. Hourly ozone, NO₂ and PM2.5 drive a synthesizer and a sky.

## Homepage — live

`https://aqi.shoro.space`, the primary domain since 2026-10-12 (D-67), set by Claude on Shoro's instruction the same day. Before that it was `https://aqi-synth.vercel.app` (2026-09-17), and before that `https://interactive-aqi-synth.vercel.app`; both now 308-redirect to the new domain.

## Topics — live

Seventeen: the sixteen drafted, plus `procedural-music`, which Shoro added. GitHub allows up to 20.

```
air-quality
airnow
creative-coding
data-sonification
data-visualization
environmental-data
epa
generative-music
interactive-art
new-york-city
procedural-music
react
threejs
tonejs
typescript
web-audio
webgl
```

## Applied

Set by Shoro on 2026-09-17, not by a script in this repo; the homepage was changed with `gh repo edit` on 2026-10-12. If any of it needs changing again:

```bash
gh repo edit --description "..." --homepage "https://aqi.shoro.space"
gh repo edit --add-topic <comma,separated>
```

The description is copy, so it stays Shoro's call.
