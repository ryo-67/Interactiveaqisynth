// channelSource — which channels a day borrows, read from the hour records' source flags, never from a hardcoded list (D-16, D-18). A channel is borrowed when the borough never reports it itself and carries the citywide value; live NO₂ arrives flagged typical. The graph's tabs and the monitor cards' source pills carry the word beside the channel (D-56, 2026-09-16: "disclosed where the channel is shown"); the About overlay holds the full account.
import type { Day } from "../engine/SynthEngine";
import { SOURCE_SUFFIX_CITYWIDE, SOURCE_SUFFIX_TYPICAL } from "../content";

export type Channel = "pm25" | "o3" | "no2";
export type ChannelSuffix = Partial<Record<Channel, string>>;

export function channelSuffixes(hours: Day): ChannelSuffix {
  const out: ChannelSuffix = {};
  for (const ch of ["pm25", "o3", "no2"] as Channel[]) {
    const tags = hours.filter((h) => h[ch] != null).map((h) => h.source[ch]);
    if (tags.some((t) => t === "typical")) out[ch] = SOURCE_SUFFIX_TYPICAL;
    else if (tags.length && !tags.some((t) => t === "own") && tags.some((t) => t === "citywide")) out[ch] = SOURCE_SUFFIX_CITYWIDE;
  }
  return out;
}
