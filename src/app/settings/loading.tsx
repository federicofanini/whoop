import { PageHeaderSkeleton } from "@/components/ui/skeleton";
import { PanelSkeleton } from "./_sections";

export default function SettingsLoading() {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton />
      <PanelSkeleton />
      <PanelSkeleton lines={1} />
      <PanelSkeleton lines={2} />
    </div>
  );
}
