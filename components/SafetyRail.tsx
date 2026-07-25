"use client";

import { useState } from "react";
import { LifeBuoy, Share2, ShieldCheck } from "lucide-react";

/**
 * The path that never depends on the AI.
 *
 * These numbers are hardcoded and the safety card is read from local storage,
 * so this rail works with no network, no API keys, and no model available. If
 * everything else in this application fails, this is what has to still be here.
 */

const SAFETY_CARD_KEY = "anchor.safety-card";

type SafetyCard = {
  reasons: string[];
  triggers: string[];
  contacts: { name: string; phone: string | null }[];
};

export function persistSafetyCard(card: SafetyCard) {
  try {
    window.localStorage.setItem(SAFETY_CARD_KEY, JSON.stringify(card));
  } catch {
    // Private browsing or a full quota. The hotline numbers below still work.
  }
}

function readSafetyCard(): SafetyCard | null {
  try {
    const raw = window.localStorage.getItem(SAFETY_CARD_KEY);
    return raw ? (JSON.parse(raw) as SafetyCard) : null;
  } catch {
    return null;
  }
}

/** Builds a caregiver-facing summary from the person's own words. */
function caregiverShareText(card: SafetyCard): string {
  const lines = [
    "How to help me when I'm struggling",
    "",
    "If I seem off or I'm reaching out, this is what helps:",
  ];
  if (card.reasons.length) {
    lines.push("", "What I'm fighting for:");
    for (const reason of card.reasons) lines.push(`- ${reason}`);
  }
  if (card.triggers.length) {
    lines.push("", "Things that make it harder:");
    for (const trigger of card.triggers) lines.push(`- ${trigger}`);
  }
  if (card.contacts.length) {
    lines.push("", "People who already know:");
    for (const contact of card.contacts) {
      lines.push(`- ${contact.name}${contact.phone ? ` (${contact.phone})` : ""}`);
    }
  }
  lines.push(
    "",
    "Crisis lines (US): 988 · Never Use Alone 1-800-484-3731 · SAMHSA 1-800-662-4357",
  );
  return lines.join("\n");
}

async function shareCaregiverCard(card: SafetyCard) {
  const text = caregiverShareText(card);
  try {
    if (navigator.share) {
      await navigator.share({ title: "How to help me", text });
      return;
    }
  } catch {
    // Fall through to clipboard if share is cancelled or unavailable.
  }
  await navigator.clipboard?.writeText(text);
}

export default function SafetyRail() {
  const [open, setOpen] = useState(false);
  const [card, setCard] = useState<SafetyCard | null>(null);
  const [shareNote, setShareNote] = useState("");

  // Re-read on open rather than in an effect, so the card is always current
  // without triggering a second render pass every time the rail expands.
  const toggle = () => {
    setOpen((wasOpen) => {
      if (!wasOpen) setCard(readSafetyCard());
      return !wasOpen;
    });
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--line)] bg-[var(--bg)]/95 backdrop-blur">
      {open ? (
        <div className="mx-auto max-w-3xl px-4 py-4 text-sm text-[var(--ink)]">
          <h2 className="mb-2 font-semibold text-[var(--accent-ink)]">Your safety card</h2>
          {card ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="opacity-60">Reasons</p>
                <ul className="list-disc pl-4">
                  {card.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="opacity-60">Watch out for</p>
                <ul className="list-disc pl-4">
                  {card.triggers.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="opacity-60">People</p>
                <ul className="list-disc pl-4">
                  {card.contacts.map((c) => (
                    <li key={c.name}>
                      {c.name}
                      {c.phone ? ` — ${c.phone}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="opacity-70">
              Nothing saved yet. Talk to Anchor once and your card fills itself in.
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="opacity-60">
              Never Use Alone: 1-800-484-3731 · SAMHSA: 1-800-662-4357
            </p>
            {card ? (
              <button
                type="button"
                onClick={() => {
                  void shareCaregiverCard(card).then(() => {
                    setShareNote("Copied / shared for a caregiver");
                    window.setTimeout(() => setShareNote(""), 2500);
                  });
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--line)] px-3 py-1.5 text-[var(--ink-soft)] hover:bg-[var(--surface-2)]"
              >
                <Share2 className="size-4" aria-hidden />
                Share with caregiver
              </button>
            ) : null}
            {shareNote ? (
              <span role="status" className="text-[var(--accent-ink)]">
                {shareNote}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex max-w-3xl items-center justify-center gap-3 px-4 py-3">
        <a
          href="tel:988"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--crisis)] px-5 py-3 font-semibold text-[var(--crisis-ink)] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          <LifeBuoy className="size-5" aria-hidden />
          Call or text 988
        </a>
        <button
          type="button"
          aria-expanded={open}
          onClick={toggle}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--line)] px-4 py-3 text-[var(--ink)] hover:bg-[var(--surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          <ShieldCheck className="size-5" aria-hidden />
          Safety card
        </button>
      </div>
    </div>
  );
}
