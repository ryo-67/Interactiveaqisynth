// channelSource — which channels a day borrows, read from the hour records' source flags, never from a hardcoded list (D-16, D-18). A channel is borrowed when the borough never reports it itself and carries the citywide value; live NO₂ arrives flagged typical. The graph's tabs and the monitor cards' source pills carry the word beside the channel (D-56, 2026-09-16: "disclosed where the channel is shown"); the About overlay holds the full account.
import type { Day } from "../engine/SynthEngine";
import { SOURCE_SUFFIX_CITYWIDE, SOURCE_SUFFIX_TYPICAL } from "../content";

export type Channel = "pm25" | "o3" | "no2";
export type ChannelSuffix = Partial<Record<Channel, string>>;

export const CHANNELS: readonly Channel[] = ["pm25", "o3", "no2"];

// Both facts about each channel, read once from the tags of the hours that carry it: typical when any hour is the archive's typical profile (D-18), borrowed when the borough never reports it itself and carries the citywide value (D-16). The graph's suffix and the source line are both built on this, so they cannot disagree about a day.
export function channelProvenance(hours: Day): Record<Channel, { typical: boolean; borrowed: boolean }> {
  const out = {} as Record<Channel, { typical: boolean; borrowed: boolean }>;
  for (const ch of CHANNELS) {
    const tags = hours.filter((h) => h[ch] != null).map((h) => h.source[ch]);
    out[ch] = { typical: tags.includes("typical"), borrowed: !tags.includes("own") && tags.includes("citywide") };
  }
  return out;
}

// The one word beside a channel on the graph's tab and the monitor's source pill: typical wins over citywide, since live NO2 is both and the profile is the stronger disclosure.
export function channelSuffixes(hours: Day): ChannelSuffix {
  const out: ChannelSuffix = {};
  for (const [ch, p] of Object.entries(channelProvenance(hours)) as Array<[Channel, { typical: boolean; borrowed: boolean }]>) {
    if (p.typical) out[ch] = SOURCE_SUFFIX_TYPICAL;
    else if (p.borrowed) out[ch] = SOURCE_SUFFIX_CITYWIDE;
  }
  return out;
}
