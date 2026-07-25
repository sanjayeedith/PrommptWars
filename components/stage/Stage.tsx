"use client";

import { memo, useEffect, useRef } from "react";
import { Copy, Phone, MessageSquare } from "lucide-react";
import type { StagePanel } from "@/lib/tools/dispatch";
import { smsHref, telHref } from "@/lib/sanitize";
import Breathing from "./Breathing";
import UrgeSurf from "./UrgeSurf";

/**
 * Renders whatever EVI has decided the user needs to see.
 *
 * Every panel here is opened by a tool call, not by a tap, which is what makes
 * the interface usable when someone cannot organise themselves enough to
 * navigate. Focus moves here on each change so screen reader users are told
 * what appeared instead of silently losing the update.
 */

const TITLES: Record<StagePanel["kind"], string> = {
  idle: "",
  grounding: "Ground yourself",
  urge_surf: "Ride it out",
  why: "Your reasons, in your words",
  script: "Ready to send",
  contact: "Reach your person",
  resource: "Good to know",
};

function copyToClipboard(text: string) {
  void navigator.clipboard?.writeText(text);
}

function Panel({ panel }: { panel: StagePanel }) {
  switch (panel.kind) {
    case "grounding":
      return <Breathing technique={panel.technique} seconds={panel.seconds} />;

    case "urge_surf":
      return <UrgeSurf minutes={panel.minutes} reassurance={panel.reassurance} />;

    case "why":
      return (
        <ul className="flex flex-col gap-3">
          {panel.reasons.map((reason) => (
            <li
              key={reason}
              className="rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-4 py-3 text-lg text-[var(--ink)]"
            >
              {reason}
            </li>
          ))}
        </ul>
      );

    case "script": {
      const sms = smsHref(panel.sendTo, panel.scriptText);
      return (
        <div className="flex flex-col gap-4">
          <p className="text-sm uppercase tracking-wide opacity-60">{panel.situation}</p>
          <blockquote className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-5 text-xl leading-relaxed whitespace-pre-wrap text-[var(--ink)]">
            {panel.scriptText}
          </blockquote>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => copyToClipboard(panel.scriptText)}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--line)] px-4 py-2 text-[var(--ink)] hover:bg-[var(--surface-2)]"
            >
              <Copy className="size-4" aria-hidden />
              Copy it
            </button>
            {sms ? (
              <a
                href={sms}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-[var(--accent-contrast)] hover:brightness-110"
              >
                <MessageSquare className="size-4" aria-hidden />
                Send to {panel.sendTo}
              </a>
            ) : null}
          </div>
        </div>
      );
    }

    case "contact": {
      const tel = telHref(panel.phone);
      const sms = smsHref(panel.phone, panel.message);
      return (
        <div className="flex flex-col gap-4">
          <p className="text-2xl font-medium">{panel.who}</p>
          <blockquote className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-4 text-lg whitespace-pre-wrap text-[var(--ink)]">
            {panel.message}
          </blockquote>
          <div className="flex flex-wrap gap-3">
            {tel ? (
              <a
                href={tel}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-[var(--accent-contrast)] hover:brightness-110"
              >
                <Phone className="size-4" aria-hidden />
                Call {panel.who}
              </a>
            ) : null}
            {sms ? (
              <a
                href={sms}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--line)] px-4 py-2 text-[var(--ink)] hover:bg-[var(--surface-2)]"
              >
                <MessageSquare className="size-4" aria-hidden />
                Text instead
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => copyToClipboard(panel.message)}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--line)] px-4 py-2 text-[var(--ink)] hover:bg-[var(--surface-2)]"
            >
              <Copy className="size-4" aria-hidden />
              Copy
            </button>
          </div>
        </div>
      );
    }

    case "resource":
      return (
        <div className="flex flex-col gap-4">
          <p className="text-xl">{panel.resource.summary}</p>
          <ul className="flex flex-col gap-2 list-disc pl-5">
            {panel.resource.points.map((point) => (
              <li key={point} className="text-lg leading-relaxed">
                {point}
              </li>
            ))}
          </ul>
          <p className="text-sm opacity-60">Source: {panel.resource.source}</p>
        </div>
      );

    case "idle":
      return null;
  }
}

function Stage({ panel }: { panel: StagePanel }) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (panel.kind !== "idle") ref.current?.focus();
  }, [panel]);

  if (panel.kind === "idle") {
    return (
      <section
        aria-label="Guidance"
        className="rounded-xl border border-dashed border-[var(--line)] p-8 text-center text-[var(--ink-faint)]"
      >
        <p className="text-lg">
          Whatever you need will appear here. You do not have to ask for it by name.
        </p>
      </section>
    );
  }

  const title = panel.kind === "resource" ? panel.resource.title : TITLES[panel.kind];

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-label={title}
      aria-live="assertive"
      className="rounded-xl border border-[var(--line)] bg-[var(--surface)]/80 p-6 shadow-[var(--shadow-soft)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
    >
      <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold tracking-wide text-[var(--accent-ink)]">
        {title}
      </h2>
      <Panel panel={panel} />
    </section>
  );
}

export default memo(Stage);
