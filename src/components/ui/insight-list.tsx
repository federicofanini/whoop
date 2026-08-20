import type { Insight, InsightTone } from "@/core/analytics/insights";
import { translateInsight, type Translator } from "@/core/i18n";
import { status } from "@/lib/theme";

/**
 * Insights carry a tone, and tone is a status role — so each one ships with a
 * mark and a word, never a colour on its own.
 *
 * Rows share edges rather than floating apart: a list of findings is a table of
 * findings, and reads faster as one.
 */
const TONE: Record<InsightTone, { color: string; mark: string }> = {
  positive: { color: status.good, mark: "▲" },
  neutral: { color: "var(--color-muted)", mark: "■" },
  caution: { color: status.warning, mark: "▲" },
  alert: { color: status.critical, mark: "■" },
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
    <ul className="border-t border-hairline">
      {shown.map((insight) => {
        const tone = TONE[insight.tone];
        // The engine emits keys and numbers; the sentence is assembled here, in
        // whichever language the reader asked for.
        const { title, detail } = translateInsight(t, insight);

        return (
          <li key={insight.id} className="border-b border-hairline py-4">
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-[5px] shrink-0 text-[9px] leading-none"
                style={{ color: tone.color }}
              >
                {tone.mark}
              </span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-baseline gap-x-2.5 text-[14px] font-medium leading-snug text-ink">
                  {title}
                  <span className="eyebrow">{t(`tone.${insight.tone}`)}</span>
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
