import { describe, expect, it } from "vitest";
import { smsHref, telHref, toPlainText } from "./sanitize";

describe("toPlainText", () => {
  it("strips control characters and trims", () => {
    expect(toPlainText("  hi\u0000 there  ")).toBe("hi there");
  });

  it("bounds the length", () => {
    expect(toPlainText("a".repeat(5000), 10)).toHaveLength(10);
  });

  it("returns an empty string for non-strings", () => {
    expect(toPlainText(undefined)).toBe("");
    expect(toPlainText({ evil: true })).toBe("");
  });
});

describe("telHref", () => {
  it("builds a tel href from a formatted number", () => {
    expect(telHref("+1 (555) 123-4567")).toBe("tel:+15551234567");
  });

  it("refuses a javascript payload rather than passing it through", () => {
    expect(telHref("javascript:alert(1)")).toBeNull();
  });

  it("refuses obviously invalid lengths", () => {
    expect(telHref("12")).toBeNull();
    expect(telHref("1".repeat(20))).toBeNull();
  });
});

describe("smsHref", () => {
  it("encodes the message body", () => {
    const href = smsHref("5551234567", "I need help & a ride");
    expect(href).toContain("sms:5551234567");
    expect(href).toContain("%26");
  });

  it("returns null when the number is unusable", () => {
    expect(smsHref("nope", "hi")).toBeNull();
  });
});
