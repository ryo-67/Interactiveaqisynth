// phase0-days.ts — the six Phase 0 listening days as hardcoded fixtures (sprint 1 of Phase 1). Queens, EPA AQS hourly, 2023: PM2.5 µg/m³ (parameter 88502), O3 ppb (44201), NO2 ppb (42602), max across sites per hour. The Brooklyn days carry citywide O3/NO2 (per-hour mean of the monitoring boroughs — O3: Bronx/Manhattan/Queens/Staten Island; NO2: Bronx/Queens) with source flags set per §4.4/D-16. Replaced by the real data pipeline in sprint 2 (DAT-01..05).

import type { Day, HourReading, SourceTag } from "../engine/SynthEngine";
import type { PollutantAnchors } from "../engine/contour";

// Normalization anchors from the 2023 Queens hourly distribution (STRATEGY §3.10). Sprint 1 applies them to all six days, Brooklyn included — a known gap to SON-03 (per-borough anchors from the loaded archive). Consequence: Brooklyn June 7's PM2.5 normalizes against Queens's p95, which slightly understates it; fine for fixtures.
export const QUEENS_2023_ANCHORS: PollutantAnchors = {
  pm25: { p05: 1.3, p95: 20.8 },
  o3: { p05: 1.0, p95: 54.0 },
  no2: { p05: 3.3, p95: 35.8 },
};

type Sources = { pm25: SourceTag; o3: SourceTag; no2: SourceTag };

function buildDay(
  date: string,
  pm25: ReadonlyArray<number | null>,
  o3: ReadonlyArray<number | null>,
  no2: ReadonlyArray<number | null>,
  source: Sources,
): Day {
  return pm25.map(
    (v, h): HourReading => ({
      ts: `${date}T${String(h).padStart(2, "0")}:00`,
      pm25: v,
      o3: o3[h],
      no2: no2[h],
      source,
    }),
  );
}

const OWN: Sources = { pm25: "own", o3: "own", no2: "own" };
const BROOKLYN: Sources = { pm25: "own", o3: "citywide", no2: "citywide" };

export interface FixtureDay {
  key: string;
  label: string;
  day: Day;
}

// Order matches the Phase 0 prototype buttons.
export const PHASE0_DAYS: FixtureDay[] = [
  {
    key: "2023-10-29",
    label: "Oct 29, cleanest",
    day: buildDay(
      "2023-10-29",
      [1.7, 1.2, 0.2, 2.4, 1.3, -0.1, -0.9, 1.3, 2.8, 2.1, 2.5, 3.0, 1.6, 1.1, 0.2, 0.7, 2.4, 3.3, 3.6, 2.5, 1.1, 0.7, -0.5, 0.3],
      [20.0, 23.0, 24.0, 23.0, 21.0, 20.0, 18.0, 17.0, 16.0, 15.0, 13.0, 14.0, 13.0, 13.0, 13.0, 12.0, 11.0, 12.0, 11.0, 12.0, 10.0, 8.0, 9.0, 9.0],
      [8.5, 7.5, 5.8, 6.2, 8.2, 6.8, 8.2, 8.3, 9.1, 7.8, 7.2, 6.2, 7.0, 7.2, 7.3, 8.0, 9.9, 9.0, 10.4, 9.6, 10.0, 10.3, 8.9, 9.8],
      OWN,
    ),
  },
  {
    key: "2023-07-12",
    label: "Jul 12, ozone",
    day: buildDay(
      "2023-07-12",
      [12.6, 13.6, 13.7, 14.3, 15.0, 18.6, 20.0, 19.8, 18.5, 17.8, 13.0, 10.8, 10.3, 10.7, 9.9, 14.3, 15.8, 15.8, 18.7, 19.8, 18.1, 17.8, 15.6, 13.9],
      [31.0, 25.0, 22.0, 29.0, 21.0, 22.0, 19.0, 40.0, 40.0, 47.0, 68.0, 83.0, 86.0, 85.0, 83.0, 84.0, 75.0, 71.0, 66.0, 55.0, 51.0, 42.0, 31.0, 22.0],
      [24.6, 26.1, 27.1, 25.4, 34.8, 35.1, 39.5, 34.9, 37.6, 33.7, 18.0, 7.8, 9.6, 5.4, 4.8, 7.8, 6.8, 9.9, 10.1, 16.1, 14.4, 18.7, 29.8, 32.7],
      OWN,
    ),
  },
  {
    key: "2023-02-09",
    label: "Feb 9, rush hour",
    day: buildDay(
      "2023-02-09",
      [14.2, 16.5, 15.3, 18.7, 18.8, 24.0, 27.1, 24.3, 17.9, 27.3, 22.6, 13.4, 6.9, 6.7, 7.5, 7.2, 5.9, 9.1, 8.0, 6.9, 8.6, 10.2, 10.5, 9.3],
      [0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 2.0, 22.0, 29.0, 29.0, 32.0, 33.0, 33.0, 30.0, 36.0, 39.0, 40.0, 42.0, 40.0],
      [51.6, 53.2, 52.1, 56.1, 60.0, 66.8, 70.4, 58.8, 50.2, 63.7, 55.3, 43.6, 19.8, 13.3, 12.0, 13.9, 15.0, 15.6, 21.0, 15.4, 14.1, 13.3, 11.4, 13.2],
      OWN,
    ),
  },
  {
    key: "2023-06-07",
    label: "Jun 7, the smoke",
    day: buildDay(
      "2023-06-07",
      [81.9, 75.4, 64.5, 65.6, 65.0, 63.5, 62.9, 65.5, 65.6, 59.8, 74.5, 161.2, 253.3, 269.7, 262.7, 174.0, 157.1, 161.2, 183.1, 183.2, 178.9, 172.2, 155.3, 154.4],
      [41.0, 43.0, 46.0, 44.0, 38.0, 33.0, 33.0, 32.0, 34.0, 38.0, 48.0, 46.0, 45.0, 38.0, 40.0, 37.0, 39.0, 40.0, 39.0, 39.0, 32.0, 30.0, 31.0, 29.0],
      [20.7, 18.6, 13.6, 22.9, 28.8, 34.6, 31.2, 27.9, 20.8, 20.1, 8.2, 10.5, 11.9, 16.1, 14.1, 13.2, 17.4, 16.4, 14.1, 13.8, 21.4, 21.8, 17.7, 18.8],
      OWN,
    ),
  },
  {
    key: "2023-06-07-brooklyn",
    label: "Jun 7, Brooklyn (O3, NO2 citywide)",
    day: buildDay(
      "2023-06-07",
      [112.4, 100.7, 105.9, 94.9, 85.8, 82.0, 78.8, 81.8, 78.5, 76.0, 96.4, 207.6, 330.4, 375.9, 384.0, 230.1, 206.8, 224.4, 239.7, 239.4, 243.4, 227.4, 212.9, 198.5],
      [37.0, 38.2, 39.8, 39.2, 37.5, 35.5, 33.5, 34.5, 35.5, 38.2, 45.2, 43.5, 41.2, 37.2, 35.8, 37.0, 39.2, 38.8, 36.8, 33.8, 31.0, 30.0, 28.8, 23.2],
      [14.2, 12.5, 9.7, 14.8, 19.6, 25.2, 23.4, 20.8, 14.2, 13.2, 8.6, 10.7, 11.8, 14.2, 13.6, 12.0, 13.4, 13.6, 12.8, 13.0, 16.9, 17.1, 14.6, 16.2],
      BROOKLYN,
    ),
  },
  {
    key: "2023-10-29-brooklyn",
    label: "Oct 29, Brooklyn (O3, NO2 citywide)",
    day: buildDay(
      "2023-10-29",
      [3.1, 3.2, 3.0, 2.6, 2.3, 1.9, 2.1, 2.1, 2.9, 3.2, 3.8, 3.8, 4.0, 3.7, 3.3, 3.6, 4.4, 4.6, 3.8, 6.2, 6.0, 5.3, 4.2, 3.7],
      [20.2, 21.0, 20.8, 20.0, 18.2, 17.8, 15.8, 13.2, 11.5, 11.2, 10.8, 11.0, 10.2, 10.8, 10.8, 10.8, 9.5, 8.5, 8.0, 7.0, 6.0, 5.2, 5.8, 6.0],
      [8.3, 6.5, 5.4, 5.3, 7.5, 6.7, 7.4, 7.6, 9.1, 7.9, 7.7, 6.9, 7.2, 7.5, 7.9, 8.6, 10.3, 10.3, 10.9, 10.4, 10.6, 10.9, 9.7, 10.0],
      BROOKLYN,
    ),
  },
];
