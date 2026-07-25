import { describe, expect, it } from "vitest";
import spec from "./hume-tools.json";
import { TOOL_NAMES, toolSchemas } from "./registry";

/**
 * Guards the seam between what EVI was told it can call and what we can
 * actually handle. A tool present in one and missing from the other would
 * fail silently at runtime, mid-crisis, so it fails loudly here instead.
 */
describe("tool contract", () => {
  const jsonNames = spec.tools.map((tool) => tool.name).sort();

  it("declares the same tools in JSON and in the validator", () => {
    expect(jsonNames).toEqual([...TOOL_NAMES].sort());
  });

  it("has a runtime schema for every uploaded tool", () => {
    for (const name of jsonNames) {
      expect(Object.keys(toolSchemas)).toContain(name);
    }
  });

  it("gives every tool fallback content so a failure becomes speech, not silence", () => {
    for (const tool of spec.tools) {
      expect(tool.fallback_content.length).toBeGreaterThan(0);
    }
  });

  it("instructs the model to write complete script text, not a summary", () => {
    const script = spec.tools.find((tool) => tool.name === "write_emergency_script");
    const description = script?.parameters.properties.script_text?.description ?? "";
    expect(description).toMatch(/COMPLETE/);
    expect(description).toMatch(/never a summary/i);
  });

  it("keeps the system prompt on a harm-reduction, non-shaming footing", () => {
    expect(spec.systemPrompt).toMatch(/never shame/i);
    expect(spec.systemPrompt).toMatch(/988/);
    expect(spec.systemPrompt).toMatch(/harm reduction/i);
  });
});
