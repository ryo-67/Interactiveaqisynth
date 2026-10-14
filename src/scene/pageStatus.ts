// The page's status (2026-10-14): what the one line above the footer says (D-69), as one value with its priority order written once. Before, the session exposed five flags (soundFailed, dayFailed, dayWaiting, liveEmpty and the live status) and ScenePage ordered them itself, so any combination of them could be represented whether or not the page could show it.
// In order: sound that did not start (the visitor just pressed Play), a chosen day that did not arrive, the live feed's own line while it is asked or unreachable (LiveStatus, D-60), a chosen day still on its way, and a live answer with nothing measured in it.
import type { Mock } from "../utils/mock";

export type PageStatus =
  | { kind: "no-sound" } // Play was pressed and the audio did not start: the button went back to Play
  | { kind: "day-failed"; date: string } // the chosen day did not arrive (the archive file or the EPA month failed)
  | { kind: "live-feed" } // live, and AirNow has not answered or could not be reached: LiveStatus says which
  | { kind: "day-waiting"; date: string } // the chosen day has been loading longer than a beat (a current-year day from EPA can take a minute)
  | { kind: "no-readings" } // live answered, with no measured PM2.5 or ozone in any hour (the typical NO2 alone is not a reading)
  | { kind: "none" };

export interface StatusInputs {
  soundFailed: boolean;
  date: string | null; // the chosen day; null on live
  dayFailed: boolean;
  dayWaiting: boolean;
  live: boolean;
  liveStatus: "loading" | "ready" | "unavailable";
  liveEmpty: boolean;
}

export function pageStatus(i: StatusInputs): PageStatus {
  if (i.soundFailed) return { kind: "no-sound" };
  if (i.date != null && i.dayFailed) return { kind: "day-failed", date: i.date };
  if (i.live && i.liveStatus !== "ready") return { kind: "live-feed" };
  if (i.date != null && i.dayWaiting) return { kind: "day-waiting", date: i.date };
  if (i.live && i.liveEmpty) return { kind: "no-readings" };
  return { kind: "none" };
}

// ?mock=<name> on the dev server (utils/mock.ts) forces a pill state outright, over whatever the page is really in. Without a chosen day, a mocked day state names a day that fits it: the Wildfire pin for a failure, a current-year day past the snapshot for the EPA wait. The screen mocks (a crash, no WebGL) replace the page in main.tsx and have no line here.
export function mockStatus(mock: Mock | null, date: string | null): PageStatus | null {
  switch (mock) {
    case "no-sound": return { kind: "no-sound" };
    case "day-failed": return { kind: "day-failed", date: date ?? "2023-06-07" };
    case "day-loading": return { kind: "day-waiting", date: date ?? "2026-08-03" };
    case "no-readings": return { kind: "no-readings" };
    default: return null;
  }
}
