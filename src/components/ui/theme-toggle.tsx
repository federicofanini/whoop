"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/i18n-provider";

type Theme = "light" | "dark";

/**
 * Flips the theme and remembers it.
 *
 * Deliberately a two-state toggle rather than light/dark/system: the inline
 * head script already follows the system when nothing is stored, so "system" is
 * the default rather than a third thing to choose. Once you have expressed a
 * preference, honouring it is the whole point.
 */
export function ThemeToggle() {
  const t = useT();
  const [theme, setTheme] = useState<Theme | null>(null);

  // The server cannot know the theme, so the icon renders only after mount.
  // Reading it from the DOM rather than storage keeps it in step with whatever
  // the head script decided.
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
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
      aria-label={`${t("nav.theme")}: ${theme === "dark" ? t("nav.themeDark") : t("nav.themeLight")}`}
      className="flex h-[26px] w-[26px] items-center justify-center border border-hairline text-muted transition-colors hover:text-ink"
    >
      {/* Drawn rather than a glyph: the emoji sun and moon render at wildly
          different weights across platforms and one of them always looks wrong. */}
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
        {theme === "dark" ? (
          <path
            d="M13.5 9.5A6 6 0 0 1 6.5 2.5a6 6 0 1 0 7 7Z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        ) : (
          <>
            <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.3" />
            <path
              d="M8 1v1.6M8 13.4V15M15 8h-1.6M2.6 8H1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1M12.9 12.9l-1.1-1.1M4.2 4.2 3.1 3.1"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </>
        )}
      </svg>
    </button>
  );
}
