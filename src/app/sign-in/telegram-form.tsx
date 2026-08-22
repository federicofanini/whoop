"use client";

import { useActionState } from "react";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
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

      <form action={action} className="space-y-3">
        <input type="hidden" name="next" value={next} />

        <div>
          <label className="eyebrow mb-1.5 block" htmlFor="username">
            {t("signIn.telegram.username")}
          </label>
          <input
            id="username"
            name="username"
            required
            autoComplete="username"
            spellCheck={false}
            autoCapitalize="none"
            defaultValue={state.username}
            // Locked once a code is out, so the code and the name on screen
            // cannot drift apart. Read-only rather than disabled: a disabled
            // field is not submitted, and the action needs it back.
            readOnly={verifying}
            placeholder="@your_username"
            className="w-full border border-hairline bg-surface px-3 py-2 font-mono text-[13px] text-ink placeholder:text-muted read-only:text-muted"
          />
        </div>

        {verifying ? (
          <div>
            <label className="eyebrow mb-1.5 block" htmlFor="code">
              {t("signIn.telegram.code")}
            </label>
            <input
              id="code"
              name="code"
              required
              // Numeric keypad on a phone, without the spinners `type=number`
              // brings and without rejecting a pasted "123 456".
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              autoFocus
              placeholder="000000"
              className="w-full border border-hairline bg-surface px-3 py-2 font-mono text-[18px] tracking-[0.4em] text-ink placeholder:text-muted"
            />
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
