"use client";

import { ThinkingOrb, type OrbState } from "thinking-orbs";

/**
 * Maps agent activity to a thinking-orbs state so the user always knows
 * whether Anchor is listening, searching memory, or thinking — the presence
 * cue that reduces anxiety when a voice AI goes quiet.
 */

export type AgentActivity = "idle" | "listening" | "searching" | "thinking" | "speaking";

const LABELS: Record<AgentActivity, string> = {
  idle: "Ready when you are",
  listening: "Listening…",
  searching: "Looking up what helps you…",
  thinking: "Thinking with you…",
  speaking: "Speaking…",
};

const ORB: Record<Exclude<AgentActivity, "idle" | "speaking">, OrbState> = {
  listening: "listening",
  searching: "searching",
  thinking: "working",
};

export default function AgentPresence({ activity }: { activity: AgentActivity }) {
  if (activity === "idle") {
    return (
      <div className="flex min-h-[5.5rem] flex-col items-center justify-center gap-2 text-[var(--ink-faint)]">
        <div className="size-16 rounded-full border border-dashed border-[var(--line)]" aria-hidden />
        <p className="text-sm">{LABELS.idle}</p>
      </div>
    );
  }

  if (activity === "speaking") {
    return (
      <div className="flex min-h-[5.5rem] flex-col items-center justify-center gap-2">
        <ThinkingOrb state="composing" size={64} theme="dark" aria-label="Anchor is speaking" />
        <p aria-live="polite" className="text-sm text-[var(--ink-soft)]">
          {LABELS.speaking}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[5.5rem] flex-col items-center justify-center gap-2">
      <ThinkingOrb
        state={ORB[activity]}
        size={64}
        theme="dark"
        aria-label={LABELS[activity]}
      />
      <p aria-live="polite" className="text-sm text-[var(--ink-soft)]">
        {LABELS[activity]}
      </p>
    </div>
  );
}
