import { afterEach, describe, expect, it, vi } from "vitest";
import { clientIp, optionalSupermemoryKey, rateLimit } from "./rate-limit";

/**
 * The limiter guards the token and memory routes, which spend real money and
 * real third-party quota. These cover the boundaries that decide whether a
 * request is let through, since an off-by-one here is either an outage or a bill.
 */

afterEach(() => {
  vi.useRealTimers();
});

function request(headers: Record<string, string> = {}): Request {
  return new Request("https://example.test/api", { method: "POST", headers });
}

describe("rateLimit", () => {
  it("allows requests up to the limit and rejects the one after", () => {
    const ip = `ip-${Math.random()}`;
    for (let i = 0; i < 3; i += 1) {
      expect(rateLimit(ip, 3, 60_000, "test-limit")).toBe(true);
    }
    expect(rateLimit(ip, 3, 60_000, "test-limit")).toBe(false);
  });

  it("keeps separate counters per bucket", () => {
    const ip = `ip-${Math.random()}`;
    expect(rateLimit(ip, 1, 60_000, "bucket-a")).toBe(true);
    expect(rateLimit(ip, 1, 60_000, "bucket-a")).toBe(false);
    // A different bucket for the same IP starts fresh.
    expect(rateLimit(ip, 1, 60_000, "bucket-b")).toBe(true);
  });

  it("keeps separate counters per IP", () => {
    const suffix = Math.random();
    expect(rateLimit(`a-${suffix}`, 1, 60_000, "per-ip")).toBe(true);
    expect(rateLimit(`a-${suffix}`, 1, 60_000, "per-ip")).toBe(false);
    expect(rateLimit(`b-${suffix}`, 1, 60_000, "per-ip")).toBe(true);
  });

  it("lets the caller through again once the window has elapsed", () => {
    vi.useFakeTimers();
    const ip = `ip-${Math.random()}`;
    expect(rateLimit(ip, 1, 1_000, "window")).toBe(true);
    expect(rateLimit(ip, 1, 1_000, "window")).toBe(false);

    vi.advanceTimersByTime(1_001);
    expect(rateLimit(ip, 1, 1_000, "window")).toBe(true);
  });
});

describe("clientIp", () => {
  it("uses the first entry of x-forwarded-for", () => {
    expect(clientIp(request({ "x-forwarded-for": "203.0.113.7, 70.41.3.18" }))).toBe("203.0.113.7");
  });

  it("trims surrounding whitespace", () => {
    expect(clientIp(request({ "x-forwarded-for": "  203.0.113.7  " }))).toBe("203.0.113.7");
  });

  it("falls back to a local sentinel when the header is absent", () => {
    expect(clientIp(request())).toBe("local");
  });
});

describe("optionalSupermemoryKey", () => {
  it("returns a plausible key", () => {
    const key = "sm_abcdefghijklmnop";
    expect(optionalSupermemoryKey(request({ "x-supermemory-key": key }))).toBe(key);
  });

  it("ignores a missing header", () => {
    expect(optionalSupermemoryKey(request())).toBeUndefined();
  });

  it("rejects a key that is too short to be real", () => {
    expect(optionalSupermemoryKey(request({ "x-supermemory-key": "short" }))).toBeUndefined();
  });

  it("rejects an absurdly long key rather than forwarding it", () => {
    const oversized = "s".repeat(201);
    expect(optionalSupermemoryKey(request({ "x-supermemory-key": oversized }))).toBeUndefined();
  });

  it("treats a whitespace-only header as absent", () => {
    expect(optionalSupermemoryKey(request({ "x-supermemory-key": "   " }))).toBeUndefined();
  });
});
