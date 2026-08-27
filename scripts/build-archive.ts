// build-archive.ts — the static hourly archive (DAT-02, SON-03; STRATEGY §4.3 layer 1).
// Run locally: npx tsx scripts/build-archive.ts. No API key: EPA AirData bulk zips only.
// Downloads hourly_{88101,88502,44201,42602}_{2020..2025}.zip into scripts/.cache/ (gitignored, ~1.5 GB, skipped when present), streams each CSV, keeps state 36 counties 005/047/061/081/085, runs the shared §4.4 transform per local day, and writes:
//   public/data/{borough}-{year}.json  — HourReading[] for the year, flat, ordered by ts
//   public/data/citywide-{year}.json
//   public/data/anchors.json           — p05/p95 per borough per pollutant over 2020–2025 (§3.10)
// Timezone: hours are keyed by America/New_York local time with UTC offset, taken straight from the files' Date Local/Time Local against Date GMT/Time GMT. DST days genuinely have 23 or 25 local hours and are kept that way — the phrase plays 23 or 25 beats those days; nothing is padded or dropped. The 8,760/8,784 count is a sanity check, not an assertion.

import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { existsSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  toBoroughHours,
  utcToNyIso,
  BOROUGHS,
  COUNTY_TO_BOROUGH,
  NY_STATE_FIPS,
  POLLUTANTS,
  type Borough,
  type HourReading,
  type Pollutant,
  type SiteHourRow,
} from "../api/_lib/aqi";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, "scripts", ".cache");
const OUT = join(ROOT, "public", "data");
const YEARS = [2020, 2021, 2022, 2023, 2024, 2025];
const PARAMS: Array<{ code: string; pollutant: Pollutant; toPpb: boolean }> = [
  { code: "88101", pollutant: "pm25", toPpb: false },
  { code: "88502", pollutant: "pm25", toPpb: false },
  { code: "44201", pollutant: "o3", toPpb: true }, // bulk files report O3 in ppm
  { code: "42602", pollutant: "no2", toPpb: false },
];
const COUNTIES = new Set(Object.keys(COUNTY_TO_BOROUGH));

function slug(name: string): string {
  return name.toLowerCase().replace(/ /g, "-");
}

async function download(url: string, dest: string): Promise<void> {
  if (existsSync(dest) && statSync(dest).size > 0) return;
  console.log(`  downloading ${url}`);
  execFileSync("curl", ["-sfL", "--retry", "3", "-o", dest, url], { stdio: "inherit" });
}

// Minimal CSV line parser handling quoted fields (state/county names contain commas).
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

// EPA bulk files report Date Local/Time Local in Local STANDARD Time year-round (no DST). One timestamp rule everywhere: derive the instant from the GMT fields and render true America/New_York wall clock with offset (utcToNyIso), so archive hours line up with AirNow's live labels and DST days keep their real 23/25 hours.
function offsetIso(_dateLocal: string, _timeLocal: string, dateGmt: string, timeGmt: string): string {
  const gmt = Date.UTC(+dateGmt.slice(0, 4), +dateGmt.slice(5, 7) - 1, +dateGmt.slice(8, 10), +timeGmt.slice(0, 2), +timeGmt.slice(3, 5));
  return utcToNyIso(new Date(gmt));
}

async function parseZip(zipPath: string, pollutant: Pollutant, toPpb: boolean, sink: SiteHourRow[]): Promise<number> {
  const child = spawn("unzip", ["-p", zipPath]);
  const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });
  let header: string[] | null = null;
  let idx: Record<string, number> = {};
  let kept = 0;
  for await (const line of rl) {
    if (!header) {
      header = parseCsvLine(line);
      idx = Object.fromEntries(header.map((h, i) => [h.replace(/"/g, ""), i]));
      continue;
    }
    // cheap prefix filter before full parse: state code is the first field
    if (!line.startsWith('"36"') && !line.startsWith("36,")) continue;
    const f = parseCsvLine(line);
    const state = f[idx["State Code"]];
    const county = f[idx["County Code"]];
    if (state !== NY_STATE_FIPS || !COUNTIES.has(county)) continue;
    const raw = f[idx["Sample Measurement"]];
    if (raw === "" || raw == null) continue;
    const value = Number(raw);
    if (!Number.isFinite(value)) continue;
    sink.push({
      stateFips: state,
      countyFips: county,
      pollutant,
      ts: offsetIso(f[idx["Date Local"]], f[idx["Time Local"]], f[idx["Date GMT"]], f[idx["Time GMT"]]),
      value: toPpb ? value * 1000 : value,
    });
    kept++;
  }
  await new Promise((resolve, reject) => {
    child.on("close", resolve);
    child.on("error", reject);
  });
  return kept;
}

async function main() {
  mkdirSync(CACHE, { recursive: true });
  mkdirSync(OUT, { recursive: true });

  // anchor accumulation: the borough's played distribution (own + D-16 substituted values), per §3.10
  const anchorVals = new Map<string, Map<Pollutant, number[]>>();
  for (const name of [...BOROUGHS, "Citywide"]) {
    anchorVals.set(name, new Map(POLLUTANTS.map((p) => [p, []])));
  }

  for (const year of YEARS) {
    console.log(`\n=== ${year} ===`);
    const rows: SiteHourRow[] = [];
    for (const { code, pollutant, toPpb } of PARAMS) {
      const zip = join(CACHE, `hourly_${code}_${year}.zip`);
      await download(`https://aqs.epa.gov/aqsweb/airdata/hourly_${code}_${year}.zip`, zip);
      const kept = await parseZip(zip, pollutant, toPpb, rows);
      console.log(`  ${code}: kept ${kept} NYC rows`);
    }

    // Group into local days, transform each day with its own axis (23–25 hours on DST days).
    const tsByDate = new Map<string, Set<string>>();
    for (const r of rows) {
      const date = r.ts.slice(0, 10);
      if (!tsByDate.has(date)) tsByDate.set(date, new Set());
      tsByDate.get(date)!.add(r.ts);
    }
    const rowsByDate = new Map<string, SiteHourRow[]>();
    for (const r of rows) {
      const date = r.ts.slice(0, 10);
      if (!rowsByDate.has(date)) rowsByDate.set(date, []);
      rowsByDate.get(date)!.push(r);
    }

    const perBorough = new Map<string, HourReading[]>();
    for (const name of [...BOROUGHS, "Citywide"]) perBorough.set(name, []);

    for (const date of [...tsByDate.keys()].sort()) {
      const axis = [...tsByDate.get(date)!].sort();
      const dayResult = toBoroughHours(rowsByDate.get(date)!, axis);
      for (const b of BOROUGHS) perBorough.get(b)!.push(...dayResult.boroughs[b].hours);
      perBorough.get("Citywide")!.push(...dayResult.citywide.hours);
    }

    for (const [name, hours] of perBorough) {
      const file = join(OUT, `${slug(name)}-${year}.json`);
      writeFileSync(file, JSON.stringify(hours));
      const gz = execFileSync("gzip", ["-9", "-c", file]).length;
      console.log(`  ${slug(name)}-${year}.json: ${hours.length} hours, ${(statSync(file).size / 1e6).toFixed(2)} MB raw, ${(gz / 1e3).toFixed(0)} KB gzipped`);
      const av = anchorVals.get(name)!;
      for (const h of hours) {
        for (const p of POLLUTANTS) if (h[p] != null) av.get(p)!.push(h[p] as number);
      }
    }
  }

  // anchors.json: p05/p95 per borough per pollutant over the whole archive (§3.10)
  const pct = (sorted: number[], q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  const anchors: Record<string, Record<Pollutant, { p05: number; p95: number }>> = {};
  for (const [name, byPollutant] of anchorVals) {
    anchors[name] = {} as Record<Pollutant, { p05: number; p95: number }>;
    for (const [p, vals] of byPollutant) {
      vals.sort((a, b) => a - b);
      anchors[name][p] = vals.length
        ? { p05: round1(pct(vals, 0.05)), p95: round1(pct(vals, 0.95)) }
        : { p05: 0, p95: 1 };
    }
  }
  writeFileSync(join(OUT, "anchors.json"), JSON.stringify(anchors, null, 2));
  console.log("\nanchors.json written:");
  console.log(JSON.stringify(anchors, null, 2));
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
