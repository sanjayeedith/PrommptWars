/**
 * The categories a memory can be filed under.
 *
 * Kept in its own dependency-free module because three very different callers
 * need it: the server-only Supermemory client, the API request schemas, and the
 * EVI tool validator that runs in the browser. Importing it from `memory.ts`
 * would drag `server-only` into client and test code, and duplicating the list
 * lets the deployed tool contract drift from what the API will accept.
 */

export const MEMORY_CATEGORIES = [
  "trigger",
  "reason",
  "support_person",
  "coping",
  "win",
] as const;

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];
