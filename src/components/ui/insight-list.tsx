import type { Insight, InsightTone } from "@/lib/analytics/insights";
import { status } from "@/lib/theme";

/**
 * Insights carry a tone, and tone is a status role — so each one ships with an
 * icon and a word, never a colour on its own.
 */
const TONE: Record<InsightTone, { color: string; icon: string; word: string }> = {
  positive: { color: status.good, icon: "▲", word: "Good" },
  neutral: { color: "#898781", icon: "●", word: "Note" },
  caution: { color: status.warning, icon: "▲", word: "Watch" },
  alert: { color: status.critical, icon: "■", word: "Alert" },
};

export function InsightList({ insights, limit }: { insights: Insight[]; limit?: number }) {
  const shown = limit ? insights.slice(0, limit) : insights;

  if (shown.length === 0) {
    return (
      <p className="text-[13px] leading-relaxed text-muted">
        Nothing stands out today — your numbers are sitting inside their usual range.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {shown.map((insight) => {
        const tone = TONE[insight.tone];
        return (
          <li
            key={insight.id}
            className="rounded-xl border border-hairline bg-surface-2 p-4"
          >
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
                  <span className="sr-only">{tone.word}: </span>
                  {insight.title}
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{insight.detail}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
