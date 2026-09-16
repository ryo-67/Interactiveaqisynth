import { describe, expect, it } from "vitest";
import { splitTwoLines } from "./MoodLine";
import { MOOD_SENTENCES } from "../content";

describe("splitTwoLines", () => {
  it("every mood sentence becomes two lines of at least two words, nothing lost", () => {
    for (const s of MOOD_SENTENCES) {
      const [a, b] = splitTwoLines(s);
      expect(`${a} ${b}`).toBe(s);
      expect(a.split(" ").length).toBeGreaterThanOrEqual(2);
      expect(b.split(" ").length).toBeGreaterThanOrEqual(2);
    }
  });
  it("balances when the floor is off", () => {
    expect(splitTwoLines("one two three four five six", 0)).toEqual(["one two three", "four five six"]);
  });
  it("gives the first line the floor where the sentence allows it, else the longest first line with two words left", () => {
    expect(splitTwoLines("The piece is still the piece, and that is the problem.")).toEqual(["The piece is still the piece,", "and that is the problem."]);
    expect(splitTwoLines("The day has a grip on the music now.")).toEqual(["The day has a grip on the", "music now."]);
    expect(splitTwoLines("The air is doing almost nothing, and the piece does almost nothing with it.")).toEqual(["The air is doing almost nothing, and", "the piece does almost nothing with it."]);
  });
  it("leaves a sentence under four words on one line", () => {
    expect(splitTwoLines("too short here")).toEqual(["too short here", ""]);
  });
});
