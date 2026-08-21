import { eq } from "drizzle-orm";
import { getDb, isDbConfigured, schema } from "@/core/db";

/**
 * What the settings page may know about a member's stored WHOOP app.
 *
 * The client id is not secret — it travels in the authorize URL — so it can be
 * shown in full, which is what lets someone confirm they pasted the right app.
 * The secret is never read here at all: this module has no reason to decrypt it,
 * and a summary that cannot leak a secret is better than one that is careful.
 */
export interface OwnKeySummary {
  clientId: string | null;
  hasSecret: boolean;
}

export async function loadOwnKeySummary(profileId: string): Promise<OwnKeySummary> {
  if (!isDbConfigured()) return { clientId: null, hasSecret: false };

  const rows = await getDb()
    .select({
      clientId: schema.profiles.whoopClientId,
      secret: schema.profiles.whoopClientSecret,
    })
    .from(schema.profiles)
    .where(eq(schema.profiles.id, profileId))
    .limit(1);

  return {
    clientId: rows[0]?.clientId ?? null,
    hasSecret: Boolean(rows[0]?.secret),
  };
}
