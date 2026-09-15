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

// "2:00 pm"; with the date "Sep 14, 2:00 pm"; from an earlier year "Jun 7, 2023, 4:00 am".
export function readingLabel(ts: string, withDate: boolean): string {
  const h = hourOfTs(ts);
  const time = `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? "am" : "pm"}`;
  if (!withDate) return time;
  const year = Number(ts.slice(0, 4)), month = Number(ts.slice(5, 7)), day = Number(ts.slice(8, 10));
  const date = `${MONTHS[month - 1]} ${day}${year < nyYear() ? `, ${year}` : ""}`;
  return `${date}, ${time}`;
}
