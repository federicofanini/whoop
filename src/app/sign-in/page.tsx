import { redirect } from "next/navigation";
import { GOOGLE_SIGN_IN_ENABLED } from "@/core/auth/providers";
import { isSessionSecretConfigured } from "@/core/auth/token";
import { isDbConfigured } from "@/core/db";
import { BOT_USERNAME, isBotConfigured } from "@/core/telegram/bot";
import { getViewer } from "@/server/auth";
import { getTranslator } from "@/server/locale";
import { isSupabaseConfigured } from "@/server/supabase";
import { PageHeader, Panel, PanelHeader } from "@/components/ui/panel";
import { GoogleButton } from "./google-button";
import { TelegramForm } from "./telegram-form";
import { safeNext } from "./login-state";

export const dynamic = "force-dynamic";

/**
 * Two panels, one per method, in the order they are usable.
 *
 * Google keeps its panel even while it is closed. Leaving it visible is the
 * point: the plan is a profile that has proved both, so a member who signs in
 * over Telegram today should already be able to see what the second half will
 * be rather than meet it as a surprise later.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslator();
  const next = safeNext(params.next);

  if (await getViewer()) redirect(next);

  const telegramReady = isBotConfigured() && isDbConfigured() && isSessionSecretConfigured();
  const googleNotice = googleNoticeKey();

  return (
    <div className="mx-auto max-w-md space-y-5 py-10">
      <PageHeader title={t("signIn.title")} description={t("signIn.lead")} />

      {params.error ? (
        <p className="border border-hairline bg-surface-2 p-4 text-[13px] text-critical">
          {t("signIn.error", { message: params.error })}
        </p>
      ) : null}

      <Panel>
        <PanelHeader
          title={t("signIn.telegram.title")}
          subtitle={t("signIn.telegram.sub")}
        />
        {telegramReady ? (
          <TelegramForm next={next} botUsername={BOT_USERNAME} />
        ) : (
          <p className="text-[13px] leading-relaxed text-ink-2">
            {t("signIn.telegram.unconfigured")}
          </p>
        )}
      </Panel>

      <Panel>
        <PanelHeader title={t("signIn.google.title")} subtitle={t("signIn.google.sub")} />
        <GoogleButton
          label={t("signIn.google.button")}
          next={next}
          comingSoon={!GOOGLE_SIGN_IN_ENABLED}
        />
        {googleNotice ? (
          <p className="mt-3 text-[13px] leading-relaxed text-muted">{t(googleNotice)}</p>
        ) : null}
      </Panel>
    </div>
  );
}

/** What to say under the Google button: closed, misconfigured, or nothing. */
function googleNoticeKey(): string | null {
  if (!GOOGLE_SIGN_IN_ENABLED) return "signIn.google.soon";
  return isSupabaseConfigured() ? null : "signIn.unconfigured";
}
