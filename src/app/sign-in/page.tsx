import { redirect } from "next/navigation";
import { getViewer } from "@/server/auth";
import { getTranslator } from "@/server/locale";
import { isSupabaseConfigured } from "@/server/supabase";
import { PageHeader, Panel } from "@/components/ui/panel";
import { GoogleButton } from "./google-button";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslator();

  if (await getViewer()) redirect(params.next?.startsWith("/") ? params.next : "/");

  return (
    <div className="mx-auto max-w-md space-y-5 py-10">
      <PageHeader title={t("signIn.title")} description={t("signIn.lead")} />

      {params.error ? (
        <p className="border border-hairline bg-surface-2 p-4 text-[13px] text-critical">
          {t("signIn.error", { message: params.error })}
        </p>
      ) : null}

      <Panel>
        {isSupabaseConfigured() ? (
          <GoogleButton label={t("signIn.google")} next={params.next ?? "/"} />
        ) : (
          <p className="text-[13px] leading-relaxed text-ink-2">{t("signIn.unconfigured")}</p>
        )}
      </Panel>
    </div>
  );
}
