import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 7h 32m — WHOOP's own duration idiom, and shorter than "7 hours 32 minutes". */
export function formatDuration(milli: number): string {
  const totalMinutes = Math.round(milli / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

export function formatClock(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Signed deltas need their sign shown even when positive. */
export function formatDelta(value: number, digits = 0): string {
  const rounded = Number(value.toFixed(digits));
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(digits)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * The date format the recovery strip uses in its tooltips.
 *
 * Noon rather than midnight: a bare `yyyy-mm-dd` parses as UTC, and formatting
 * that in a western timezone shows the previous day.
 */
export function stripDate(t: { date: (value: Date, options?: Intl.DateTimeFormatOptions) => string }) {
  return (iso: string) =>
    t.date(new Date(`${iso}T12:00:00`), { weekday: "short", day: "numeric", month: "short" });
}
