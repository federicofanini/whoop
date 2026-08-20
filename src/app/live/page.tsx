import { loadDashboardData } from "@/lib/data/load";
import { PageHeader } from "@/components/ui/panel";
import { LiveView } from "@/components/live/live-view";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const { user, days } = await loadDashboardData();
  const today = days[days.length - 1];

  return (
    <div>
      <PageHeader
        eyebrow="Live"
        title="Real-time heart rate"
        description="The WHOOP API has no continuous heart-rate endpoint, so this comes over Bluetooth instead — the standard Heart Rate Service the strap exposes when you turn on Heart Rate Broadcast. A Mac holds the connection; every dashboard subscribes."
      />
      <LiveView maxHr={user.maxHeartRate} restingHr={today?.restingHeartRate ?? null} />
    </div>
  );
}
