import { describe, expect, it } from "vitest";
import { dispatchTool, type DispatchContext } from "./dispatch";

const ctx: DispatchContext = {
  reasons: ["I want to be at my daughter's graduation"],
  contacts: [{ name: "Sister", phone: "+15551234567" }],
};

const emptyCtx: DispatchContext = { reasons: [], contacts: [] };

describe("dispatchTool guard rails", () => {
  it("fails closed on an unknown tool", () => {
    const result = dispatchTool("delete_everything", "{}", ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("tool_not_found");
  });

  it("fails closed on malformed JSON rather than throwing", () => {
    const result = dispatchTool("start_grounding", "{not json", ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("malformed_parameters");
  });

  it("rejects parameters that violate the schema", () => {
    const result = dispatchTool("start_grounding", '{"technique":"hypnosis"}', ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("invalid_parameters");
  });

  it("rejects an out-of-range urge surf duration", () => {
    const result = dispatchTool("start_urge_surf", '{"minutes":999}', ctx);
    expect(result.ok).toBe(false);
  });
});

describe("interventions", () => {
  it("opens the breathing pacer with a default duration", () => {
    const result = dispatchTool("start_grounding", '{"technique":"box_breathing"}', ctx);
    expect(result.ok).toBe(true);
    if (result.ok && result.panel.kind === "grounding") {
      expect(result.panel.technique).toBe("box_breathing");
      expect(result.panel.seconds).toBe(120);
    }
  });

  it("surfaces the user's own saved reasons", () => {
    const result = dispatchTool("recall_my_why", "{}", ctx);
    expect(result.ok).toBe(true);
    if (result.ok && result.panel.kind === "why") {
      expect(result.panel.reasons).toEqual(ctx.reasons);
    }
  });

  it("degrades gracefully when no reasons are saved yet", () => {
    const result = dispatchTool("recall_my_why", "{}", emptyCtx);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.panel.kind).toBe("idle");
  });

  it("renders the full script text verbatim", () => {
    const script = "Hey, I need to leave. Can you call me in five minutes?";
    const result = dispatchTool(
      "write_emergency_script",
      JSON.stringify({ situation: "Leaving the party", script_text: script }),
      ctx,
    );
    expect(result.ok).toBe(true);
    if (result.ok && result.panel.kind === "script") {
      expect(result.panel.scriptText).toBe(script);
    }
  });

  it("tells EVI not to read the script aloud", () => {
    const result = dispatchTool(
      "write_emergency_script",
      JSON.stringify({ situation: "x", script_text: "y" }),
      ctx,
    );
    if (result.ok) expect(result.speech).toMatch(/not read it aloud/i);
  });

  it("matches a support person loosely and attaches their number", () => {
    const result = dispatchTool(
      "reach_support_person",
      JSON.stringify({ who: "my sister", prewritten_message: "I need help." }),
      ctx,
    );
    expect(result.ok).toBe(true);
    if (result.ok && result.panel.kind === "contact") {
      expect(result.panel.phone).toBe("+15551234567");
    }
  });

  it("still shows the message when no number is on file", () => {
    const result = dispatchTool(
      "reach_support_person",
      JSON.stringify({ who: "Dad", prewritten_message: "I'm struggling." }),
      emptyCtx,
    );
    expect(result.ok).toBe(true);
    if (result.ok && result.panel.kind === "contact") {
      expect(result.panel.phone).toBeNull();
    }
  });

  it("serves vetted resource copy rather than model text", () => {
    const result = dispatchTool("show_resource", '{"topic":"tolerance_loss"}', ctx);
    expect(result.ok).toBe(true);
    if (result.ok && result.panel.kind === "resource") {
      expect(result.panel.resource.source).toBeTruthy();
      expect(result.panel.resource.points.length).toBeGreaterThan(0);
    }
  });

  it("refuses a resource topic outside the vetted library", () => {
    const result = dispatchTool("show_resource", '{"topic":"how_to_inject"}', ctx);
    expect(result.ok).toBe(false);
  });

  it("returns a memory write without changing the screen", () => {
    const result = dispatchTool(
      "remember_this",
      JSON.stringify({ fact: "Fridays after payday are hardest", category: "trigger" }),
      ctx,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.remember?.category).toBe("trigger");
      expect(result.panel.kind).toBe("idle");
    }
  });
});
