import { NextResponse } from "next/server";
import { writeMemory } from "@/lib/memory";
import { addMemoryRequestSchema } from "@/lib/schemas";
import { clientIp, optionalSupermemoryKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Persists one memory for the caller.
 *
 * Memory content is deliberately never logged. It contains disclosures about
 * drug use, relapse, and family, and server logs are the wrong place for that.
 *
 * Optional `x-supermemory-key` (from sessionStorage Settings) overrides the
 * server env key for this request only. The browser never talks to Supermemory.
 */
export async function POST(request: Request) {
  if (!rateLimit(clientIp(request), 40, 60_000, "memory-add")) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = addMemoryRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { userId, content, category } = parsed.data;
  const saved = await writeMemory(
    userId,
    content,
    category,
    optionalSupermemoryKey(request),
  );
  return NextResponse.json({ saved }, { headers: { "Cache-Control": "no-store" } });
}
