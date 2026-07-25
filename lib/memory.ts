import "server-only";
import Supermemory from "supermemory";

/**
 * Supermemory access, kept server-side so the API key never reaches the browser.
 *
 * Every read is failure-tolerant by design. If Supermemory is slow or down the
 * user still gets a working companion with an empty profile, because losing
 * personalisation is acceptable and losing the crisis tool is not.
 */

export const MEMORY_CATEGORIES = [
  "trigger",
  "reason",
  "support_person",
  "coping",
  "win",
] as const;

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

export type SupportContact = { name: string; phone: string | null };

export type MemorySnapshot = {
  /** Prose injected into the EVI session as persistent context. */
  contextText: string;
  reasons: string[];
  triggers: string[];
  contacts: SupportContact[];
};

export const EMPTY_SNAPSHOT: MemorySnapshot = {
  contextText: "",
  reasons: [],
  triggers: [],
  contacts: [],
};

let client: Supermemory | null = null;
let clientKey: string | null = null;

function getClient(apiKeyOverride?: string): Supermemory | null {
  const key = apiKeyOverride || process.env.SUPERMEMORY_API_KEY;
  if (!key) return null;
  if (!client || clientKey !== key) {
    client = new Supermemory({ apiKey: key });
    clientKey = key;
  }
  return client;
}

const PHONE_IN_TEXT = /\+?[\d][\d\s().-]{6,}\d/;

/** Pulls a name and any embedded phone number out of a support-person memory. */
function parseContact(memory: string): SupportContact {
  const phoneMatch = memory.match(PHONE_IN_TEXT);
  const withoutPhone = phoneMatch ? memory.replace(phoneMatch[0], "") : memory;
  const name =
    withoutPhone.match(/(?:their|his|her|the)?\s*([A-Z][a-z]+)/)?.[1] ??
    withoutPhone.split(/[,.]/)[0]?.trim().slice(0, 40) ??
    "Support person";
  return { name, phone: phoneMatch ? phoneMatch[0].trim() : null };
}

type LooseResult = { memory?: string; content?: string; metadata?: Record<string, unknown> };

function textOf(result: LooseResult): string {
  return (result.memory ?? result.content ?? "").trim();
}

/**
 * Reads the user's profile and categorised memories in one pass.
 * Returns an empty snapshot rather than throwing when memory is unavailable.
 */
export async function readSnapshot(
  userId: string,
  apiKeyOverride?: string,
): Promise<MemorySnapshot> {
  const sm = getClient(apiKeyOverride);
  if (!sm) return EMPTY_SNAPSHOT;

  try {
    const [profile, search] = await Promise.allSettled([
      sm.profile({
        containerTag: userId,
        q: "triggers, reasons for recovery, support people, what has helped before",
      }),
      sm.search({
        q: "triggers, reasons for staying in recovery, support people, coping strategies",
        containerTag: userId,
        searchMode: "memories",
        limit: 30,
      }),
    ]);

    const contextParts: string[] = [];
    if (profile.status === "fulfilled") {
      const p = profile.value as {
        profile?: { static?: string[]; dynamic?: string[] };
      };
      contextParts.push(...(p.profile?.static ?? []), ...(p.profile?.dynamic ?? []));
    }

    const reasons: string[] = [];
    const triggers: string[] = [];
    const contacts: SupportContact[] = [];

    if (search.status === "fulfilled") {
      const results = ((search.value as { results?: LooseResult[] }).results ?? []).slice(0, 30);
      for (const result of results) {
        const text = textOf(result);
        if (!text) continue;
        const category = String(result.metadata?.category ?? "");
        if (category === "reason") reasons.push(text);
        else if (category === "trigger") triggers.push(text);
        else if (category === "support_person") contacts.push(parseContact(text));
        contextParts.push(text);
      }
    }

    const contextText = contextParts.length
      ? `What you already know about this person, from previous conversations. Use it naturally; never recite it back as a list.\n- ${contextParts
          .slice(0, 25)
          .join("\n- ")}`
      : "";

    return {
      contextText,
      reasons: reasons.slice(0, 6),
      triggers: triggers.slice(0, 6),
      contacts: contacts.slice(0, 5),
    };
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

/** Writes one memory. Resolves false on failure instead of throwing. */
export async function writeMemory(
  userId: string,
  content: string,
  category: string,
  apiKeyOverride?: string,
): Promise<boolean> {
  const sm = getClient(apiKeyOverride);
  if (!sm) return false;
  try {
    await sm.add({ content, containerTag: userId, metadata: { category } });
    return true;
  } catch {
    return false;
  }
}
