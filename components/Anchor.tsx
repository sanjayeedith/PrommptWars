"use client";

import {
  VoiceProvider,
  useVoice,
  type JSONMessage,
  type ToolCallHandler,
  type VoiceProviderProps,
} from "@humeai/voice-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { dispatchTool, type DispatchContext, type StagePanel } from "@/lib/tools/dispatch";
import { appendReading, readingFrom, type EmotionReading } from "@/lib/prosody";
import { hasVoiceKeys, readClientKeys, type ClientKeys } from "@/lib/client-keys";
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
// EVI's socket never settles its connect promise if it closes before
// chat_metadata arrives (bad token, wrong config ID), so we bound the wait.
const CONNECT_TIMEOUT_MS = 15_000;

type Snapshot = DispatchContext & { contextText: string; triggers: string[] };
type VoiceError = Parameters<NonNullable<VoiceProviderProps["onError"]>>[0];

const EMPTY: Snapshot = { contextText: "", reasons: [], triggers: [], contacts: [] };

/** Turns an EVI failure into something a person in distress can act on. */
function messageForError(error: VoiceError): string {
  if (error.type === "mic_error") {
    return error.reason === "mic_permission_denied"
      ? "Microphone access is blocked. Allow the mic for this site in your browser's address bar, then press Talk again. You can still type below."
      : "The microphone could not start. Close anything else using it, then press Talk again. You can still type below.";
  }
  if (error.type === "audio_error") {
    return "Audio playback could not start. Reload the page and try again — captions below still work.";
  }
  return "The voice session could not connect. Check your Hume keys and config ID in Settings, then try again.";
}

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

function readChatGroupId(): string | undefined {
  try {
    return window.localStorage.getItem(CHAT_GROUP_KEY) ?? undefined;
  } catch {
    return undefined;
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
  voiceError,
  readVoiceError,
  reportVoiceError,
}: {
  accessToken: string;
  configId: string;
  userId: string;
  snapshot: Snapshot;
  panel: StagePanel;
  captions: string;
  chatGroupId?: string;
  activity: AgentActivity;
  voiceError: string;
  readVoiceError: () => string;
  reportVoiceError: (message: string) => void;
}) {
  const {
    connect,
    disconnect,
    status,
    sendSessionSettings,
    isPlaying,
    mute,
    unmute,
  } = useVoice();
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
      reportVoiceError("");
      const shouldMute = opts?.muteMic === true;
      let timer = 0;

      try {
        // connect() resolves on success and reports every failure through the
        // provider's onError instead of rejecting, so try/catch cannot see a
        // failed mic permission or a rejected token. Read the error channel and
        // bound the wait rather than trusting the promise.
        const settled = connect({
          auth: { type: "accessToken", value: accessToken },
          configId,
          resumedChatGroupId: chatGroupId,
        }).then(
          () => "settled" as const,
          () => "settled" as const,
        );
        const timedOut = new Promise<"timeout">((resolve) => {
          timer = window.setTimeout(() => resolve("timeout"), CONNECT_TIMEOUT_MS);
        });

        if ((await Promise.race([settled, timedOut])) === "timeout") {
          await disconnect();
          reportVoiceError(
            "Anchor could not reach the voice service in time. Check your connection and your Hume config ID, then try again.",
          );
          return false;
        }

        if (readVoiceError()) {
          // onError already wrote a human-readable reason; release the mic and
          // audio resources so the next attempt starts clean.
          await disconnect();
          return false;
        }

        // Only mute when the caller explicitly asked (typed-send path or quiet checkbox).
        // Voice start must unmute — otherwise the OS mic drops ~immediately after connect.
        if (shouldMute) {
          mute();
        } else {
          unmute();
        }
        return true;
      } finally {
        window.clearTimeout(timer);
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
      disconnect,
      mute,
      readVoiceError,
      reportVoiceError,
      unmute,
    ],
  );

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
          Press Talk and just say what is going on. Captions appear below.
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

      {voiceError ? (
        <p
          role="alert"
          className="rounded-2xl border border-[var(--crisis)]/50 bg-[var(--crisis)]/10 px-4 py-3 text-center text-sm text-[var(--ink)]"
        >
          {voiceError}
        </p>
      ) : null}

      <div className="flex flex-col items-center gap-3">
        {!connected ? (
          <button
            type="button"
            disabled={!canConnect || busy}
            onClick={() => void start()}
            className="group inline-flex items-center gap-3 rounded-full border border-[var(--line)] bg-[var(--surface)] px-9 py-6 text-xl font-medium text-[var(--ink)] shadow-[var(--shadow-soft)] transition hover:border-[var(--accent)] hover:bg-[var(--surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Mic className="size-6 transition group-hover:scale-105" aria-hidden />
            {busy ? "Connecting…" : "Talk to Anchor"}
          </button>
        ) : (
          <p className="rounded-full border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-4 py-2 text-sm text-[var(--accent-ink)]">
            Session live — mic stays on unless you mute it in the bar below. End Call to hang up.
          </p>
        )}
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
  // Anchor is imported with `ssr: false`, so browser storage is readable on the
  // very first render. Lazy initialisers avoid a second render pass and keep
  // these reads out of an effect.
  const [userId] = useState(readOrCreateUserId);
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY);
  const [panel, setPanel] = useState<StagePanel>({ kind: "idle" });
  const [captions, setCaptions] = useState("");
  // Read once at mount to resume the previous chat. Later group IDs are written
  // straight to localStorage by handleMessage and picked up on the next visit.
  const [chatGroupId] = useState<string | undefined>(readChatGroupId);
  const [keys, setKeys] = useState<ClientKeys>(readClientKeys);
  const [accessToken, setAccessToken] = useState(serverToken);
  const [activity, setActivity] = useState<AgentActivity>("idle");
  const [voiceError, setVoiceError] = useState("");

  const snapshotRef = useRef<Snapshot>(EMPTY);
  const userIdRef = useRef("");
  const keysRef = useRef(keys);
  const lastProsodyAt = useRef(0);
  const readings = useRef<EmotionReading[]>([]);
  const pendingNudge = useRef<string | null>(null);
  // Mirrored in a ref because onError fires synchronously inside connect(),
  // before React re-renders with the new state.
  const voiceErrorRef = useRef("");

  // The tool-call and memory handlers are long-lived callbacks handed to the
  // voice socket, so they read the latest values through refs instead of being
  // rebuilt (and re-registered) on every state change.
  useEffect(() => {
    snapshotRef.current = snapshot;
    userIdRef.current = userId;
    keysRef.current = keys;
  }, [snapshot, userId, keys]);

  const configId = keys.humeConfigId || serverConfigId || process.env.NEXT_PUBLIC_HUME_CONFIG_ID || "";

  const reportVoiceError = useCallback((message: string) => {
    voiceErrorRef.current = message;
    setVoiceError(message);
  }, []);

  const readVoiceError = useCallback(() => voiceErrorRef.current, []);

  const onVoiceError = useCallback(
    (error: VoiceError) => {
      reportVoiceError(messageForError(error));
      setActivity("idle");
    },
    [reportVoiceError],
  );

  const onVoiceOpen = useCallback(() => {
    reportVoiceError("");
  }, [reportVoiceError]);

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
    const stored = readClientKeys();
    let cancelled = false;
    // Deferred to a microtask so the effect body performs no synchronous state
    // update; the loading indicators these kick off would otherwise cascade an
    // extra render during the mount flush.
    queueMicrotask(() => {
      if (cancelled) return;
      void loadProfile(userId, stored.supermemoryApiKey);
      if (hasVoiceKeys(stored)) void mintToken(stored);
    });
    return () => {
      cancelled = true;
    };
    // Runs once on mount: the server token is already the initial state, and
    // client-pasted keys re-mint through onKeysSaved instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <VoiceProvider
        onToolCall={handleToolCall}
        onMessage={handleMessage}
        onError={onVoiceError}
        onOpen={onVoiceOpen}
      >
        <Session
          accessToken={accessToken}
          configId={configId}
          userId={userId || "anonymous"}
          snapshot={snapshot}
          panel={panel}
          captions={captions}
          chatGroupId={chatGroupId}
          activity={activity}
          voiceError={voiceError}
          readVoiceError={readVoiceError}
          reportVoiceError={reportVoiceError}
        />
      </VoiceProvider>
    </>
  );
}
