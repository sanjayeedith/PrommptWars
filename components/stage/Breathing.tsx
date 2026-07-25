"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Guided grounding, opened by EVI rather than by the user.
 *
 * The pacing circle honours `prefers-reduced-motion`. That is not a formality
 * here: large looping motion can intensify panic and nausea, so the reduced
 * variant keeps the same spoken cadence and drops the animation entirely.
 */

const PHASES = [
  { label: "Breathe in", seconds: 4 },
  { label: "Hold", seconds: 4 },
  { label: "Breathe out", seconds: 4 },
  { label: "Hold", seconds: 4 },
] as const;

const SENSES = [
  "5 things you can see",
  "4 things you can feel",
  "3 things you can hear",
  "2 things you can smell",
  "1 thing you can taste",
] as const;

function BoxBreathing({ seconds }: { seconds: number }) {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState(0);
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    const phaseTimer = window.setInterval(
      () => setPhase((p) => (p + 1) % PHASES.length),
      4000,
    );
    const countdown = window.setInterval(
      () => setRemaining((r) => Math.max(0, r - 1)),
      1000,
    );
    return () => {
      window.clearInterval(phaseTimer);
      window.clearInterval(countdown);
    };
  }, []);

  const current = PHASES[phase];
  const expanded = current.label === "Breathe in" || current.label === "Hold";

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <motion.div
        className="rounded-full bg-[var(--accent-soft)] border-2 border-[var(--accent)] flex items-center justify-center"
        animate={reduceMotion ? { width: 180, height: 180 } : { width: expanded ? 240 : 140, height: expanded ? 240 : 140 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 4, ease: "easeInOut" }}
        style={{ width: 180, height: 180 }}
      >
        <span className="text-2xl font-medium text-[var(--accent-ink)]">{current.label}</span>
      </motion.div>
      <p aria-live="polite" className="sr-only">
        {current.label}
      </p>
      <p className="text-sm opacity-70">
        {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")} remaining
      </p>
    </div>
  );
}

function FiveSenses() {
  const [done, setDone] = useState<number[]>([]);

  return (
    <ul className="flex flex-col gap-3 py-2">
      {SENSES.map((sense, index) => {
        const isDone = done.includes(index);
        return (
          <li key={sense}>
            <button
              type="button"
              aria-pressed={isDone}
              onClick={() =>
                setDone((d) => (d.includes(index) ? d.filter((i) => i !== index) : [...d, index]))
              }
              className={`w-full text-left rounded-lg border px-4 py-3 text-lg transition-colors ${
                isDone
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-ink)]"
                  : "border-[var(--line)] text-[var(--ink)] hover:border-[var(--accent)]"
              }`}
            >
              {isDone ? "\u2713 " : ""}
              {sense}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function Breathing({
  technique,
  seconds,
}: {
  technique: "box_breathing" | "five_senses";
  seconds: number;
}) {
  return technique === "box_breathing" ? <BoxBreathing seconds={seconds} /> : <FiveSenses />;
}
