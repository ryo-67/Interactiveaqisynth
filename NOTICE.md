# Notices

Third-party material in this repository, and the terms it arrives under. The software here is MIT licensed (LICENSE) and the documents and the work are CC BY-NC 4.0 (LICENSE-CONTENT.md). Neither of those relicenses anything below.

## Hosek-Wilkie sky dataset

Applies to `src/scene/hosek/hosekData.ts`.

The dataset's terms require the copyright notice and the citation of both papers to be retained. The following is reproduced from that file and is not to be reworded or summarized.

> Copyright 2012–2013 Lukas Hosek and Alexander Wilkie, Charles University in Prague.
>
> Released with the sample implementation of "An Analytic Model for Full Spectral Sky-Dome Radiance" (SIGGRAPH 2012) and "Adding a Solar Radiance Function to the Hosek Skylight Model" (IEEE CG&A 2013), under the authors' BSD-style terms, which require this notice and citation of the papers to be retained.

Project page: https://cgg.mff.cuni.cz/projects/SkylightModelling/

The coefficients are the official RGB dataset, `ArHosekSkyModelData_RGB`, version 1.4a, converted from the reference release.

## Hosek-Wilkie shader and CPU model

Applies to `src/scene/hosek/HosekSky.tsx` and `src/scene/hosek/hosekWilkie.ts`.

Both are ported from https://github.com/diharaw/sky-models, MIT licensed. The shader came from that project's GLSL and the CPU side from its wrapping of the authors' reference dataset. Each file carries the attribution in its own header.

## Preetham sky

Applies to `src/scene/SkyView.tsx`, which renders the night dome with drei's `<Sky>`.

`@react-three/drei` (MIT) wraps the `Sky` object from `three-stdlib` (MIT), which is a repackaging of three.js's `examples/jsm` (three.js, MIT). The model is Preetham.

> A. J. Preetham, Peter Shirley and Brian Smits. "A Practical Analytic Model for Daylight." SIGGRAPH 1999.

## Icons

Applies to `src/components/icons.tsx` and `public/favicon.svg`.

The glyphs are Lucide's paths, drawn inline rather than imported. Lucide is ISC licensed, https://lucide.dev, and is itself a fork of Feather by Cole Bemis, MIT licensed, https://github.com/feathericons/feather. No icon package is a dependency of this project.

Twenty-two glyphs are inlined in `src/components/icons.tsx`: play, pause, calendar, the four chevrons, move-horizontal, move-up, move-down, move-left, move-right, notebook-text, pencil-sparkles, x, circle-user-round, linkedin, github, minimize, refresh-cw, cloud-sun and audio-lines. The favicon is built from two more, cloud-sun and cloud-moon, one for each color scheme.

The linkedin and github glyphs are brand marks. Lucide distributes them under ISC, but the marks themselves are trademarks of their owners and their use is governed by those owners' brand guidelines rather than by the icon set's license.

## Type

Applies to `src/utils/theme.ts` and `index.html`.

Inter, by Rasmus Andersson, SIL Open Font License, is the only face this app distributes. It is served from Google Fonts and sets the chips and buttons.

The other three stacks name faces that already exist on the reader's own machine. Nothing of theirs is embedded or redistributed here, so no license of theirs applies to this repository.

- Editorial serif: Georgia, then Times New Roman.
- Data face: SF Mono, then Roboto Mono, then Menlo.
- UI caps: the system UI face.

## Base stylesheet

Applies to `src/index.css`.

The reset layer at the top of that file is compiled Tailwind CSS, MIT licensed, https://tailwindcss.com, kept from the prototype export. Its banner is preserved in place at the head of the file:

> /*! tailwindcss v4.1.3 | MIT License | https://tailwindcss.com */

No Tailwind utility classes are used anywhere above that layer. Every class in the components is hand-written.

## Rhythm

Applies to `src/engine/euclid.ts`.

The Euclidean pulse uses Bjorklund's algorithm, in the Bresenham formulation.

> Godfried T. Toussaint. "The Euclidean Algorithm Generates Traditional Musical Rhythms." BRIDGES: Mathematical Connections in Art, Music and Science, 2005.

## Data

Applies to `api/`, `public/data/` and `src/engine/aqi.ts`.

Live readings come from AirNow, https://www.airnow.gov. They are preliminary data that the originating agencies have not fully verified.

The archive is built from EPA AirData bulk files, https://www.epa.gov/outdoor-air-quality-data, and the current year past the committed snapshot is read through the EPA AQS API, https://aqs.epa.gov/aqsweb/documents/data_api.html.

The AQI calculation follows AirNow's Technical Assistance Document for the Reporting of Daily Air Quality.

Works of the United States federal government are generally not subject to domestic copyright. This section is a statement of provenance rather than a license obligation.

## Runtime dependencies

Shipped with the application. License identifiers read from each package's own manifest.

| Package | License |
|---|---|
| @react-three/drei | MIT |
| @react-three/fiber | MIT |
| @react-three/postprocessing | MIT |
| @vercel/analytics | MIT |
| @vercel/speed-insights | Apache-2.0 |
| postprocessing | Zlib |
| react | MIT |
| react-dom | MIT |
| three | MIT |
| tone | MIT |

Development dependencies, which are not shipped: @types/node, @types/react, @types/react-dom, @types/three, @vitejs/plugin-react-swc, eslint, eslint-plugin-react-hooks, tsx, typescript-eslint, vite and vitest are MIT; @vercel/node and typescript are Apache-2.0.
