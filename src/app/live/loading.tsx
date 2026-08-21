import { PageHeaderSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function LiveLoading() {
  return (
    <div>
      <PageHeaderSkeleton />
      <Skeleton className="h-[420px] w-full" />
    </div>
  );
}
