"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { sendFriendRequest, type ActionResult } from "@/app/friends/actions";
import { normalizeHandle } from "@/lib/friends/handles";

export function AddFriendForm() {
  const [state, action] = useActionState<ActionResult | null, FormData>(sendFriendRequest, null);
  const [value, setValue] = useState("");

  // Normalising as you type is the honest thing to do: the handle that gets
  // looked up is the normalised one, so it is the one that should be on screen.
  const preview = normalizeHandle(value);

  return (
    <form action={action} className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <span
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] text-muted"
          >
            @
          </span>
          <input
            name="handle"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="brother.handle"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Their handle"
            className="w-full rounded-xl border border-hairline bg-surface-2 py-2.5 pl-7 pr-3.5 text-[14px] text-ink placeholder:text-muted focus:border-baseline focus:outline-none"
          />
        </div>
        <SubmitButton />
      </div>

      {preview && preview !== value.replace(/^@/, "") ? (
        <p className="text-[12px] text-muted">Will be sent to @{preview}</p>
      ) : null}

      {state ? (
        <p className={`text-[13px] ${state.ok ? "text-good" : "text-critical"}`}>
          <span aria-hidden>{state.ok ? "✓ " : "✕ "}</span>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 rounded-xl bg-ink px-5 py-2.5 text-[14px] font-semibold text-plane transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Sending…" : "Send request"}
    </button>
  );
}
