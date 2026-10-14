import { describe, it, expect } from "vitest";
import { BOROUGHS, ARCHIVE_LAST_DATE } from "./nycOpenData";
import type { HourReading } from "../engine/SynthEngine";

// getArchiveLastDate and getLatestAvailableDate answer with the hold without downloading the snapshot (2026-10-14). That is only right while every borough's snapshot of the hold's year runs at least to the hold, which this checks against the committed files.
const files = import.meta.glob<HourReading[]>("../../public/data/*.json", { import: "default" }); // lazy: only the hold year's six are loaded

describe("the archive hold (ARCHIVE_LAST_DATE)", () => {
  const year = ARCHIVE_LAST_DATE.slice(0, 4);
  for (const b of BOROUGHS) {
    it(`is covered by ${b}'s ${year} snapshot`, async () => {
      const load = files[`../../public/data/${b.toLowerCase().replace(/ /g, "-")}-${year}.json`];
      expect(load).toBeDefined();
      const hours = await load();
      expect(hours.length).toBeGreaterThan(0);
      expect(hours[hours.length - 1].ts.slice(0, 10) >= ARCHIVE_LAST_DATE).toBe(true);
    });
  }
});
