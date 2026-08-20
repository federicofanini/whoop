import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatDelta } from "@/lib/utils";

/**
 * A stat tile is the right form when the answer is one number. Reaching for a
 * chart to show a single value is the most common way a dashboard misses its point.
 */
export function StatTile({
  label,
  value,
  unit,
  caption,
  accent,
  delta,
  deltaLabel,
  deltaGood,
}: {
  label: string;
  value: string | number;
  unit?: string;
  caption?: string;
  /** A colour bar, never the only carrier of meaning — the value and caption say it too. */
  accent?: string;
  delta?: number;
  deltaLabel?: string;
  /** Whether a positive delta is a good thing. Resting HR going up is not. */
  deltaGood?: boolean;
}) {
  const deltaPositive = typeof delta === "number" && delta > 0;
  const deltaIsGood = deltaGood === undefined ? deltaPositive : deltaPositive === deltaGood;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-hairline bg-surface p-4 sm:p-5">
      {accent ? (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ backgroundColor: accent }}
        />
      ) : null}

      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>

      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="text-[30px] font-semibold leading-none tracking-tight text-ink">
          {value}
        </span>
        {unit ? <span className="text-[13px] font-medium text-ink-2">{unit}</span> : null}
      </p>

      {typeof delta === "number" ? (
        <p
          className={cn(
            "mt-2 text-[12px] font-medium tabular",
            deltaIsGood ? "text-good" : "text-critical",
          )}
        >
          {/* Arrow plus sign plus text: never colour alone. */}
          <span aria-hidden>{deltaPositive ? "▲" : "▼"} </span>
          {formatDelta(delta, Math.abs(delta) < 10 ? 1 : 0)}
          {deltaLabel ? <span className="text-muted"> {deltaLabel}</span> : null}
        </p>
      ) : null}

      {caption ? <p className="mt-2 text-[12px] leading-relaxed text-muted">{caption}</p> : null}
    </div>
  );
}

/** The one number a page is built around. */
export function HeroFigure({
  value,
  unit,
  label,
  color,
  status,
  children,
}: {
  value: string | number;
  unit?: string;
  label: string;
  color?: string;
  /** The written half of a status pairing. Required wherever `color` carries meaning. */
  status?: string;
  children?: ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-3 flex items-baseline gap-2">
        <span
          className="text-[64px] font-semibold leading-[0.9] tracking-tight sm:text-[76px]"
          style={{ color: color ?? undefined }}
        >
          {value}
        </span>
        {unit ? <span className="text-xl font-medium text-ink-2">{unit}</span> : null}
      </p>
      {status ? (
        <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-hairline bg-surface-2 px-3 py-1 text-[12px] font-medium text-ink-2">
          <span
            aria-hidden
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: color ?? "currentColor" }}
          />
          {status}
        </p>
      ) : null}
      {children}
    </div>
  );
}
