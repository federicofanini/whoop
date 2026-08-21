import Link from "next/link";
import { getTranslator } from "@/server/locale";
import { getBalance, getBaselines, getInsights, getLoad, getSleepSummary, getToday } from "@/server/analytics";
import { getAllDays, getCoreDays, getViewerUser } from "@/server/dashboard";
import { optimalStrain } from "@/core/analytics/load";
import { PanelHeader } from "@/components/ui/panel";
import { HeroFigure, StatTile } from "@/components/ui/stat";
import { InsightList } from "@/components/ui/insight-list";
import { RecoveryStrip } from "@/components/ui/recovery-strip";
import {
  ChartSkeleton,
  PanelHeaderSkeleton,
  RecoveryStripSkeleton,
  Skeleton,
} from "@/components/ui/skeleton";
import { RecoveryBars, StrainBars } from "@/components/charts/lazy";
import { recoveryColor, recoveryLabelKey, series } from "@/lib/theme";
import { bandLabels } from "./band-labels";
import { stripDate } from "@/lib/utils";

/**
 * The overview, one panel at a time.
 *
 * Each export below is an independent unit of work: it asks for the shallowest
 * slice it can use, and the page suspends it separately. The recovery figure
 * needs cycles and recoveries; the insight list additionally needs sleeps; the
 * strain bars additionally need workouts. They arrive in that order rather than
 * all at once behind the slowest of the three.
 */

/* -- Greeting ------------------------------------------------------------- */

export async function Greeting() {
  const [t, user] = await Promise.all([getTranslator(), getViewerUser()]);

  return (
    <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-[28px]">
      {user.firstName ? t("overview.greeting", { name: user.firstName }) : t("overview.today")}
    </h1>
  );
}

export function GreetingSkeleton() {
  return <Skeleton className="mt-1.5 h-[34px] w-56" />;
}

/* -- Demo notice ---------------------------------------------------------- */

export async function DemoNotice() {
  const [t, user] = await Promise.all([getTranslator(), getViewerUser()]);
  if (!user.demo) return null;

  return (
    <div className="border border-hairline bg-surface p-4">
      <p className="text-[13px] leading-relaxed text-ink-2">
        <span className="font-semibold text-ink">{t("overview.demoTitle")}</span>{" "}
        {t("overview.demoBody")}{" "}
        <Link href="/settings" className="font-medium text-ink underline underline-offset-4">
          {t("overview.demoLink")}
        </Link>{" "}
        {t("overview.demoAfter")}
      </p>
    </div>
  );
}

/* -- Today's recovery ------------------------------------------------------ */

/**
 * The headline figure and the fortnight strip under it.
 *
 * Deliberately separate from the vitals row below, and deliberately reading the
 * shallowest slice: the recovery score is the single number this whole page
 * exists to show, and it comes from `recoveries`. Waiting for the sleep scan to
 * finish before printing it — which is what a combined section would do, since
 * the respiratory rate underneath is sleep-scored — would delay the one thing
 * nobody wants to wait for.
 */
export async function RecoveryHero() {
  const [t, today, days] = await Promise.all([getTranslator(), getToday(), getCoreDays()]);
  const recovery = today?.recoveryScore ?? null;

  return (
    <>
      <HeroFigure
        label={t("overview.recovery")}
        value={recovery ?? "—"}
        unit="%"
        color={recovery !== null ? recoveryColor(recovery) : undefined}
        status={recovery !== null ? t(recoveryLabelKey(recovery)) : undefined}
      />

      <div className="mt-8">
        <RecoveryStrip days={days} label={t("overview.last14")} formatDate={stripDate(t)} />
      </div>
    </>
  );
}

export function RecoveryHeroSkeleton() {
  return (
    <>
      <div>
        <Skeleton className="h-[11px] w-20" />
        <Skeleton className="mt-4 h-[64px] w-40 sm:h-[76px]" />
        <Skeleton className="mt-4 h-[26px] w-28" />
      </div>
      <div className="mt-8">
        <RecoveryStripSkeleton />
      </div>
    </>
  );
}

/** HRV, resting heart rate and respiratory rate, each against its own baseline. */
export async function VitalsRow() {
  const [t, today, baselines, sleep] = await Promise.all([
    getTranslator(),
    getToday(),
    getBaselines(),
    getSleepSummary(),
  ]);
  const lastNight = sleep.nights[sleep.nights.length - 1];

  return (
    <>
      <Vital
        label={t("overview.hrv")}
        value={today?.hrvMs ? `${today.hrvMs.toFixed(0)}` : "—"}
        unit="ms"
        delta={delta(baselines.hrv.latest, baselines.hrv.baseline)}
        good
      />
      <Vital
        label={t("overview.restingHr")}
        value={today?.restingHeartRate ? `${today.restingHeartRate}` : "—"}
        unit="bpm"
        delta={delta(baselines.restingHr.latest, baselines.restingHr.baseline)}
        good={false}
      />
      <Vital
        label={t("overview.respRate")}
        value={lastNight?.respiratoryRate ? lastNight.respiratoryRate.toFixed(1) : "—"}
        unit="rpm"
        delta={null}
      />
    </>
  );
}

export function VitalsRowSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div key={i}>
          <Skeleton className="h-[11px] w-12" />
          <Skeleton className="mt-2 h-[20px] w-14" />
        </div>
      ))}
    </>
  );
}

/* -- What it means --------------------------------------------------------- */

export async function TopInsights() {
  const [t, insights] = await Promise.all([getTranslator(), getInsights()]);
  return <InsightList insights={insights} limit={3} t={t} />;
}

export async function AllInsights() {
  const [t, insights] = await Promise.all([getTranslator(), getInsights()]);
  return <InsightList insights={insights} t={t} />;
}

/* -- Headline tiles -------------------------------------------------------- */

export async function StrainTile() {
  const [t, today] = await Promise.all([getTranslator(), getToday()]);
  const recovery = today?.recoveryScore ?? null;
  const target = recovery !== null ? optimalStrain(recovery) : null;

  return (
    <StatTile
      label={t("overview.dayStrain")}
      value={today?.strain?.toFixed(1) ?? "—"}
      accent={series.strain}
      caption={target ? t("overview.supports", { low: target.low, high: target.high }) : undefined}
    />
  );
}

export async function LoadTile() {
  const [t, load] = await Promise.all([getTranslator(), getLoad()]);

  return (
    <StatTile
      label={t("overview.loadRatio")}
      value={load.ratio.toFixed(2)}
      unit="×"
      accent={series.restingHr}
      caption={
        load.zone === "productive"
          ? t("overview.loadProductive")
          : load.zone === "overreaching"
            ? t("overview.loadOver")
            : t("overview.loadUnder")
      }
    />
  );
}

export async function LastNightTile() {
  const [t, sleep] = await Promise.all([getTranslator(), getSleepSummary()]);
  const lastNight = sleep.nights[sleep.nights.length - 1];

  return (
    <StatTile
      label={t("overview.sleepLastNight")}
      value={lastNight ? t.duration(lastNight.asleepMilli) : t("common.none")}
      accent={series.sleep}
      caption={
        lastNight?.performance != null
          ? t("overview.ofNeed", { percent: lastNight.performance })
          : undefined
      }
    />
  );
}

export async function SleepDebtTile() {
  const [t, sleep] = await Promise.all([getTranslator(), getSleepSummary()]);

  return (
    <StatTile
      label={t("overview.sleepDebt")}
      value={t.duration(sleep.debtMilli)}
      accent={series.sleep}
      caption={t("overview.debtCaption")}
    />
  );
}

/* -- Trailing charts ------------------------------------------------------- */

export async function RecoveryTrend() {
  const [t, days, labels] = await Promise.all([getTranslator(), getCoreDays(), bandLabels()]);

  return (
    <>
      <PanelHeader
        title={t("overview.recovery30")}
        subtitle={t("overview.recovery30Sub")}
        action={<PanelLink href="/recovery" label={t("common.detail")} />}
      />
      <RecoveryBars days={days.slice(-30)} bandLabels={labels} />
    </>
  );
}

export async function StrainTrend() {
  // The only thing on this page that reads the workouts table, and the last to
  // arrive because of it — the bars are shaded by whether a session was logged.
  const [t, days, balance] = await Promise.all([getTranslator(), getAllDays(), getBalance()]);

  return (
    <>
      <PanelHeader
        title={t("overview.strain30")}
        subtitle={t("overview.strain30Sub", { over: balance.over, total: balance.points.length })}
        action={<PanelLink href="/strain" label={t("common.detail")} />}
      />
      <StrainBars days={days.slice(-30)} />
    </>
  );
}

export function TrendPanelSkeleton({ height = 220 }: { height?: number }) {
  return (
    <>
      <PanelHeaderSkeleton />
      <ChartSkeleton height={height} />
    </>
  );
}

/* -- Shared bits ----------------------------------------------------------- */

function PanelLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-[12px] font-medium text-muted transition-colors hover:text-ink-2"
    >
      {label}
    </Link>
  );
}

function delta(latest: number | null, baseline: number | null): number | null {
  return latest !== null && baseline !== null ? latest - baseline : null;
}

function Vital({
  label,
  value,
  unit,
  delta,
  good,
}: {
  label: string;
  value: string;
  unit: string;
  delta: number | null;
  good?: boolean;
}) {
  const positive = delta !== null && delta > 0;
  const isGood = good === undefined ? true : positive === good;

  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1.5">
        <span className="numeral text-[20px] font-semibold text-ink">{value}</span>
        <span className="ml-1 text-[12px] text-muted">{unit}</span>
        {delta !== null && Math.abs(delta) >= 0.5 ? (
          <span
            className={`ml-2 tabular text-[12px] font-medium ${isGood ? "text-good" : "text-critical"}`}
          >
            <span aria-hidden>{positive ? "▲" : "▼"}</span> {Math.abs(delta).toFixed(0)}
          </span>
        ) : null}
      </dd>
    </div>
  );
}
