/**
 * Pure translation of an EVI tool call into a screen change.
 *
 * This is the heart of the application and it is deliberately free of React,
 * network access, and browser globals: given a tool name, the raw parameter
 * string, and a snapshot of what we know about the user, it returns the panel
 * to render and the line EVI should say. That makes every intervention
 * directly unit-testable without mounting a component or opening a socket.
 */

import { getResource, type Resource } from "../resources";
import { toPlainText } from "../sanitize";
import { toolSchemas, type ToolName } from "./registry";

export type SupportContact = { name: string; phone: string | null };

export type DispatchContext = {
  reasons: string[];
  contacts: SupportContact[];
};

export type StagePanel =
  | { kind: "idle" }
  | { kind: "grounding"; technique: "box_breathing" | "five_senses"; seconds: number }
  | { kind: "urge_surf"; minutes: number; reassurance: string }
  | { kind: "why"; reasons: string[] }
  | { kind: "script"; situation: string; scriptText: string; sendTo: string }
  | { kind: "contact"; who: string; phone: string | null; message: string }
  | { kind: "resource"; resource: Resource };

export type ToolFailure = {
  error: string;
  code: string;
  level: "warn" | "error";
  content: string;
};

export type DispatchResult =
  | {
      ok: true;
      panel: StagePanel;
      /** Short confirmation returned to EVI so it can narrate what appeared. */
      speech: string;
      remember?: { fact: string; category: string };
    }
  | { ok: false; error: ToolFailure };

function fail(code: string, content: string): DispatchResult {
  return { ok: false, error: { error: code, code, level: "warn", content } };
}

/** Case-insensitive lookup so "my sister" still matches a contact named "Sister". */
function findContact(contacts: SupportContact[], who: string): SupportContact | null {
  const needle = who.toLowerCase();
  return (
    contacts.find((c) => c.name.toLowerCase() === needle) ??
    contacts.find(
      (c) => needle.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(needle),
    ) ??
    null
  );
}

/**
 * Validates and executes a tool call.
 *
 * Unknown tools and malformed parameters both fail closed with a tool error,
 * which EVI turns into speech rather than silence.
 */
export function dispatchTool(
  name: string,
  rawParameters: string,
  ctx: DispatchContext,
): DispatchResult {
  if (!(name in toolSchemas)) {
    return fail("tool_not_found", "That tool is not available.");
  }

  let parsedJson: unknown;
  try {
    parsedJson = rawParameters ? JSON.parse(rawParameters) : {};
  } catch {
    return fail("malformed_parameters", "The tool arguments could not be read.");
  }

  const schema = toolSchemas[name as ToolName];
  const parsed = schema.safeParse(parsedJson);
  if (!parsed.success) {
    return fail("invalid_parameters", "The tool arguments were missing something required.");
  }

  switch (name as ToolName) {
    case "start_grounding": {
      const { technique, seconds } = parsed.data as { technique: "box_breathing" | "five_senses"; seconds: number };
      return {
        ok: true,
        panel: { kind: "grounding", technique, seconds },
        speech:
          technique === "box_breathing"
            ? "A breathing pacer is on their screen. Breathe with them, do not talk over it."
            : "A five senses exercise is on their screen. Walk them through it slowly.",
      };
    }

    case "start_urge_surf": {
      const { minutes, reassurance } = parsed.data as { minutes: number; reassurance: string };
      return {
        ok: true,
        panel: { kind: "urge_surf", minutes, reassurance: toPlainText(reassurance, 300) },
        speech: `A ${minutes} minute timer is running on their screen. Stay with them while it counts down.`,
      };
    }

    case "recall_my_why": {
      if (ctx.reasons.length === 0) {
        return {
          ok: true,
          panel: { kind: "idle" },
          speech:
            "Nothing is saved yet. Ask them what made them want to change, then save it with remember_this.",
        };
      }
      return {
        ok: true,
        panel: { kind: "why", reasons: ctx.reasons },
        speech: `Their own reasons are on screen: ${ctx.reasons.join("; ")}. Read one back gently.`,
      };
    }

    case "write_emergency_script": {
      const { situation, script_text, send_to } = parsed.data as {
        situation: string;
        script_text: string;
        send_to: string;
      };
      return {
        ok: true,
        panel: {
          kind: "script",
          situation: toPlainText(situation, 200),
          scriptText: toPlainText(script_text, 2000),
          sendTo: toPlainText(send_to, 120),
        },
        speech:
          "The script is on their screen, ready to send. Tell them it is there and that they can use it whenever they are ready. Do not read it aloud.",
      };
    }

    case "reach_support_person": {
      const { who, prewritten_message } = parsed.data as {
        who: string;
        prewritten_message: string;
      };
      const match = findContact(ctx.contacts, who);
      return {
        ok: true,
        panel: {
          kind: "contact",
          who: toPlainText(match?.name ?? who, 120),
          phone: match?.phone ?? null,
          message: toPlainText(prewritten_message, 900),
        },
        speech: match?.phone
          ? `${match.name} is on their screen with a call button and the message ready to send.`
          : `The message is on screen, but no number is saved for ${who}. Offer to save one.`,
      };
    }

    case "show_resource": {
      const { topic } = parsed.data as { topic: string };
      const resource = getResource(topic);
      if (!resource) return fail("unknown_topic", "That resource is not in the library.");
      return {
        ok: true,
        panel: { kind: "resource", resource },
        speech: `"${resource.title}" is on their screen. Summarise it in one sentence, do not add facts of your own.`,
      };
    }

    case "remember_this": {
      const { fact, category } = parsed.data as { fact: string; category: string };
      return {
        ok: true,
        panel: { kind: "idle" },
        speech: "Saved. Do not make a point of it, just keep talking.",
        remember: { fact: toPlainText(fact, 500), category },
      };
    }
  }
}
