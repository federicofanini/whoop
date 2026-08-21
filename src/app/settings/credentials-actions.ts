"use server";

import { revalidatePath } from "next/cache";
import { isEncryptionConfigured } from "@/core/crypto";
import { clearOwnCredentials, saveOwnCredentials } from "@/core/whoop/credentials";
import { getViewer } from "@/server/auth";

export interface CredentialsResult {
  ok: boolean;
  key: string;
}

/**
 * Stores a member's own WHOOP developer app.
 *
 * The secret is validated for shape only. Whether it actually works is a
 * question for WHOOP, and the answer arrives at the end of the OAuth handshake —
 * pre-flighting it here would mean a token request with no code to exchange.
 */
export async function saveWhoopKeys(
  _prev: CredentialsResult | null,
  formData: FormData,
): Promise<CredentialsResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, key: "settings.keys.signedOut" };

  if (!isEncryptionConfigured()) {
    return { ok: false, key: "settings.keys.noEncryption" };
  }

  const clientId = String(formData.get("clientId") ?? "").trim();
  const clientSecret = String(formData.get("clientSecret") ?? "").trim();

  if (!clientId || !clientSecret) return { ok: false, key: "settings.keys.missing" };
  // WHOOP issues UUID client ids and long hex secrets. Catching an obviously
  // wrong paste here is friendlier than a failed redirect three screens later.
  if (clientId.length < 8 || clientSecret.length < 16) {
    return { ok: false, key: "settings.keys.tooShort" };
  }

  await saveOwnCredentials(viewer.profileId, clientId, clientSecret);
  revalidatePath("/settings");
  return { ok: true, key: "settings.keys.saved" };
}

/** Removes personal keys. Does not reclaim a shared slot — that happens on connect. */
export async function removeWhoopKeys(): Promise<void> {
  const viewer = await getViewer();
  if (!viewer) return;
  await clearOwnCredentials(viewer.profileId);
  revalidatePath("/settings");
}
