import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { isDbConfigured } from "@/core/db";
import { getAuthorizedClient, lastSyncedAt, listAccountIds, syncSince } from "@/core/whoop/sync";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Nightly safety net.
 *
 * Webhooks are the fast path, but deliveries can be missed while the app is
 * redeploying or the database is unreachable. This re-pulls a rolling window so
 * a dropped delivery costs a day of freshness rather than a permanent hole.
 *
 * It runs for every linked account: a friend's dashboard is only as fresh as
 * their own sync, and they are not necessarily around to trigger one.
 */
export async function GET(request: NextRequest) {
  // Fail closed. An unset secret used to skip the check entirely, which left a
  // public endpoint that re-syncs every linked account on demand — a free way
  // to burn the WHOOP rate limit for everyone, from anywhere.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not set; refusing to run an unauthenticated reconcile" },
      { status: 503 },
    );
  }

  const offered = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  // Constant-time: a length-independent comparison here leaks the secret to
  // anyone willing to time a few thousand requests.
  const offeredBytes = Buffer.from(offered);
  const expectedBytes = Buffer.from(expected);
  const authorized =
    offeredBytes.length === expectedBytes.length && timingSafeEqual(offeredBytes, expectedBytes);

  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isDbConfigured()) {
    return NextResponse.json({ ok: true, skipped: "no database configured" });
  }

  // Re-pull at least the last week regardless of how fresh the data looks.
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const results: Record<string, unknown>[] = [];

  for (const userId of await listAccountIds()) {
    try {
      const { client } = await getAuthorizedClient(userId);
      const known = await lastSyncedAt(userId);
      const since = !known || known > weekAgo ? weekAgo : known;

      const result = await syncSince(client, since);
      results.push({ userId, since: since.toISOString(), ...result });
    } catch (err) {
      // One member's expired refresh token must not stop the others syncing.
      results.push({ userId, error: err instanceof Error ? err.message : "reconcile failed" });
    }
  }

  return NextResponse.json({ ok: true, accounts: results });
}
