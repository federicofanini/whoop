import type { DayRecord } from "@/core/analytics/types";
import { recoveryColor } from "@/lib/theme";

/**
 * Fourteen days of recovery as thin bars.
 *
 * Plain HTML rather than a charting library: there are no axes, no tooltip and
 * no scale to speak of — it exists to answer "is today typical?" at a glance,
 * and a full chart component would be more machinery than that question
 * deserves. The colours are `var(--…)` strings, so this tracks the theme
 * without knowing what the theme is.
 */
export function RecoveryStrip({
  days,
  label,
  formatDate,
}: {
  days: DayRecord[];
  label: string;
  /** Tooltip date, formatted by the caller's locale. */
  formatDate: (iso: string) => string;
}) {
  const window = days.slice(-14).filter((d) => typeof d.recoveryScore === "number");
  if (window.length === 0) return null;

  return (
    <div>
      <p className="eyebrow mb-2.5">{label}</p>
      <div className="flex h-16 items-end gap-[3px]">
        {window.map((day, index) => {
          const score = day.recoveryScore as number;
          const isToday = index === window.length - 1;
          return (
            <div
              key={day.date}
              className="flex-1"
              style={{
                height: `${Math.max(8, score)}%`,
                backgroundColor: recoveryColor(score),
                // Today reads forward; the history behind it recedes — but only
                // a little. At 0.4 the bands stopped being distinguishable from
                // each other, which is the one thing the strip has to show.
                opacity: isToday ? 1 : 0.62,
              }}
              title={`${formatDate(day.date)} — ${score}%`}
            />
          );
        })}
      </div>
    </div>
  );
}
