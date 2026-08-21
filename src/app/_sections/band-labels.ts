import { getTranslator } from "@/server/locale";
import type { BandLabels } from "@/lib/theme";

/**
 * The written half of every recovery colour.
 *
 * The red/amber/green ramp is not distinguishable under the common forms of
 * colour blindness, so the palette is never allowed to carry meaning on its
 * own — every chart that uses it ships these labels alongside. Four views
 * needed the same three strings, so they are built in one place.
 */
export async function bandLabels(): Promise<BandLabels> {
  const t = await getTranslator();
  return {
    green: t("band.primed"),
    yellow: t("band.adequate"),
    red: t("band.compromised"),
  };
}
