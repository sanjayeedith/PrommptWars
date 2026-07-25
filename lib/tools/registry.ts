/**
 * Runtime validation schemas for Anchor's EVI tools.
 *
 * The contract EVI is told about lives in `hume-tools.json`, which
 * `scripts/setup-hume.mjs` uploads to Hume. The zod schemas here validate what
 * actually arrives over the socket. `registry.test.ts` fails if the two ever
 * drift apart, so the tool list cannot silently diverge from the deployed config.
 */

import { z } from "zod";
import { RESOURCE_TOPICS } from "../resources";
import { MEMORY_CATEGORIES } from "../categories";

export const TOOL_NAMES = [
  "start_grounding",
  "start_urge_surf",
  "recall_my_why",
  "write_emergency_script",
  "reach_support_person",
  "show_resource",
  "remember_this",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

export const toolSchemas = {
  start_grounding: z.object({
    technique: z.enum(["box_breathing", "five_senses"]),
    seconds: z.number().int().min(30).max(600).default(120),
  }),
  start_urge_surf: z.object({
    minutes: z.number().int().min(1).max(30).default(10),
    reassurance: z.string().max(300).default(""),
  }),
  recall_my_why: z.object({}),
  write_emergency_script: z.object({
    situation: z.string().min(1).max(200),
    script_text: z.string().min(1).max(2000),
    send_to: z.string().max(120).default(""),
  }),
  reach_support_person: z.object({
    who: z.string().min(1).max(120),
    prewritten_message: z.string().min(1).max(900),
  }),
  show_resource: z.object({
    topic: z.enum(RESOURCE_TOPICS),
  }),
  remember_this: z.object({
    fact: z.string().min(1).max(500),
    category: z.enum(MEMORY_CATEGORIES),
  }),
} satisfies Record<ToolName, z.ZodTypeAny>;
