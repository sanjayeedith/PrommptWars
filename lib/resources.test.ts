import { describe, expect, it } from "vitest";
import { getResource, RESOURCES, RESOURCE_TOPICS, type ResourceTopic } from "./resources";

/**
 * This library is the only place the app is allowed to state a health fact, so
 * these tests guard the boundary rather than the prose: every advertised topic
 * must resolve, unknown input must fail closed, and no entry may be empty —
 * a blank card would leave someone at overdose risk staring at nothing.
 */

describe("getResource", () => {
  it.each(RESOURCE_TOPICS)("resolves the %s topic", (topic) => {
    const resource = getResource(topic);
    expect(resource).not.toBeNull();
    expect(resource?.topic).toBe(topic);
  });

  it("returns null for an unknown topic rather than guessing a neighbour", () => {
    expect(getResource("fentanyl_dosage")).toBeNull();
  });

  it.each([
    ["a number", 42],
    ["null", null],
    ["undefined", undefined],
    ["an object", { topic: "naloxone" }],
  ])("returns null for %s", (_label, input) => {
    expect(getResource(input)).toBeNull();
  });

  it("does not resolve inherited Object properties", () => {
    // A bare `RESOURCES[topic]` lookup would hand back Object.prototype members.
    expect(getResource("constructor")).toBeNull();
    expect(getResource("toString")).toBeNull();
  });
});

describe("resource content", () => {
  it("exposes exactly the topics the tool enum advertises", () => {
    expect(Object.keys(RESOURCES).sort()).toEqual([...RESOURCE_TOPICS].sort());
  });

  it.each(RESOURCE_TOPICS)("gives %s a title, summary, points and a source", (topic) => {
    const resource = RESOURCES[topic as ResourceTopic];
    expect(resource.title.trim().length).toBeGreaterThan(0);
    expect(resource.summary.trim().length).toBeGreaterThan(0);
    expect(resource.source.trim().length).toBeGreaterThan(0);
    expect(resource.points.length).toBeGreaterThan(0);
    for (const point of resource.points) {
      expect(point.trim().length).toBeGreaterThan(0);
    }
  });

  it("keeps the never_use_alone hotline number intact", () => {
    // This number is the difference between a witnessed and an unwitnessed
    // overdose, so it is asserted explicitly rather than left to prose review.
    expect(RESOURCES.never_use_alone.points.join(" ")).toContain("1-800-484-3731");
  });
});
