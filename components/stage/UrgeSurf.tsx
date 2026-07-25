"use client";

import { useEffect, useState } from "react";

/**
 * A visible countdown for riding out a craving.
 *
 * The point is not the timer, it is the evidence: cravings peak and fall, and
 * watching one end is more persuasive than being told it will.
 */
export default function UrgeSurf({
  minutes,
  reassurance,
}: {
  minutes: number;
  reassurance: string;
}) {
  // Keyed on the duration so a new timer length remounts with a fresh count
  // rather than resetting state from inside an effect.
  return <Countdown key={minutes} total={minutes * 60} reassurance={reassurance} />;
}

function Countdown({ total, reassurance }: { total: number; reassurance: string }) {
  const [remaining, setRemaining] = useState(total);

  useEffect(() => {
    const timer = window.setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const progress = total === 0 ? 1 : 1 - remaining / total;
  const finished = remaining === 0;

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <div
        className="relative grid place-items-center size-48 rounded-full"
        style={{
          background: `conic-gradient(var(--accent) ${progress * 360}deg, var(--line) 0deg)`,
        }}
        role="timer"
        aria-live="off"
      >
        <div className="grid place-items-center size-40 rounded-full bg-[var(--bg)]">
          <span className="text-4xl font-semibold tabular-nums text-[var(--ink)]">
            {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
          </span>
        </div>
      </div>

      <p aria-live="polite" className="text-center text-lg max-w-sm text-balance text-[var(--ink-soft)]">
        {finished
          ? "That passed. You did that."
          : reassurance || "You do not have to make it go away. Just outlast it."}
      </p>
    </div>
  );
}
