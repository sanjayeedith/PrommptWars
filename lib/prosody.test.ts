import { describe, expect, it } from "vitest";
import { appendReading, distressLevel, readingFrom, topEmotions } from "./prosody";

const scores = { Joy: 0.1, Anxiety: 0.82, Calmness: 0.4, Fear: 0.55, Boredom: 0.02 };

describe("topEmotions", () => {
  it("returns the highest scoring emotions in descending order", () => {
    expect(topEmotions(scores, 2).map((e) => e.name)).toEqual(["Anxiety", "Fear"]);
  });

  it("handles missing scores", () => {
    expect(topEmotions(undefined)).toEqual([]);
  });
});

describe("distressLevel", () => {
  it("takes the peak across distress emotions", () => {
    expect(distressLevel(scores)).toBeCloseTo(0.82);
  });

  it("is zero when nothing distressing is present", () => {
    expect(distressLevel({ Joy: 0.9, Calmness: 0.8 })).toBe(0);
  });
});

describe("appendReading", () => {
  it("caps the buffer so a long session cannot grow unbounded", () => {
    let buffer = [readingFrom(scores, 0)];
    for (let i = 1; i < 200; i += 1) {
      buffer = appendReading(buffer, readingFrom(scores, i), 60);
    }
    expect(buffer).toHaveLength(60);
    expect(buffer.at(-1)?.at).toBe(199);
  });
});
