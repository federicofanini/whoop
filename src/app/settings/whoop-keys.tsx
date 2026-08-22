"use client";

import { useActionState } from "react";
import { saveWhoopKeys, removeWhoopKeys, type CredentialsResult } from "./credentials-actions";
import { useT } from "@/components/i18n-provider";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";

/**
 * Where a member brings their own WHOOP developer app.
 *
 * Shown to everyone, not just those locked out: someone holding a shared slot
 * may still prefer their own app, and moving over frees a slot for a family
 * member who has no alternative.
 */
export function WhoopKeys({
  hasOwnKeys,
  maskedClientId,
  remaining,
  limit,
  held,
  locked,
}: {
  hasOwnKeys: boolean;
  maskedClientId: string | null;
  /** Genuinely free slots. A slot this member holds is used, not free. */
  remaining: number;
  limit: number;
  /** Whether this member is occupying one of them. */
  held: boolean;
  /** True when the shared slots are gone and this member holds none. */
  locked: boolean;
}) {
  const t = useT();
  const [state, action, pending] = useActionState<CredentialsResult | null, FormData>(
    saveWhoopKeys,
    null,
  );

  return (
    <Panel>
      <PanelHeader
        title={t("settings.keys.title")}
        subtitle={t("settings.keys.sub", { limit })}
      />

      <div className="mb-5 border border-hairline p-4">
        <p className="eyebrow mb-2">{t("settings.keys.slots")}</p>
        <p className="numeral text-[22px] font-medium text-ink">
          {remaining}
          <span className="text-[13px] text-muted"> / {limit}</span>
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          {locked
            ? t("settings.keys.slotsGone")
            : hasOwnKeys
              ? t("settings.keys.usingOwn")
              : held
                ? t("settings.keys.slotsHeld", { remaining })
                : t("settings.keys.slotsFree", { remaining })}
        </p>
      </div>

      {hasOwnKeys ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border border-hairline p-4">
          <div>
            <p className="eyebrow mb-1.5">{t("settings.keys.stored")}</p>
            <p className="numeral text-[13px] text-ink">{maskedClientId}</p>
          </div>
          <form action={removeWhoopKeys}>
            <Button type="submit" variant="secondary">
              {t("settings.keys.remove")}
            </Button>
          </form>
        </div>
      ) : null}

      <form action={action} className="space-y-3">
        <div>
          <label className="eyebrow mb-1.5 block" htmlFor="clientId">
            {t("settings.keys.clientId")}
          </label>
          <input
            id="clientId"
            name="clientId"
            required
            autoComplete="off"
            spellCheck={false}
            placeholder="00000000-0000-0000-0000-000000000000"
            className="w-full border border-hairline bg-surface px-3 py-2 font-mono text-[13px] text-ink placeholder:text-muted"
          />
        </div>

        <div>
          <label className="eyebrow mb-1.5 block" htmlFor="clientSecret">
            {t("settings.keys.clientSecret")}
          </label>
          <input
            id="clientSecret"
            name="clientSecret"
            required
            // type=password so it is masked on screen and kept out of autofill.
            type="password"
            autoComplete="off"
            spellCheck={false}
            className="w-full border border-hairline bg-surface px-3 py-2 font-mono text-[13px] text-ink"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? t("settings.keys.saving") : t("settings.keys.save")}
          </Button>
          {state ? (
            <p className={`text-[13px] ${state.ok ? "text-good" : "text-critical"}`}>
              {t(state.key)}
            </p>
          ) : null}
        </div>
      </form>

      <ol className="mt-5 space-y-2 border-t border-hairline pt-4">
        {["one", "two", "three"].map((step, index) => (
          <li key={step} className="flex gap-3 text-[13px] leading-relaxed text-muted">
            <span className="numeral shrink-0 text-[12px]">
              {(index + 1).toString().padStart(2, "0")}
            </span>
            {t(`settings.keys.step.${step}`)}
          </li>
        ))}
      </ol>
    </Panel>
  );
}
