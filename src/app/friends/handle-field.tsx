"use client";

import { useActionState, useState } from "react";
import { updateHandle, type ActionResult } from "./actions";
import { normalizeHandle } from "@/core/friends/handles";
import { resolveMessage } from "@/components/friends/messages";

export function HandleField({
  handle,
  labels,
  dict,
}: {
  handle: string | null;
  labels: { field: string; rename: string };
  dict: Record<string, string>;
}) {
  const [state, action] = useActionState<ActionResult | null, FormData>(updateHandle, null);
  const [value, setValue] = useState(handle ?? "");
  const current = state?.ok ? normalizeHandle(value) : handle;

  return (
    <div className="space-y-3">
      {current ? (
        <p className="border border-hairline bg-surface-2 px-4 py-3 text-[15px] font-semibold text-ink">
          @{current}
        </p>
      ) : null}

      <form action={action} className="flex flex-col gap-2 sm:flex-row">
        <input
          name="handle"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-label={labels.field}
          className="flex-1  border border-hairline bg-surface-2 px-3.5 py-2.5 text-[14px] text-ink placeholder:text-muted focus:border-baseline focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0  border border-hairline px-4 py-2.5 text-[14px] font-medium text-ink-2 transition-colors hover:text-ink"
        >
          {labels.rename}
        </button>
      </form>

      {state ? (
        <p className={`text-[13px] ${state.ok ? "text-good" : "text-critical"}`}>
          {resolveMessage(dict, state)}
        </p>
      ) : null}
    </div>
  );
}
