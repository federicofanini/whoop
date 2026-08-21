import { Suspense } from "react";
import { getTranslator } from "@/server/locale";
import { getToday } from "@/server/analytics";
import { getViewerUser } from "@/server/dashboard";
import { PageHeader } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveView } from "@/components/live/live-view";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const t = await getTranslator();

  return (
    <div>
      <PageHeader
        eyebrow={t("nav.live")}
        title={t("livePage.title")}
        description={t("livePage.lead")}
      />
      <Suspense fallback={<Skeleton className="h-[420px] w-full" />}>
        <LiveSession />
      </Suspense>
    </div>
  );
}

/**
 * The two numbers the live view needs to draw its zones.
 *
 * This used to read the whole dashboard — cycles, recoveries, sleeps and
 * workouts — to find a max heart rate stored on the account row and a resting
 * heart rate from the latest recovery. Now it reads the account and the
 * shallowest slice, and the Bluetooth connect button is on screen before either
 * comes back.
 */
async function LiveSession() {
  const [user, today] = await Promise.all([getViewerUser(), getToday()]);
  return <LiveView maxHr={user.maxHeartRate} restingHr={today?.restingHeartRate ?? null} />;
}
