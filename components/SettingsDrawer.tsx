"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Eye, EyeOff, Menu, Settings2, X } from "lucide-react";
import {
  clearClientKeys,
  EMPTY_KEYS,
  hasVoiceKeys,
  maskSecret,
  readClientKeys,
  writeClientKeys,
  type ClientKeys,
} from "@/lib/client-keys";

/**
 * Hamburger settings drawer for live API keys.
 *
 * Designed for evaluators: paste keys, hide the panel, demo. Keys stay in
 * sessionStorage only. Soft copy and a clear "you're set" state use the
 * competence / control loop — people feel safer when setup is reversible
 * and status is visible without being loud.
 */

type Props = {
  onSaved: (keys: ClientKeys) => void;
};

function Field({
  id,
  label,
  value,
  onChange,
  secret,
  hint,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  secret?: boolean;
  hint?: string;
  placeholder?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-[var(--ink-soft)]">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={secret && !revealed ? "password" : "text"}
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2.5 pr-11 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-faint)] focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
        />
        {secret ? (
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[var(--ink-faint)] hover:bg-white/5 hover:text-[var(--ink)]"
            aria-label={revealed ? "Hide value" : "Show value"}
          >
            {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        ) : null}
      </div>
      {hint ? <p className="text-xs text-[var(--ink-faint)]">{hint}</p> : null}
    </div>
  );
}

export default function SettingsDrawer({ onSaved }: Props) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ClientKeys>(EMPTY_KEYS);
  const [status, setStatus] = useState<"idle" | "saved" | "cleared">("idle");
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setDraft(readClientKeys());
  }, []);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const configured = hasVoiceKeys(draft);

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="anchor-settings"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-[60] inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)]/90 px-3 py-2 text-sm text-[var(--ink)] shadow-[var(--shadow-soft)] backdrop-blur transition hover:border-[var(--accent)] hover:bg-[var(--surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        <Menu className="size-4" aria-hidden />
        <span className="hidden sm:inline">Settings</span>
        {configured ? (
          <span className="size-2 rounded-full bg-[var(--accent)]" aria-label="Keys configured" />
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70]">
          <button
            type="button"
            aria-label="Close settings backdrop"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <aside
            id="anchor-settings"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="absolute inset-y-0 left-0 flex w-[min(100%,22rem)] flex-col border-r border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-panel)]"
          >
            <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
              <div className="flex items-center gap-2">
                <Settings2 className="size-4 text-[var(--accent)]" aria-hidden />
                <h2 id={titleId} className="text-base font-semibold text-[var(--ink)]">
                  Your keys
                </h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-[var(--ink-soft)] hover:bg-white/5 hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                aria-label="Hide settings"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              <p className="text-sm leading-relaxed text-[var(--ink-soft)]">
                Paste keys once, then hide this panel. They stay in this browser tab only —
                nothing is written to the server disk.
              </p>

              <Field
                id="hume-api"
                label="Hume API key"
                secret
                value={draft.humeApiKey}
                onChange={(humeApiKey) => setDraft((d) => ({ ...d, humeApiKey }))}
                placeholder="sk-..."
              />
              <Field
                id="hume-secret"
                label="Hume secret key"
                secret
                value={draft.humeSecretKey}
                onChange={(humeSecretKey) => setDraft((d) => ({ ...d, humeSecretKey }))}
              />
              <Field
                id="hume-config"
                label="Hume config ID"
                value={draft.humeConfigId}
                onChange={(humeConfigId) => setDraft((d) => ({ ...d, humeConfigId }))}
                hint="From npm run setup:hume, or the Hume portal."
              />
              <Field
                id="supermemory"
                label="Supermemory API key"
                secret
                value={draft.supermemoryApiKey}
                onChange={(supermemoryApiKey) => setDraft((d) => ({ ...d, supermemoryApiKey }))}
                hint="Optional — personalization across sessions."
              />

              {configured ? (
                <p role="status" className="rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--accent-ink)]">
                  Voice keys look ready{draft.humeApiKey ? ` (${maskSecret(draft.humeApiKey)})` : ""}.
                </p>
              ) : (
                <p role="status" className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm text-[var(--ink-faint)]">
                  Need Hume API key, secret, and config ID to talk.
                </p>
              )}

              {status === "saved" ? (
                <p role="status" className="text-sm text-[var(--accent-ink)]">
                  Saved. You can hide this and start talking.
                </p>
              ) : null}
              {status === "cleared" ? (
                <p role="status" className="text-sm text-[var(--ink-soft)]">
                  Cleared from this tab.
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 border-t border-[var(--line)] p-4">
              <button
                type="button"
                onClick={() => {
                  writeClientKeys(draft);
                  onSaved(draft);
                  setStatus("saved");
                  window.setTimeout(() => setOpen(false), 450);
                }}
                className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-contrast)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                Save and hide
              </button>
              <button
                type="button"
                onClick={() => {
                  clearClientKeys();
                  setDraft(EMPTY_KEYS);
                  onSaved(EMPTY_KEYS);
                  setStatus("cleared");
                }}
                className="rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm text-[var(--ink-soft)] hover:bg-white/5"
              >
                Clear keys from this tab
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
