import Link from "next/link";
import { loadViewerDashboard } from "@/server/dashboard";
import { getTranslator } from "@/server/locale";
import { computeBaselines } from "@/core/analytics/baselines";
import { computeLoad, optimalStrain, summarizeBalance } from "@/core/analytics/load";
import { summarizeSleep } from "@/core/analytics/sleep";
import { generateInsights } from "@/core/analytics/insights";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { HeroFigure, StatTile } from "@/components/ui/stat";
import { InsightList } from "@/components/ui/insight-list";
import { RecoveryStrip } from "@/components/ui/recovery-strip";
import { RecoveryBars } from "@/components/charts/recovery-bars";
import { StrainBars } from "@/components/charts/strain-charts";
import { recoveryColor, recoveryLabelKey, series, type BandLabels } from "@/lib/theme";
import type { Translator } from "@/core/i18n";
import { stripDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const t = await getTranslator();
  const bandLabels: BandLabels = {
    green: t("band.primed"),
    yellow: t("band.adequate"),
    red: t("band.compromised"),
  };
  const { user, days } = await loadViewerDashboard();
  const today = days[days.length - 1];

  const baselines = computeBaselines(days);
  const load = computeLoad(days);
  const balance = summarizeBalance(days);
  const sleep = summarizeSleep(days);
  const insights = generateInsights(days);

  const recovery = today?.recoveryScore ?? null;
  const target = recovery !== null ? optimalStrain(recovery) : null;
  const lastNight = sleep.nights[sleep.nights.length - 1];

  return (
    <div className="space-y-5">
      <div className="mb-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            {t.date(new Date(), { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-[28px]">
            {user.firstName ? t("overview.greeting", { name: user.firstName }) : t("overview.today")}
          </h1>
        </div>
        <Link
          href="/live"
          className="rounded-xl border border-hairline bg-surface px-4 py-2 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink"
        >
          {t("overview.liveSession")}
        </Link>
      </div>

      {user.demo ? <DemoNotice t={t} /> : null}

      {/* The day's headline: one number, plus the numbers that produced it. */}
      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Panel className="flex flex-col justify-between">
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

          <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-hairline pt-5">
            <Vital
              label={t("overview.hrv")}
              value={today?.hrvMs ? `${today.hrvMs.toFixed(0)}` : "—"}
              unit="ms"
              delta={
                baselines.hrv.latest !== null && baselines.hrv.baseline !== null
                  ? baselines.hrv.latest - baselines.hrv.baseline
                  : null
              }
              good
            />
            <Vital
              label={t("overview.restingHr")}
              value={today?.restingHeartRate ? `${today.restingHeartRate}` : "—"}
              unit="bpm"
              delta={
                baselines.restingHr.latest !== null && baselines.restingHr.baseline !== null
                  ? baselines.restingHr.latest - baselines.restingHr.baseline
                  : null
              }
              good={false}
            />
            <Vital
              label={t("overview.respRate")}
              value={lastNight?.respiratoryRate ? lastNight.respiratoryRate.toFixed(1) : "—"}
              unit="rpm"
              delta={null}
            />
          </dl>
        </Panel>

        <Panel>
          <PanelHeader
            title={t("overview.meaning")}
            subtitle={t("overview.meaningSub")}
          />
          <InsightList insights={insights} limit={3} t={t} />
        </Panel>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={t("overview.dayStrain")}
          value={today?.strain?.toFixed(1) ?? "—"}
          accent={series.strain}
          caption={
            target
              ? t("overview.supports", { low: target.low, high: target.high })
              : undefined
          }
        />
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
        <StatTile
          label={t("overview.sleepDebt")}
          value={t.duration(sleep.debtMilli)}
          accent={series.sleep}
          caption={t("overview.debtCaption")}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title={t("overview.recovery30")}
            subtitle={t("overview.recovery30Sub")}
            action={<PanelLink href="/recovery" label={t("common.detail")} />}
          />
          <RecoveryBars days={days.slice(-30)} bandLabels={bandLabels} />
        </Panel>

        <Panel>
          <PanelHeader
            title={t("overview.strain30")}
            subtitle={t("overview.strain30Sub", { over: balance.over, total: balance.points.length })}
            action={<PanelLink href="/strain" label={t("common.detail")} />}
          />
          <StrainBars days={days.slice(-30)} />
        </Panel>
      </div>

      <Panel>
        <PanelHeader title={t("overview.everything")} subtitle={t("overview.everythingSub")} />
        <InsightList insights={insights} t={t} />
      </Panel>
    </div>
  );
}

function PanelLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-[12px] font-medium text-muted transition-colors hover:text-ink-2">
      {label}
    </Link>
  );
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
      <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</dt>
      <dd className="mt-1.5">
        <span className="text-[20px] font-semibold tabular text-ink">{value}</span>
        <span className="ml-1 text-[12px] text-muted">{unit}</span>
        {delta !== null && Math.abs(delta) >= 0.5 ? (
          <span className={`ml-2 text-[12px] font-medium tabular ${isGood ? "text-good" : "text-critical"}`}>
            <span aria-hidden>{positive ? "▲" : "▼"}</span> {Math.abs(delta).toFixed(0)}
          </span>
        ) : null}
      </dd>
    </div>
  );
}

function DemoNotice({ t }: { t: Translator }) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-4">
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
