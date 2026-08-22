"use client";

import { useActionState, useRef } from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { CODE_LENGTH } from "@/core/auth/code";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { loginAction } from "./actions";
import { initialLoginState, type LoginState } from "./login-state";

/**
 * Two steps in one form.
 *
 * Which step is showing lives in the action's own state rather than in a
 * `useState` beside it, so the username survives a failed verification without
 * the client having to hold a copy of anything the server already knows.
 */
export function TelegramForm({ next, botUsername }: { next: string; botUsername: string }) {
  const t = useT();
  const [state, action, pending] = useActionState<LoginState, FormData>(
    loginAction,
    initialLoginState,
  );
  // Needed so the code field can submit the form itself once it is full.
  const formRef = useRef<HTMLFormElement>(null);

  const verifying = state.step === "verify";

  return (
    <div className="space-y-5">
      <ol className="space-y-2">
        {["one", "two", "three"].map((step, index) => (
          <li key={step} className="flex gap-3 text-[13px] leading-relaxed text-muted">
            <span className="numeral shrink-0 text-[12px]">
              {(index + 1).toString().padStart(2, "0")}
            </span>
            {index === 0 && botUsername ? (
              <span>
                {t("signIn.telegram.step.one")}{" "}
                <a
                  href={`https://t.me/${botUsername}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-ink underline underline-offset-4"
                >
                  @{botUsername}
                </a>
              </span>
            ) : (
              <span>{t(`signIn.telegram.step.${step}`)}</span>
            )}
          </li>
        ))}
      </ol>

      <form ref={formRef} action={action} className="space-y-3">
        <input type="hidden" name="next" value={next} />

        <div>
          <label className="eyebrow mb-1.5 block" htmlFor="username">
            {t("signIn.telegram.username")}
          </label>
          <div className="relative">
            {/*
              The @ is chrome, not content: it sits outside the field so it
              cannot be selected, typed over or deleted, which is the whole
              point — it says "this is a Telegram username" without the member
              having to know whether to type it. It is aria-hidden because the
              label already names the field, and the value never includes it.
            */}
            <span
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[13px] text-muted"
            >
              @
            </span>
            <input
              id="username"
              name="username"
              required
              autoComplete="username"
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
              defaultValue={state.username}
              // Someone pasting "@marco" would otherwise read "@@marco".
              onInput={(event) => {
                const field = event.currentTarget;
                const stripped = field.value.replace(/@/g, "");
                if (stripped !== field.value) field.value = stripped;
              }}
              // Locked once a code is out, so the code and the name on screen
              // cannot drift apart. Read-only rather than disabled: a disabled
              // field is not submitted, and the action needs it back.
              readOnly={verifying}
              placeholder="your_username"
              className="w-full border border-hairline bg-surface py-2 pl-6 pr-3 font-mono text-[13px] text-ink placeholder:text-muted read-only:text-muted"
            />
          </div>
        </div>

        {verifying ? (
          <div>
            <label className="eyebrow mb-1.5 block" htmlFor="code">
              {t("signIn.telegram.code")}
            </label>
            <InputOTP
              // Remounts after a rejected code, which is what empties the
              // boxes and lets onComplete fire again.
              key={state.attempt}
              id="code"
              name="code"
              maxLength={CODE_LENGTH}
              pattern={REGEXP_ONLY_DIGITS}
              autoFocus
              disabled={pending}
              containerClassName="w-full"
              // Six digits is the whole form. Making somebody move to a button
              // after the last one is a step the code itself already signalled
              // was the end.
              onComplete={() => formRef.current?.requestSubmit()}
            >
              <InputOTPGroup className="w-full">
                {Array.from({ length: CODE_LENGTH }, (_, index) => (
                  <InputOTPSlot key={index} index={index} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="primary" disabled={pending}>
            {pending
              ? t("signIn.telegram.working")
              : verifying
                ? t("signIn.telegram.verify")
                : t("signIn.telegram.send")}
          </Button>

          {verifying ? (
            <Button type="submit" name="intent" value="restart" variant="quiet" disabled={pending}>
              {t("signIn.telegram.resend")}
            </Button>
          ) : null}
        </div>

        {state.errorKey ? (
          <p role="alert" className="text-[13px] text-critical">
            {t(state.errorKey)}
          </p>
        ) : null}
        {state.noticeKey && !state.errorKey ? (
          <p role="status" className="text-[13px] text-muted">
            {t(state.noticeKey)}
          </p>
        ) : null}
      </form>
    </div>
  );
}
