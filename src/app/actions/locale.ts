"use server";

import { revalidatePath } from "next/cache";
import { isLocale } from "@/core/i18n";
import { persistLocale } from "@/server/locale";

/** Switches language from the header control. */
export async function setLocale(formData: FormData): Promise<void> {
  const value = String(formData.get("locale") ?? "");
  if (!isLocale(value)) return;

  await persistLocale(value);
  // Every page renders text, so the whole tree is stale.
  revalidatePath("/", "layout");
}
