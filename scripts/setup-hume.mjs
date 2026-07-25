/**
 * One-shot provisioning of Anchor's EVI tools and configuration on Hume.
 *
 * Reads the tool contract from lib/tools/hume-tools.json so the deployed
 * config and the runtime validator stay on one definition. Prints the config
 * ID to paste into NEXT_PUBLIC_HUME_CONFIG_ID.
 *
 * Usage: npm run setup:hume
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HUME_API = "https://api.hume.ai/v0/evi";
const here = dirname(fileURLToPath(import.meta.url));

const apiKey = process.env.HUME_API_KEY;
if (!apiKey) {
  console.error("HUME_API_KEY is not set. Add it to .env and re-run.");
  process.exit(1);
}

const spec = JSON.parse(
  readFileSync(resolve(here, "../lib/tools/hume-tools.json"), "utf8"),
);

async function humePost(path, body) {
  const response = await fetch(`${HUME_API}${path}`, {
    method: "POST",
    headers: { "X-Hume-Api-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`POST ${path} failed (${response.status}): ${text}`);
  }
  return JSON.parse(text);
}

async function main() {
  const toolIds = [];

  for (const tool of spec.tools) {
    const created = await humePost("/tools", {
      name: tool.name,
      description: tool.description,
      fallback_content: tool.fallback_content,
      // Hume expects the JSON Schema as a serialised string, not an object.
      parameters: JSON.stringify(tool.parameters),
    });
    toolIds.push({ id: created.id });
    console.log(`  created tool ${tool.name} -> ${created.id}`);
  }

  const config = await humePost("/configs", {
    evi_version: "3",
    name: spec.configName,
    voice: { name: "Male English Actor", provider: "HUME_AI" },
    language_model: {
      model_provider: "ANTHROPIC",
      model_resource: "claude-sonnet-4-5-20250929",
    },
    prompt: { text: spec.systemPrompt },
    tools: toolIds,
  });

  console.log("\nConfig created. Add this to your .env file:\n");
  console.log(`NEXT_PUBLIC_HUME_CONFIG_ID=${config.id}\n`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
