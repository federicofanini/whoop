"use client";

import { useEffect } from "react";

/**
 * The last line of defence.
 *
 * The data layer already turns a failed query into an empty result so a broken
 * connection costs one panel rather than the page. This catches what that
 * cannot — a bug in a component, a malformed row — and offers the one action
 * that ever helps, rather than showing a stack trace to somebody who wanted to
 * know their recovery score.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="border border-hairline bg-surface p-6">
      <h1 className="text-[17px] font-semibold tracking-tight text-ink">
        Something went wrong on this page.
      </h1>
      <p className="mt-2 max-w-prose text-[13px] leading-relaxed text-ink-2">
        Your data is untouched — this is a rendering failure, not a sync one. Trying again is safe.
      </p>
      {error.digest ? (
        <p className="numeral mt-3 text-[12px] text-muted">Reference: {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="mt-5 bg-ink px-4 py-2.5 text-[13px] font-semibold text-plane transition-colors hover:bg-ink-2"
      >
        Try again
      </button>
    </div>
  );
}
