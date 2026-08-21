import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { getDb, isDbConfigured, schema } from "@/core/db";
import { decryptSecret, encryptSecret, isEncryptionConfigured } from "@/core/crypto";

/**
 * Who gets to talk to WHOOP, and with whose developer app.
 *
 * A WHOOP app in development is capped at ten users. That is a platform limit,
 * not a configuration one — the eleventh person to authorise simply fails, and
 * the failure is not self-explanatory. So the cap is modelled explicitly:
 *
 *   - the first ten members claim a numbered slot on the shared app;
 *   - everyone after must bring their own WHOOP developer app;
 *   - anyone may bring their own at any time, which frees their slot.
 *
 * The alternative — letting people authorise until WHOOP starts refusing — turns
 * a known limit into a confusing bug report.
 */

export const DEFAULT_SHARED_SLOTS = 10;

/** Overridable, because the cap rises to 100 once an app is approved for production. */
export function sharedSlotLimit(): number {
  const raw = Number(process.env.WHOOP_SHARED_USER_LIMIT);
  return Number.isInteger(raw) && raw >= 0 ? raw : DEFAULT_SHARED_SLOTS;
}

export interface WhoopCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  /** Which app these belong to, so the account row can remember it. */
  source: "shared" | "own";
}

export type CredentialResult =
  | { ok: true; credentials: WhoopCredentials }
  /** No shared slots left and no personal keys on file: the member must add them. */
  | { ok: false; reason: "needs_own_keys" }
  /** The deployment itself has no shared app configured. */
  | { ok: false; reason: "not_configured" }
  /** Personal keys are stored but cannot be read back. */
  | { ok: false; reason: "no_encryption_key" };

function sharedApp(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function redirectUri(): string {
  const uri = process.env.WHOOP_REDIRECT_URI;
  if (!uri) throw new Error("WHOOP_REDIRECT_URI is not set");
  return uri;
}

/**
 * Claims the lowest free slot, or returns the one already held.
 *
 * Concurrency is handled by the unique constraint rather than by a lock: two
 * simultaneous claims for the same number mean one UPDATE wins and the other
 * raises a unique violation, which is caught and retried against the next free
 * number. That is correct across processes, which an in-memory mutex would not
 * be on a platform that runs many instances.
 */
export async function claimSharedSlot(profileId: string): Promise<number | null> {
  if (!isDbConfigured()) return null;
  const db = getDb();
  const limit = sharedSlotLimit();

  const existing = await db
    .select({ slot: schema.profiles.sharedSlot })
    .from(schema.profiles)
    .where(eq(schema.profiles.id, profileId))
    .limit(1);
  if (existing[0]?.slot) return existing[0].slot;

  for (let attempt = 0; attempt < limit; attempt += 1) {
    const taken = await db
      .select({ slot: schema.profiles.sharedSlot })
      .from(schema.profiles)
      .where(isNotNull(schema.profiles.sharedSlot));

    const used = new Set(taken.map((row) => row.slot));
    const free = Array.from({ length: limit }, (_, i) => i + 1).find((n) => !used.has(n));
    if (free === undefined) return null;

    try {
      const claimed = await db
        .update(schema.profiles)
        .set({ sharedSlot: free, updatedAt: new Date() })
        .where(and(eq(schema.profiles.id, profileId), isNull(schema.profiles.sharedSlot)))
        .returning({ slot: schema.profiles.sharedSlot });

      if (claimed[0]?.slot) return claimed[0].slot;
      // Matched nothing: a concurrent request already gave this profile a slot.
      const now = await db
        .select({ slot: schema.profiles.sharedSlot })
        .from(schema.profiles)
        .where(eq(schema.profiles.id, profileId))
        .limit(1);
      if (now[0]?.slot) return now[0].slot;
    } catch {
      // Someone else took `free` between the read and the write. Try the next.
    }
  }

  return null;
}

/** Hands a slot back, so bringing your own keys returns capacity to the pool. */
export async function releaseSharedSlot(profileId: string): Promise<void> {
  if (!isDbConfigured()) return;
  await getDb()
    .update(schema.profiles)
    .set({ sharedSlot: null, updatedAt: new Date() })
    .where(eq(schema.profiles.id, profileId));
}

export interface SlotAvailability {
  limit: number;
  used: number;
  remaining: number;
  /** True when this profile holds one of them. */
  held: boolean;
}

export async function sharedSlotAvailability(profileId?: string): Promise<SlotAvailability> {
  const limit = sharedSlotLimit();
  if (!isDbConfigured()) return { limit, used: 0, remaining: limit, held: false };

  const db = getDb();
  // No aggregate here: the row set is bounded by the slot limit, and the caller
  // needs to know whether *this* profile is among them, which a count cannot say.
  const rows = await db
    .select({ id: schema.profiles.id, slot: schema.profiles.sharedSlot })
    .from(schema.profiles)
    .where(isNotNull(schema.profiles.sharedSlot));

  const used = rows.length;
  const held = profileId ? rows.some((r) => r.id === profileId) : false;
  return { limit, used, remaining: Math.max(0, limit - used), held };
}

/** Stores a member's own WHOOP app and frees whatever slot they were holding. */
export async function saveOwnCredentials(
  profileId: string,
  clientId: string,
  clientSecret: string,
): Promise<void> {
  const db = getDb();
  await db
    .update(schema.profiles)
    .set({
      whoopClientId: clientId.trim(),
      whoopClientSecret: encryptSecret(clientSecret.trim()),
      // Their own app has its own ten users; holding a shared slot too would
      // deny it to someone who has no alternative.
      sharedSlot: null,
      updatedAt: new Date(),
    })
    .where(eq(schema.profiles.id, profileId));
}

export async function clearOwnCredentials(profileId: string): Promise<void> {
  await getDb()
    .update(schema.profiles)
    .set({ whoopClientId: null, whoopClientSecret: null, updatedAt: new Date() })
    .where(eq(schema.profiles.id, profileId));
}

/**
 * Decides which credentials a profile connects with, claiming a slot if needed.
 *
 * Own keys always win: someone who went to the trouble of registering an app
 * should not silently keep consuming a shared slot.
 */
export async function resolveCredentialsForProfile(profileId: string): Promise<CredentialResult> {
  const db = getDb();

  const rows = await db
    .select({
      clientId: schema.profiles.whoopClientId,
      clientSecret: schema.profiles.whoopClientSecret,
      slot: schema.profiles.sharedSlot,
    })
    .from(schema.profiles)
    .where(eq(schema.profiles.id, profileId))
    .limit(1);

  const profile = rows[0];

  if (profile?.clientId && profile.clientSecret) {
    if (!isEncryptionConfigured()) return { ok: false, reason: "no_encryption_key" };
    return {
      ok: true,
      credentials: {
        clientId: profile.clientId,
        clientSecret: decryptSecret(profile.clientSecret),
        redirectUri: redirectUri(),
        source: "own",
      },
    };
  }

  const shared = sharedApp();
  if (!shared) return { ok: false, reason: "not_configured" };

  const slot = profile?.slot ?? (await claimSharedSlot(profileId));
  if (slot === null) return { ok: false, reason: "needs_own_keys" };

  return {
    ok: true,
    credentials: { ...shared, redirectUri: redirectUri(), source: "shared" },
  };
}

/**
 * The credentials that can refresh a given account's tokens.
 *
 * Keyed on what actually linked the account, not on what the profile would use
 * today — a refresh token is only valid for the client that issued it.
 */
export async function credentialsForAccount(
  profileId: string | null,
  source: "shared" | "own",
): Promise<WhoopCredentials | null> {
  if (source === "shared") {
    const shared = sharedApp();
    return shared ? { ...shared, redirectUri: redirectUri(), source: "shared" } : null;
  }

  if (!profileId) return null;
  const resolved = await resolveCredentialsForProfile(profileId);
  return resolved.ok && resolved.credentials.source === "own" ? resolved.credentials : null;
}
