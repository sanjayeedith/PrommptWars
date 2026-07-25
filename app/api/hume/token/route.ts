import { NextResponse } from "next/server";
import { fetchAccessToken } from "hume";
import { z } from "zod";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mints a short-lived Hume access token.
 *
 * Prefer server env keys. For evaluator demos, the hamburger settings panel
 * may POST keys from sessionStorage — those are used only for this request
 * and never written to disk or logs.
 */

const bodySchema = z.object({
  apiKey: z.string().min(8).max(200).optional(),
  secretKey: z.string().min(8).max(200).optional(),
});

export async function POST(request: Request) {
  if (!rateLimit(clientIp(request), 20, 60_000, "hume-token")) {
    return NextResponse.json({ error: "Too many token requests" }, { status: 429 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const apiKey = parsed.data.apiKey || process.env.HUME_API_KEY;
  const secretKey = parsed.data.secretKey || process.env.HUME_SECRET_KEY;

  if (!apiKey || !secretKey) {
    return NextResponse.json(
      { error: "Hume keys missing. Open Settings and paste them, or set .env." },
      { status: 400 },
    );
  }

  try {
    const accessToken = await fetchAccessToken({ apiKey, secretKey });
    return NextResponse.json(
      { accessToken },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Could not mint a Hume token. Check the keys." },
      { status: 401 },
    );
  }
}
