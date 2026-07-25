"use client";

import {
  VoiceProvider,
  useVoice,
  type JSONMessage,
  type ToolCallHandler,
} from "@humeai/voice-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, Send } from "lucide-react";
import { dispatchTool, type DispatchContext, type StagePanel } from "@/lib/tools/dispatch";
import { appendReading, readingFrom, type EmotionReading } from "@/lib/prosody";
import {
  EMPTY_KEYS,
  hasVoiceKeys,
  readClientKeys,
  type ClientKeys,
} from "@/lib/client-keys";
import Stage from "./stage/Stage";
import SafetyRail, { persistSafetyCard } from "./SafetyRail";
import Controls from "./Controls";
import SettingsDrawer from "./SettingsDrawer";
import AgentPresence, { type AgentActivity } from "./AgentPresence";

/**
 * The conversation shell.
 *
 * Everything the user experiences is driven from here: EVI's tool calls become
 * screen changes via the pure dispatcher, its speech is mirrored into captions,
 * and the user's own memory is injected back into the session as context.
 */

const USER_ID_KEY = "anchor.user-id";
const CHAT_GROUP_KEY = "anchor.chat-group-id";
const PROSODY_SAMPLE_MS = 1200;
const DISTRESS_THRESHOLD = 0.6;

type Snapshot = DispatchContext & { contextText: string; triggers: string[] };

const EMPTY: Snapshot = { contextText: "", reasons: [], triggers: [], contacts: [] };

function readOrCreateUserId(): string {
  try {
    const existing = window.localStorage.getItem(USER_ID_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.localStorage.setItem(USER_ID_KEY, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

function memoryHeaders(supermemoryApiKey: string): HeadersInit {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (supermemoryApiKey) headers["x-supermemory-key"] = supermemoryApiKey;
  return headers;
}

function Session({
  accessToken,
  configId,
  userId,
  snapshot,
  panel,
  captions,
  chatGroupId,
  activity,
}: {
  accessToken: string;
  configId: string;
  userId: string;
  snapshot: Snapshot;
  panel: StagePanel;
  captions: string;
  chatGroupId?: string;
  activity: AgentActivity;
}) {
  const { connect, status, sendSessionSettings, sendUserInput, isPlaying, mute, unmute } =
    useVoice();
  const [typed, setTyped] = useState("");
  // Default OFF so voice sessions keep the mic live. Enable only for quiet typing.
  const [preferText, setPreferText] = useState(false);
  const [busy, setBusy] = useState(false);
  const connectingRef = useRef(false);
  const connected = status.value === "connected";
  const canConnect = Boolean(accessToken && configId);

  useEffect(() => {
    if (!connected || !snapshot.contextText) return;
    sendSessionSettings({
      context: { text: snapshot.contextText, type: "persistent" },
    });
  }, [connected, snapshot.contextText, sendSessionSettings]);

  const liveActivity: AgentActivity = !connected
    ? activity
    : isPlaying
      ? "speaking"
      : activity === "thinking" || activity === "searching"
        ? activity
        : "listening";

  const start = useCallback(
    async (opts?: { muteMic?: boolean }) => {
      if (!canConnect || connected || connectingRef.current) return false;
      connectingRef.current = true;
      setBusy(true);
      const shouldMute = opts?.muteMic === true;
      try {
        await connect({
          auth: { type: "accessToken", value: accessToken },
          configId,
          resumedChatGroupId: chatGroupId,
        });
        // Only mute when the caller explicitly asked (typed-send path or quiet checkbox).
        // Voice start must unmute — otherwise the OS mic drops ~immediately after connect.
        if (shouldMute) {
          mute();
        } else {
          unmute();
        }
        return true;
      } catch {
        return false;
      } finally {
        connectingRef.current = false;
        setBusy(false);
      }
    },
    [
      accessToken,
      canConnect,
      chatGroupId,
      configId,
      connect,
      connected,
      mute,
      unmute,
    ],
  );

  const sendTyped = useCallback(async () => {
    const text = typed.trim();
    if (!text || !canConnect) return;
    setBusy(true);
    try {
      if (!connected) {
        // Text-only connect: mute mic so the browser indicator does not flash.
        const ok = await start({ muteMic: true });
        if (!ok) return;
        await new Promise((resolve) => window.setTimeout(resolve, 350));
      }
      sendUserInput(text);
      setTyped("");
    } finally {
      setBusy(false);
    }
  }, [canConnect, connected, sendUserInput, start, typed]);

  return (
    <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-7 px-4 pb-44 pt-20">
      <header className="text-center">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.22em] text-[var(--accent)]">
          Still here with you
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
          Anchor
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-[var(--ink-soft)]">
          Press Talk to speak, or type below without using the mic.
        </p>
      </header>

      <AgentPresence activity={liveActivity} />

      {!canConnect ? (
        <p
          role="status"
          className="rounded-2xl border border-[var(--line)] bg-[var(--surface)]/70 px-4 py-3 text-center text-sm text-[var(--ink-soft)]"
        >
          Open <strong className="text-[var(--ink)]">Settings</strong> (top left) to paste your
          Hume keys. The 988 button below still works offline.
        </p>
      ) : null}

      <div className="flex flex-col items-center gap-3">
        {!connected ? (
          <button
            type="button"
            disabled={!canConnect || busy}
            onClick={() => void start({ muteMic: preferText })}
            className="group inline-flex items-center gap-3 rounded-full border border-[var(--line)] bg-[var(--surface)] px-9 py-6 text-xl font-medium text-[var(--ink)] shadow-[var(--shadow-soft)] transition hover:border-[var(--accent)] hover:bg-[var(--surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Mic className="size-6 transition group-hover:scale-105" aria-hidden />
            {busy ? "Connecting…" : preferText ? "Start (mic muted)" : "Talk to Anchor"}
          </button>
        ) : (
          <p className="rounded-full border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-4 py-2 text-sm text-[var(--accent-ink)]">
            Session live — mic stays on unless you mute it in the bar below. End Call to hang up.
          </p>
        )}

        <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--ink-soft)]">
          <input
            type="checkbox"
            checked={preferText}
            onChange={(event) => setPreferText(event.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
          Quiet start — mute microphone (for typing only)
        </label>
      </div>

      <Stage panel={panel} />

      <section aria-label="Captions" className="min-h-16">
        <p
          aria-live="polite"
          className="rounded-2xl border border-[var(--line)] bg-[var(--surface)]/80 px-5 py-4 text-lg leading-relaxed text-[var(--ink)] shadow-[var(--shadow-soft)]"
        >
          {captions || "Captions appear here, so this works with the sound off."}
        </p>
      </section>

      {/* Always visible in development so you never need to speak to exercise tools. */}
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void sendTyped();
        }}
      >
        <label htmlFor="typed-input" className="text-sm font-medium text-[var(--ink-soft)]">
          Type to Anchor (no speaking required)
        </label>
        <div className="flex gap-2">
          <input
            id="typed-input"
            value={typed}
            disabled={!canConnect || busy}
            onChange={(event) => setTyped(event.target.value)}
            placeholder={
              connected
                ? "e.g. I'm at a party and I really want to use"
                : "Type a message — connects automatically on send"
            }
            className="flex-1 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-[var(--ink)] outline-none focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!canConnect || busy || !typed.trim()}
            className="rounded-2xl bg-[var(--accent)] px-4 font-semibold text-[var(--accent-contrast)] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] disabled:opacity-40"
          >
            <Send className="size-5" aria-hidden />
            <span className="sr-only">Send</span>
          </button>
        </div>
      </form>

      <p className="text-center text-xs text-[var(--ink-faint)]">
        Anchor is not a therapist, a doctor, or an emergency service. Anonymous ID{" "}
        {userId.slice(0, 8)}.
      </p>

      <Controls />
      <SafetyRail />
    </div>
  );
}

export default function Anchor({
  accessToken: serverToken,
  serverConfigId,
}: {
  accessToken: string;
  serverConfigId?: string;
}) {
  const [userId, setUserId] = useState("");
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY);
  const [panel, setPanel] = useState<StagePanel>({ kind: "idle" });
  const [captions, setCaptions] = useState("");
  const [chatGroupId, setChatGroupId] = useState<string | undefined>(undefined);
  const [keys, setKeys] = useState<ClientKeys>(EMPTY_KEYS);
  const [accessToken, setAccessToken] = useState(serverToken);
  const [activity, setActivity] = useState<AgentActivity>("idle");

  const snapshotRef = useRef<Snapshot>(EMPTY);
  const userIdRef = useRef("");
  const keysRef = useRef(keys);
  const lastProsodyAt = useRef(0);
  const readings = useRef<EmotionReading[]>([]);
  const pendingNudge = useRef<string | null>(null);

  snapshotRef.current = snapshot;
  userIdRef.current = userId;
  keysRef.current = keys;

  const configId = keys.humeConfigId || serverConfigId || process.env.NEXT_PUBLIC_HUME_CONFIG_ID || "";

  const loadProfile = useCallback(async (id: string, supermemoryApiKey: string) => {
    setActivity("searching");
    try {
      const response = await fetch("/api/memory/profile", {
        method: "POST",
        headers: memoryHeaders(supermemoryApiKey),
        body: JSON.stringify({ userId: id }),
      });
      const data: Snapshot = response.ok ? await response.json() : EMPTY;
      setSnapshot(data);
      persistSafetyCard({
        reasons: data.reasons ?? [],
        triggers: data.triggers ?? [],
        contacts: data.contacts ?? [],
      });
    } catch {
      setSnapshot(EMPTY);
    } finally {
      setActivity("idle");
    }
  }, []);

  const mintToken = useCallback(async (next: ClientKeys) => {
    if (!hasVoiceKeys(next) && !serverToken) {
      setAccessToken("");
      return;
    }
    setActivity("thinking");
    try {
      const response = await fetch("/api/hume/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: next.humeApiKey || undefined,
          secretKey: next.humeSecretKey || undefined,
        }),
      });
      if (!response.ok) {
        if (serverToken && !next.humeApiKey) {
          setAccessToken(serverToken);
        } else {
          setAccessToken("");
        }
        return;
      }
      const data = (await response.json()) as { accessToken?: string };
      setAccessToken(data.accessToken || serverToken || "");
    } catch {
      setAccessToken(serverToken || "");
    } finally {
      setActivity("idle");
    }
  }, [serverToken]);

  useEffect(() => {
    const id = readOrCreateUserId();
    setUserId(id);
    setChatGroupId(window.localStorage.getItem(CHAT_GROUP_KEY) ?? undefined);
    const stored = readClientKeys();
    setKeys(stored);
    void loadProfile(id, stored.supermemoryApiKey);
    if (hasVoiceKeys(stored)) {
      void mintToken(stored);
    } else if (serverToken) {
      setAccessToken(serverToken);
    }
  }, [loadProfile, mintToken, serverToken]);

  const onKeysSaved = useCallback(
    (next: ClientKeys) => {
      setKeys(next);
      void mintToken(next);
      if (userIdRef.current) void loadProfile(userIdRef.current, next.supermemoryApiKey);
    },
    [loadProfile, mintToken],
  );

  const remember = useCallback((fact: string, category: string) => {
    void fetch("/api/memory/add", {
      method: "POST",
      headers: memoryHeaders(keysRef.current.supermemoryApiKey),
      body: JSON.stringify({ userId: userIdRef.current, content: fact, category }),
    }).catch(() => undefined);
  }, []);

  const handleToolCall = useMemo<ToolCallHandler>(
    () => async (message, send) => {
      setActivity("thinking");
      const result = dispatchTool(message.name, message.parameters ?? "{}", snapshotRef.current);

      if (!result.ok) {
        setActivity("listening");
        return send.error(result.error);
      }

      setPanel(result.panel);
      if (result.remember) remember(result.remember.fact, result.remember.category);

      const nudge = pendingNudge.current;
      pendingNudge.current = null;
      setActivity("listening");
      return send.success(nudge ? `${result.speech} ${nudge}` : result.speech);
    },
    [remember],
  );

  const handleMessage = useCallback((incoming: JSONMessage) => {
    const message = incoming as unknown as { type: string } & Record<string, unknown>;

    if (message.type === "chat_metadata") {
      const groupId = message.chat_group_id as string | undefined;
      if (groupId) {
        try {
          window.localStorage.setItem(CHAT_GROUP_KEY, groupId);
        } catch {
          // Non-fatal.
        }
      }
      setActivity("listening");
      return;
    }

    if (message.type === "assistant_message") {
      const content = (message.message as { content?: string } | undefined)?.content;
      if (content) setCaptions(content);
      setActivity("speaking");
      return;
    }

    if (message.type === "user_message") {
      setActivity("listening");
      const now = Date.now();
      if (now - lastProsodyAt.current < PROSODY_SAMPLE_MS) return;
      lastProsodyAt.current = now;

      const scores = (message.models as { prosody?: { scores?: Record<string, number> } })?.prosody
        ?.scores;
      const reading = readingFrom(scores, now);
      readings.current = appendReading(readings.current, reading);

      if (reading.distress >= DISTRESS_THRESHOLD) {
        pendingNudge.current =
          "Their voice sounds highly distressed right now. Slow down and ground them before anything else.";
      }
    }
  }, []);

  return (
    <>
      <SettingsDrawer onSaved={onKeysSaved} />
      <VoiceProvider onToolCall={handleToolCall} onMessage={handleMessage}>
        <Session
          accessToken={accessToken}
          configId={configId}
          userId={userId || "anonymous"}
          snapshot={snapshot}
          panel={panel}
          captions={captions}
          chatGroupId={chatGroupId}
          activity={activity}
        />
      </VoiceProvider>
    </>
  );
}
