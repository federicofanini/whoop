"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { sendFriendRequest, type ActionResult } from "@/app/friends/actions";
import { normalizeHandle } from "@/core/friends/handles";
import { resolveMessage } from "./messages";

export function AddFriendForm({
  labels,
  dict,
}: {
  labels: {
    placeholder: string;
    field: string;
    send: string;
    sending: string;
    willSend: (handle: string) => string;
  };
  dict: Record<string, string>;
}) {
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
            placeholder={labels.placeholder}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-label={labels.field}
            className="w-full  border border-hairline bg-surface-2 py-2.5 pl-7 pr-3.5 text-[14px] text-ink placeholder:text-muted focus:border-baseline focus:outline-none"
          />
        </div>
        <SubmitButton send={labels.send} sending={labels.sending} />
      </div>

      {preview && preview !== value.replace(/^@/, "") ? (
        <p className="text-[12px] text-muted">{labels.willSend(preview)}</p>
      ) : null}

      {state ? (
        <p className={`text-[13px] ${state.ok ? "text-good" : "text-critical"}`}>
          <span aria-hidden>{state.ok ? "✓ " : "✕ "}</span>
          {resolveMessage(dict, state)}
        </p>
      ) : null}
    </form>
  );
}

function SubmitButton({ send, sending }: { send: string; sending: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0  bg-ink px-5 py-2.5 text-[14px] font-semibold text-plane transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? sending : send}
    </button>
  );
}
