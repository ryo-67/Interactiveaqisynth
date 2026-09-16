// time — reading timestamps as the page shows them. A reading's ts is an ISO local hour with its offset ("2026-09-14T14:00:00-04:00"); the hour and the label both come from that string, never from the array index (an archive day is indexed by clock hour, the live series is the last 24 published hours and starts wherever AirNow's window starts).

// The clock hour a reading belongs to, from its own timestamp.
export function hourOfTs(ts: string): number {
  return Number(ts.slice(11, 13));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// New York's current year, so a reading from this year drops the year and an older one keeps it.
function nyYear(): number {
  return Number(new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric" }).format(new Date()));
}

// "2pm"; with the date "Sep 14, 2pm"; from an earlier year "Jun 7, 2023, 4am". Hours only: the data is hourly, so minutes would be noise (2026-09-15).
// A date as "Oct 29": the hero's label for an archive day (2026-09-16).
export function shortDate(date: string): string {
  return `${MONTHS[Number(date.slice(5, 7)) - 1]} ${Number(date.slice(8, 10))}`;
}

export function readingLabel(ts: string, withDate: boolean): string {
  const h = hourOfTs(ts);
  const time = `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "am" : "pm"}`;
  if (!withDate) return time;
  const year = Number(ts.slice(0, 4)), month = Number(ts.slice(5, 7)), day = Number(ts.slice(8, 10));
  const date = `${MONTHS[month - 1]} ${day}${year < nyYear() ? `, ${year}` : ""}`;
  return `${date}, ${time}`;
}

// A non-finite value reaching an eased state would poison it for good (NaN eases to NaN). Each eased input refuses one and names itself here, once, so the source can be found rather than guessed.
const warned = new Set<string>();
export function warnOnce(name: string): void {
  if (warned.has(name)) return;
  warned.add(name);
  console.warn(`[scene] non-finite value for ${name}; holding the last value`);
}
