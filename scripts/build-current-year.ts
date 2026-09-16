// build-current-year.ts — the current year's static snapshot (D-41, 2026-09-15): public/data/{borough}-{year}.json for the year so far, the same flat HourReading[] shape as the archive years, so every day EPA has published is served from the CDN like the years before it and the EPA route is asked only for days newer than the snapshot.
// Run locally against the functions: npx tsx scripts/build-current-year.ts [baseUrl]   (default http://localhost:55995, a running `vercel dev`; the deployed URL works too). Month by month through the historical route, which does the EPA fetch, the borough transform and the typical-NO2 fill exactly as the page does, so the snapshot and the live route can never disagree. Re-run and commit when EPA publishes further; the loader treats the file's last day as the archive's edge.
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { BOROUGHS, type HourReading } from "../api/_lib/aqi";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "data");
const base = process.argv[2] ?? "http://localhost:55995";
const year = new Date().getFullYear();
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const slug = (b: string) => b.toLowerCase().replace(/ /g, "-");

interface Resp { status: string; days: Array<{ date: string; hours: HourReading[] }> }

async function month(borough: string, ym: string): Promise<HourReading[]> {
  const [y, m] = ym.split("-").map(Number);
  const last = `${ym}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;
  const to = last > yesterday ? yesterday : last;
  const from = `${ym}-01`;
  if (from > to) return [];
  const url = `${base}/api/aqi/historical?borough=${encodeURIComponent(borough)}&from=${from}&to=${to}`;
  const started = Date.now();
  const res = await fetch(url, { signal: AbortSignal.timeout(290000) });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  const json = (await res.json()) as Resp;
  const hours = json.days.flatMap((d) => d.hours);
  console.log(`${borough.padEnd(13)} ${ym}  ${String(json.days.length).padStart(2)} days  ${String(hours.length).padStart(4)} h  ${((Date.now() - started) / 1000).toFixed(0)}s`);
  return hours;
}

async function main() {
  const now = new Date();
  const months = Array.from({ length: now.getMonth() + 1 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  for (const borough of [...BOROUGHS, "Citywide"]) {
    const hours: HourReading[] = [];
    for (const ym of months) hours.push(...(await month(borough, ym)));
    hours.sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
    // Trailing hours with nothing reported are not the archive's edge: trim them so the file's last day is a day with data.
    while (hours.length && hours[hours.length - 1].pm25 == null && hours[hours.length - 1].o3 == null) hours.pop();
    const file = join(OUT, `${slug(borough)}-${year}.json`);
    writeFileSync(file, JSON.stringify(hours));
    console.log(`→ ${file}  ${hours.length} hours, last ${hours.length ? hours[hours.length - 1].ts.slice(0, 10) : "—"}`);
  }
}
main().catch((e) => { console.error(String(e)); process.exit(1); });
