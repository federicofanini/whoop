import Link from "next/link";
import { loadDashboardData } from "@/lib/data/load";
import { computeBaselines } from "@/lib/analytics/baselines";
import { computeLoad, optimalStrain, summarizeBalance } from "@/lib/analytics/load";
import { summarizeSleep } from "@/lib/analytics/sleep";
import { generateInsights } from "@/lib/analytics/insights";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { HeroFigure, StatTile } from "@/components/ui/stat";
import { InsightList } from "@/components/ui/insight-list";
import { RecoveryStrip } from "@/components/ui/recovery-strip";
import { RecoveryBars } from "@/components/charts/recovery-bars";
import { StrainBars } from "@/components/charts/strain-charts";
import { recoveryColor, recoveryLabel, series } from "@/lib/theme";
import { formatDuration } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const { user, days } = await loadDashboardData();
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
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-[28px]">
            {user.firstName ? `Morning, ${user.firstName}` : "Today"}
          </h1>
        </div>
        <Link
          href="/live"
          className="rounded-xl border border-hairline bg-surface px-4 py-2 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink"
        >
          Live session →
        </Link>
      </div>

      {user.demo ? <DemoNotice /> : null}

      {/* The day's headline: one number, plus the numbers that produced it. */}
      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Panel className="flex flex-col justify-between">
          <HeroFigure
            label="Recovery"
            value={recovery ?? "—"}
            unit="%"
            color={recovery !== null ? recoveryColor(recovery) : undefined}
            status={recovery !== null ? recoveryLabel(recovery) : undefined}
          />

          <div className="mt-8">
            <RecoveryStrip days={days} />
          </div>

          <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-hairline pt-5">
            <Vital
              label="HRV"
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
              label="Resting HR"
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
              label="Resp. rate"
              value={lastNight?.respiratoryRate ? lastNight.respiratoryRate.toFixed(1) : "—"}
              unit="rpm"
              delta={null}
            />
          </dl>
        </Panel>

        <Panel>
          <PanelHeader
            title="What today's numbers mean"
            subtitle="Ranked by how far each one sits from your own baseline."
          />
          <InsightList insights={insights} limit={3} />
        </Panel>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Day strain"
          value={today?.strain?.toFixed(1) ?? "—"}
          accent={series.strain}
          caption={
            target
              ? `Recovery supports ${target.low.toFixed(1)}–${target.high.toFixed(1)} today`
              : undefined
          }
        />
        <StatTile
          label="Load ratio"
          value={load.ratio.toFixed(2)}
          unit="×"
          accent={series.restingHr}
          caption={
            load.zone === "productive"
              ? "Acute load matched to your base"
              : load.zone === "overreaching"
                ? "Acute load running ahead of your base"
                : "Acute load below your base"
          }
        />
        <StatTile
          label="Sleep last night"
          value={lastNight ? formatDuration(lastNight.asleepMilli) : "—"}
          accent={series.sleep}
          caption={lastNight ? `${lastNight.performance ?? "—"}% of what you needed` : undefined}
        />
        <StatTile
          label="Sleep debt"
          value={formatDuration(sleep.debtMilli)}
          accent={series.sleep}
          caption="Accumulated shortfall over 7 nights"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Recovery, last 30 days"
            subtitle="Bars are coloured by band; the score is always on the tooltip."
            action={<PanelLink href="/recovery" />}
          />
          <RecoveryBars days={days.slice(-30)} />
        </Panel>

        <Panel>
          <PanelHeader
            title="Strain, last 30 days"
            subtitle={`${balance.over} of the last ${balance.points.length} days ran ahead of recovery.`}
            action={<PanelLink href="/strain" />}
          />
          <StrainBars days={days.slice(-30)} />
        </Panel>
      </div>

      <Panel>
        <PanelHeader title="Everything worth flagging" subtitle="The full set, across all three domains." />
        <InsightList insights={insights} />
      </Panel>
    </div>
  );
}

function PanelLink({ href }: { href: string }) {
  return (
    <Link href={href} className="text-[12px] font-medium text-muted transition-colors hover:text-ink-2">
      Detail →
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

function DemoNotice() {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-4">
      <p className="text-[13px] leading-relaxed text-ink-2">
        <span className="font-semibold text-ink">Demo data.</span> No WHOOP account is linked yet, so
        this is a generated dataset — realistic, deterministic, and built to exercise every insight
        including a seeded illness episode.{" "}
        <Link href="/settings" className="font-medium text-ink underline underline-offset-4">
          Connect your WHOOP
        </Link>{" "}
        to replace it.
      </p>
    </div>
  );
}
