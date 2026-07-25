/**
 * Client-held credentials for live demos and evaluators.
 *
 * Keys live in sessionStorage only (cleared when the tab closes). They are
 * never written into .env or logged. Production deployments should prefer
 * server env vars; this path exists so a judge can type keys without a rebuild.
 */

export type ClientKeys = {
  humeApiKey: string;
  humeSecretKey: string;
  humeConfigId: string;
  supermemoryApiKey: string;
};

const STORAGE_KEY = "anchor.client-keys";

export const EMPTY_KEYS: ClientKeys = {
  humeApiKey: "",
  humeSecretKey: "",
  humeConfigId: "",
  supermemoryApiKey: "",
};

export function readClientKeys(): ClientKeys {
  if (typeof window === "undefined") return EMPTY_KEYS;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_KEYS;
    const parsed = JSON.parse(raw) as Partial<ClientKeys>;
    return {
      humeApiKey: String(parsed.humeApiKey ?? ""),
      humeSecretKey: String(parsed.humeSecretKey ?? ""),
      humeConfigId: String(parsed.humeConfigId ?? ""),
      supermemoryApiKey: String(parsed.supermemoryApiKey ?? ""),
    };
  } catch {
    return EMPTY_KEYS;
  }
}

export function writeClientKeys(keys: ClientKeys): void {
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export function clearClientKeys(): void {
  window.sessionStorage.removeItem(STORAGE_KEY);
}

export function hasVoiceKeys(keys: ClientKeys): boolean {
  return Boolean(keys.humeApiKey && keys.humeSecretKey && keys.humeConfigId);
}

export function maskSecret(value: string): string {
  if (!value) return "";
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}
