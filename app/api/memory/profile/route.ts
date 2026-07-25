import { NextResponse } from "next/server";
import { EMPTY_SNAPSHOT, readSnapshot } from "@/lib/memory";
import { profileRequestSchema } from "@/lib/schemas";
import { clientIp, optionalSupermemoryKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns the caller's memory snapshot for injection into an EVI session.
 *
 * Failures return an empty snapshot with a 200 rather than an error status:
 * the client should always be able to start a conversation, personalised or not.
 *
 * Optional `x-supermemory-key` (from sessionStorage Settings) overrides the
 * server env key for this request only. The browser never talks to Supermemory.
 */
export async function POST(request: Request) {
  if (!rateLimit(clientIp(request), 40, 60_000, "memory-profile")) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = profileRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const snapshot = await readSnapshot(
    parsed.data.userId,
    optionalSupermemoryKey(request),
  ).catch(() => EMPTY_SNAPSHOT);
  return NextResponse.json(snapshot, {
    headers: { "Cache-Control": "no-store" },
  });
}
