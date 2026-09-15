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
  it("splits at the word boundary nearest the middle", () => {
    const [a, b] = splitTwoLines("one two three four five six");
    expect([a, b]).toEqual(["one two three", "four five six"]);
  });
  it("leaves a sentence under four words on one line", () => {
    expect(splitTwoLines("too short here")).toEqual(["too short here", ""]);
  });
});
