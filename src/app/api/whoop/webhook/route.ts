import { NextResponse, type NextRequest } from "next/server";
import { isDbConfigured } from "@/core/db";
import { verifyWebhookSignature } from "@/core/whoop/oauth";
import { applyWebhookEvent, getAuthorizedClient } from "@/core/whoop/sync";
import type { WhoopWebhookEvent } from "@/core/whoop/types";

export const runtime = "nodejs";

/**
 * WHOOP posts here whenever a record is scored, rescored or removed.
 *
 * WHOOP retries on non-2xx, so anything that is genuinely not actionable — an
 * unconfigured database, an unknown event type — still answers 200. Only a bad
 * signature is refused.
 */
export async function POST(request: NextRequest) {
  // The signature covers the exact bytes sent; parse only after verifying.
  const rawBody = await request.text();

  const valid = await verifyWebhookSignature(
    rawBody,
    request.headers.get("x-whoop-signature"),
    request.headers.get("x-whoop-signature-timestamp"),
  );

  if (!valid) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  if (!isDbConfigured()) {
    return NextResponse.json({ ok: true, skipped: "no database configured" });
  }

  let event: WhoopWebhookEvent;
  try {
    event = JSON.parse(rawBody) as WhoopWebhookEvent;
  } catch {
    return NextResponse.json({ error: "malformed payload" }, { status: 400 });
  }

  try {
    const { client } = await getAuthorizedClient(event.user_id);
    await applyWebhookEvent(client, event.type, event.id);
    return NextResponse.json({ ok: true, type: event.type, id: event.id });
  } catch (err) {
    // Returning 500 asks WHOOP to retry, which is what we want for a transient failure.
    const message = err instanceof Error ? err.message : "webhook handling failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
