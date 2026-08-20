import type { Insight, InsightTone } from "@/core/analytics/insights";
import { translateInsight, type Translator } from "@/core/i18n";
import { status } from "@/lib/theme";

/**
 * Insights carry a tone, and tone is a status role — so each one ships with an
 * icon and a word, never a colour on its own.
 */
const TONE: Record<InsightTone, { color: string; icon: string }> = {
  positive: { color: status.good, icon: "▲" },
  neutral: { color: "#898781", icon: "●" },
  caution: { color: status.warning, icon: "▲" },
  alert: { color: status.critical, icon: "■" },
};

export function InsightList({
  insights,
  limit,
  t,
}: {
  insights: Insight[];
  limit?: number;
  t: Translator;
}) {
  const shown = limit ? insights.slice(0, limit) : insights;

  if (shown.length === 0) {
    return <p className="text-[13px] leading-relaxed text-muted">{t("overview.nothingFlagged")}</p>;
  }

  return (
    <ul className="space-y-3">
      {shown.map((insight) => {
        const tone = TONE[insight.tone];
        // The engine emits keys and numbers; the sentence is assembled here, in
        // whichever language the reader asked for.
        const { title, detail } = translateInsight(t, insight);

        return (
          <li key={insight.id} className="rounded-xl border border-hairline bg-surface-2 p-4">
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-[3px] text-[11px] leading-none"
                style={{ color: tone.color }}
              >
                {tone.icon}
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold leading-snug text-ink">
                  {title}
                  <span className="ml-2 text-[11px] font-medium uppercase tracking-wide text-muted">
                    {t(`tone.${insight.tone}`)}
                  </span>
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{detail}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
