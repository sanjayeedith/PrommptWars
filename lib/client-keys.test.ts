import { beforeEach, describe, expect, it } from "vitest";
import {
  clearClientKeys,
  EMPTY_KEYS,
  hasVoiceKeys,
  maskSecret,
  readClientKeys,
  writeClientKeys,
} from "./client-keys";

/**
 * These keys are credentials a user pastes during a live demo. The behaviour
 * that matters is that a corrupted or half-written store degrades to "no keys"
 * instead of throwing, because a crash here takes the crisis UI down with it.
 */

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
}

let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  Object.defineProperty(globalThis, "window", {
    value: { sessionStorage: storage },
    configurable: true,
    writable: true,
  });
});

const FULL = {
  humeApiKey: "hume-api-key",
  humeSecretKey: "hume-secret-key",
  humeConfigId: "674000ad-93bb-48d2-a5ca-f654cae971cc",
  supermemoryApiKey: "sm_key",
};

describe("readClientKeys / writeClientKeys", () => {
  it("round-trips a full set of keys", () => {
    writeClientKeys(FULL);
    expect(readClientKeys()).toEqual(FULL);
  });

  it("returns empty keys when nothing has been stored", () => {
    expect(readClientKeys()).toEqual(EMPTY_KEYS);
  });

  it("returns empty keys when the stored value is not JSON", () => {
    storage.setItem("anchor.client-keys", "{not json");
    expect(readClientKeys()).toEqual(EMPTY_KEYS);
  });

  it("fills in missing fields rather than returning undefined", () => {
    storage.setItem(
      "anchor.client-keys",
      JSON.stringify({ humeApiKey: "only-this-one" }),
    );
    expect(readClientKeys()).toEqual({
      humeApiKey: "only-this-one",
      humeSecretKey: "",
      humeConfigId: "",
      supermemoryApiKey: "",
    });
  });

  it("coerces non-string stored values to strings", () => {
    storage.setItem(
      "anchor.client-keys",
      JSON.stringify({ humeApiKey: 12345 }),
    );
    expect(readClientKeys().humeApiKey).toBe("12345");
  });
});

describe("clearClientKeys", () => {
  it("removes previously written keys", () => {
    writeClientKeys(FULL);
    clearClientKeys();
    expect(readClientKeys()).toEqual(EMPTY_KEYS);
  });
});

describe("hasVoiceKeys", () => {
  it("is true only when api key, secret and config id are all present", () => {
    expect(hasVoiceKeys(FULL)).toBe(true);
  });

  it.each(["humeApiKey", "humeSecretKey", "humeConfigId"] as const)(
    "is false when %s is missing",
    (field) => {
      expect(hasVoiceKeys({ ...FULL, [field]: "" })).toBe(false);
    },
  );

  it("does not require the optional supermemory key", () => {
    expect(hasVoiceKeys({ ...FULL, supermemoryApiKey: "" })).toBe(true);
  });
});

describe("maskSecret", () => {
  it("shows only the first and last four characters of a long secret", () => {
    expect(maskSecret("abcdefghijklmnop")).toBe("abcd…mnop");
  });

  it("fully masks a short secret rather than revealing most of it", () => {
    expect(maskSecret("abcdefgh")).toBe("••••••••");
  });

  it("returns an empty string for an empty secret", () => {
    expect(maskSecret("")).toBe("");
  });
});
