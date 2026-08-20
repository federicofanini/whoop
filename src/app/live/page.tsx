import { loadViewerDashboard } from "@/server/dashboard";
import { getTranslator } from "@/server/locale";
import { PageHeader } from "@/components/ui/panel";
import { LiveView } from "@/components/live/live-view";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const t = await getTranslator();
  const { user, days } = await loadViewerDashboard();
  const today = days[days.length - 1];

  return (
    <div>
      <PageHeader
        eyebrow={t("nav.live")}
        title={t("livePage.title")}
        description={t("livePage.lead")}
      />
      <LiveView
        maxHr={user.maxHeartRate}
        restingHr={today?.restingHeartRate ?? null}
      />
    </div>
  );
}
