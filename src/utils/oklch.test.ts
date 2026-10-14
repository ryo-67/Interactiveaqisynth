import { describe, it, expect } from "vitest";
import { oklchToHex } from "./oklch";

// Every colour oklchToHex returns over a grid of lightness, chroma (in and out of the sRGB gamut) and hue, folded into one FNV-1a hash. The hash was taken from the implementation that always searched for the gamut's edge (2026-10-14), so a faster path is checked against that output, colour for colour.
function gridHash(): { hash: string; count: number } {
  let h = 0x811c9dc5, count = 0;
  for (let i = 1; i <= 19; i++) for (let j = 0; j <= 18; j++) for (let k = 0; k < 24; k++) {
    const hex = oklchToHex({ L: i * 0.05, C: j * 0.02, h: k * 15 });
    for (let n = 0; n < hex.length; n++) { h ^= hex.charCodeAt(n); h = Math.imul(h, 0x01000193) >>> 0; }
    count++;
  }
  return { hash: h.toString(16), count };
}

describe("oklchToHex", () => {
  it("returns the same colours as the full gamut search did, in and out of gamut", () => {
    expect(gridHash()).toEqual({ hash: "55db8d68", count: 19 * 19 * 24 });
  });
});
