import { describe, expect, it } from "vitest";
import { addMemoryRequestSchema, profileRequestSchema } from "./schemas";

/**
 * These schemas are the only thing standing between an untrusted request body
 * and a third-party write. The privacy guarantee is that the identifier is an
 * opaque UUID, so the tests assert that anything else is refused.
 */

const VALID_UUID = "ce91f176-6d04-4f7e-aca9-51cbbd7210f1";

describe("profileRequestSchema", () => {
  it("accepts an opaque UUID", () => {
    expect(profileRequestSchema.safeParse({ userId: VALID_UUID }).success).toBe(true);
  });

  it.each([
    ["a human-readable handle", "sanjay-kumar"],
    ["an email address", "user@example.com"],
    ["an empty string", ""],
  ])("rejects %s as a user id", (_label, userId) => {
    expect(profileRequestSchema.safeParse({ userId }).success).toBe(false);
  });

  it("rejects a missing user id", () => {
    expect(profileRequestSchema.safeParse({}).success).toBe(false);
  });
});

describe("addMemoryRequestSchema", () => {
  const base = { userId: VALID_UUID, content: "Wants to stay sober for their daughter" };

  it.each(["trigger", "reason", "support_person", "coping", "win"])(
    "accepts the %s category",
    (category) => {
      expect(addMemoryRequestSchema.safeParse({ ...base, category }).success).toBe(true);
    },
  );

  it("rejects a category outside the known set", () => {
    expect(addMemoryRequestSchema.safeParse({ ...base, category: "diagnosis" }).success).toBe(
      false,
    );
  });

  it("rejects empty content", () => {
    expect(addMemoryRequestSchema.safeParse({ ...base, content: "", category: "win" }).success).toBe(
      false,
    );
  });

  it("accepts content at the 8000 character ceiling", () => {
    const content = "a".repeat(8000);
    expect(addMemoryRequestSchema.safeParse({ ...base, content, category: "win" }).success).toBe(
      true,
    );
  });

  it("rejects content past the ceiling instead of truncating it", () => {
    const content = "a".repeat(8001);
    expect(addMemoryRequestSchema.safeParse({ ...base, content, category: "win" }).success).toBe(
      false,
    );
  });
});
