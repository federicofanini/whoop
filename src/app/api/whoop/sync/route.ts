import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, isDbConfigured, schema } from "@/lib/db";
import { getAuthorizedClient, lastSyncedAt, syncSince, upsertProfile } from "@/lib/whoop/sync";

export const runtime = "nodejs";
/** A full backfill walks a lot of pages; give it room. */
export const maxDuration = 300;

/**
 * POST /api/whoop/sync
 *
 *   ?mode=incremental (default) — everything changed since the newest record held.
 *   ?mode=backfill              — the full history, capped by ?limit.
 */
export async function POST(request: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 503 });
  }

  const mode = new URL(request.url).searchParams.get("mode") ?? "incremental";
  const limit = Number(new URL(request.url).searchParams.get("limit") ?? 10_000);

  try {
    const { client, account } = await getAuthorizedClient();
    const since = mode === "backfill" ? undefined : await lastSyncedAt(account.userId);

    await upsertProfile(client, account.userId);
    const result = await syncSince(client, since, limit);

    if (mode === "backfill") {
      const db = getDb();
      await db
        .update(schema.accounts)
        .set({ backfilledAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.accounts.userId, account.userId));
    }

    return NextResponse.json({
      mode,
      since: since?.toISOString() ?? null,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
