"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

/**
 * Flips the theme and remembers it.
 *
 * Deliberately a two-state toggle rather than light/dark/system: the inline
 * head script already follows the system when nothing is stored, so "system" is
 * the default rather than a third thing to choose. Once you have expressed a
 * preference, honouring it is the whole point.
 */
export function ThemeToggle({
  label,
  labels,
}: {
  label: string;
  labels: { light: string; dark: string; system: string };
}) {
  const [theme, setTheme] = useState<Theme | null>(null);

  // The server cannot know the theme, so the button renders its icon only after
  // mount. Reading it from the DOM rather than storage keeps it in step with
  // whatever the head script decided.
  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    setTheme(current === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    try {
      localStorage.setItem("strap-theme", next);
    } catch {
      // Private mode: the theme still applies for this page view.
    }
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`${label}: ${theme === "dark" ? labels.dark : labels.light}`}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-lg border border-hairline text-muted transition-colors hover:text-ink",
      )}
    >
      {/* Both glyphs ship; the invisible one keeps the button from resizing. */}
      <span aria-hidden className="text-[13px] leading-none">
        {theme === "dark" ? "☾" : "☀"}
      </span>
    </button>
  );
}
