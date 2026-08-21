"use client";

import dynamic from "next/dynamic";
import type { ComponentProps, ComponentType } from "react";
import { ChartSkeleton } from "@/components/ui/skeleton";

import type { BalanceScatter as BalanceScatterImpl } from "./balance-chart";
import type { DeviationBars as DeviationBarsImpl } from "./balance-chart";
import type { LoadChart as LoadChartImpl } from "./balance-chart";
import type { BaselineChart as BaselineChartImpl } from "./baseline-chart";
import type { RecoveryBars as RecoveryBarsImpl } from "./recovery-bars";
import type {
  BedtimeConsistencyChart as BedtimeConsistencyChartImpl,
  SleepDebtChart as SleepDebtChartImpl,
  SleepRecoveryScatter as SleepRecoveryScatterImpl,
  SleepStagesChart as SleepStagesChartImpl,
} from "./sleep-charts";
import type { StrainBars as StrainBarsImpl } from "./strain-charts";

/**
 * Every chart, loaded on demand and never on the server.
 *
 * Recharts is by a wide margin the largest thing this app ships, and it was
 * being pulled into the first-load bundle of every route — including the ones
 * whose charts sit two screens below the fold. Splitting it out means the
 * numbers, insights and navigation are interactive while the plotting library
 * is still arriving.
 *
 * `ssr: false` is not a compromise here. Every chart is drawn inside a recharts
 * `ResponsiveContainer`, which measures its parent before it renders anything —
 * so the server pass produced an empty `<div>` regardless. Rendering it server
 * side cost markup and hydration work in exchange for no pixels at all.
 *
 * The wrapper reserves the chart's height up front so the panel does not resize
 * underneath the reader when the chunk lands.
 */

interface Reserved {
  height?: number;
}

function lazyChart<P extends Reserved>(
  load: () => Promise<ComponentType<P>>,
  fallbackHeight: number,
): ComponentType<P> {
  const Chart = dynamic(load, {
    ssr: false,
    loading: () => <ChartSkeleton height="100%" />,
  }) as ComponentType<P>;

  function Reserve(props: P) {
    return (
      <div style={{ minHeight: props.height ?? fallbackHeight }}>
        <Chart {...props} />
      </div>
    );
  }
  Reserve.displayName = "LazyChart";
  return Reserve;
}

export const RecoveryBars = lazyChart<ComponentProps<typeof RecoveryBarsImpl>>(
  () => import("./recovery-bars").then((m) => m.RecoveryBars),
  220,
);

export const StrainBars = lazyChart<ComponentProps<typeof StrainBarsImpl>>(
  () => import("./strain-charts").then((m) => m.StrainBars),
  220,
);

export const BaselineChart = lazyChart<ComponentProps<typeof BaselineChartImpl>>(
  () => import("./baseline-chart").then((m) => m.BaselineChart),
  260,
);

export const BalanceScatter = lazyChart<ComponentProps<typeof BalanceScatterImpl>>(
  () => import("./balance-chart").then((m) => m.BalanceScatter),
  320,
);

export const DeviationBars = lazyChart<ComponentProps<typeof DeviationBarsImpl>>(
  () => import("./balance-chart").then((m) => m.DeviationBars),
  200,
);

export const LoadChart = lazyChart<ComponentProps<typeof LoadChartImpl>>(
  () => import("./balance-chart").then((m) => m.LoadChart),
  220,
);

export const SleepStagesChart = lazyChart<ComponentProps<typeof SleepStagesChartImpl>>(
  () => import("./sleep-charts").then((m) => m.SleepStagesChart),
  280,
);

export const SleepDebtChart = lazyChart<ComponentProps<typeof SleepDebtChartImpl>>(
  () => import("./sleep-charts").then((m) => m.SleepDebtChart),
  200,
);

export const BedtimeConsistencyChart = lazyChart<
  ComponentProps<typeof BedtimeConsistencyChartImpl>
>(() => import("./sleep-charts").then((m) => m.BedtimeConsistencyChart), 220);

export const SleepRecoveryScatter = lazyChart<ComponentProps<typeof SleepRecoveryScatterImpl>>(
  () => import("./sleep-charts").then((m) => m.SleepRecoveryScatter),
  280,
);
