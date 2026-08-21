import {
  ChartPanelSkeleton,
  PageHeaderSkeleton,
  StatGridSkeleton,
} from "./skeleton";

/**
 * The shape every analytical view shares: a title block, a row of four tiles,
 * then a stack of charts.
 *
 * Recovery, strain and sleep differ in how many charts and how tall they are,
 * which is all this takes as an argument. Writing three near-identical route
 * loading files instead would guarantee they drift apart from the pages they
 * stand in for.
 */
export function AnalyticsPageLoading({ charts }: { charts: number[] }) {
  return (
    <div className="space-y-5">
      <PageHeaderSkeleton />
      <StatGridSkeleton />
      {charts.map((height, i) => (
        <ChartPanelSkeleton key={i} height={height} />
      ))}
    </div>
  );
}
