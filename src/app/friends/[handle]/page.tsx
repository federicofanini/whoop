import { notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUserId } from "@/lib/auth/session";
import { displayName, loadFriendIfPermitted } from "@/lib/friends/queries";
import { summarizeForFriend } from "@/lib/friends/summary";
import { loadDashboardData, loadDashboardDataFor } from "@/lib/data/load";
import { computeBaselines } from "@/lib/analytics/baselines";
import { computeLoad } from "@/lib/analytics/load";
import { summarizeSleep } from "@/lib/analytics/sleep";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { RecoveryStrip } from "@/components/ui/recovery-strip";
import { RecoveryBars } from "@/components/charts/recovery-bars";
import { StrainBars } from "@/components/charts/strain-charts";
import { Avatar } from "@/components/friends/avatar";
import { recoveryColor, recoveryLabel, series } from "@/lib/theme";
import { formatDuration } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FriendPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const viewerId = await getSessionUserId();
  if (viewerId === null) notFound();

  // The authorisation check and the lookup are the same query: an unaccepted
  // handle is indistinguishable from one that does not exist, so guessing a
  // handle reveals nothing about whether it belongs to anyone.
  const friend = await loadFriendIfPermitted(viewerId, handle);
  if (!friend) notFound();

  const [friendData, mine] = await Promise.all([
    loadDashboardDataFor(friend.userId, 90),
    loadDashboardData(),
  ]);

  const snapshot = summarizeForFriend(friend, friendData);
  const days = friendData?.days ?? [];
  const name = displayName(friend);
  const firstName = friend.firstName ?? `@${friend.handle}`;

  if (days.length === 0) {
    return (
      <div className="space-y-5">
        <FriendHeader name={name} handle={friend.handle} profile={friend} />
        <Panel>
          <p className="text-[13px] leading-relaxed text-muted">
            {firstName} has approved sharing but has no synced history yet. Their data appears here
            once they run a backfill.
          </p>
        </Panel>
      </div>
    );
  }

  const baselines = computeBaselines(days);
  const load = computeLoad(days);
  const sleep = summarizeSleep(days);
  const today = days[days.length - 1];
  const recovery = today?.recoveryScore ?? null;

  // Compared against the viewer's own week, not against population norms — the
  // only comparison that means anything between two people is their own trends.
  const myWeek = weeklyMeans(mine.days.slice(-7));
  const theirWeek = snapshot.weekly;

  return (
    <div className="space-y-5">
      <FriendHeader name={name} handle={friend.handle} profile={friend} />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        <Panel className="flex flex-col justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              Recovery today
            </p>
            <p className="mt-3 flex items-baseline gap-2">
              <span
                className="text-[64px] font-semibold leading-[0.9] tracking-tight"
                style={{ color: recovery !== null ? recoveryColor(recovery) : undefined }}
              >
                {recovery ?? "—"}
              </span>
              {recovery !== null ? <span className="text-xl font-medium text-ink-2">%</span> : null}
            </p>
            {recovery !== null ? (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-hairline bg-surface-2 px-3 py-1 text-[12px] font-medium text-ink-2">
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: recoveryColor(recovery) }}
                />
                {recoveryLabel(recovery)}
              </p>
            ) : null}
          </div>

          <div className="mt-8">
            <RecoveryStrip days={days} />
          </div>

          <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-hairline pt-5">
            <Vital label="HRV" value={today?.hrvMs?.toFixed(0) ?? "—"} unit="ms" />
            <Vital label="Resting HR" value={today?.restingHeartRate?.toFixed(0) ?? "—"} unit="bpm" />
            <Vital label="Day strain" value={today?.strain?.toFixed(1) ?? "—"} unit="" />
          </dl>
        </Panel>

        <Panel>
          <PanelHeader
            title="This week, side by side"
            subtitle={`Seven-day averages. ${mine.user.demo ? "Your side is demo data until you connect WHOOP." : "Both sides are each person's own recent history."}`}
          />
          <ComparisonTable
            theirName={firstName}
            rows={[
              {
                label: "Recovery",
                unit: "%",
                theirs: theirWeek.recovery,
                mine: myWeek.recovery,
                format: (v) => v.toFixed(0),
                higherIsBetter: true,
              },
              {
                label: "Day strain",
                unit: "",
                theirs: theirWeek.strain,
                mine: myWeek.strain,
                format: (v) => v.toFixed(1),
                higherIsBetter: null,
              },
              {
                label: "Sleep",
                unit: "",
                theirs: theirWeek.asleepMilli,
                mine: myWeek.asleepMilli,
                format: (v) => formatDuration(v),
                higherIsBetter: true,
              },
            ]}
          />
        </Panel>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="HRV baseline" value={baselines.hrv.baseline?.toFixed(0) ?? "—"} unit="ms" accent={series.recovery} caption="30-day mean" />
        <Tile label="RHR baseline" value={baselines.restingHr.baseline?.toFixed(0) ?? "—"} unit="bpm" accent={series.restingHr} caption="30-day mean" />
        <Tile
          label="Load ratio"
          value={load.ratio.toFixed(2)}
          unit="×"
          accent={series.strain}
          caption={
            load.zone === "productive"
              ? "Acute load matched to base"
              : load.zone === "overreaching"
                ? "Acute load ahead of base"
                : "Acute load below base"
          }
        />
        <Tile
          label="Sleep debt"
          value={formatDuration(sleep.debtMilli)}
          accent={series.sleep}
          caption="Shortfall over 7 nights"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Recovery, last 30 days" subtitle="Bars coloured by band; the score is on the tooltip." />
          <RecoveryBars days={days.slice(-30)} />
        </Panel>
        <Panel>
          <PanelHeader title="Strain, last 30 days" />
          <StrainBars days={days.slice(-30)} />
        </Panel>
      </div>
    </div>
  );
}

function weeklyMeans(days: { recoveryScore: number | null; strain: number | null; sleep: { inBedMilli: number; awakeMilli: number; noDataMilli: number } | null }[]) {
  const mean = (values: number[]) =>
    values.length === 0 ? null : values.reduce((s, v) => s + v, 0) / values.length;

  return {
    recovery: mean(days.map((d) => d.recoveryScore).filter((v): v is number => v !== null)),
    strain: mean(days.map((d) => d.strain).filter((v): v is number => v !== null)),
    asleepMilli: mean(
      days
        .filter((d) => d.sleep)
        .map((d) => d.sleep!.inBedMilli - d.sleep!.awakeMilli - d.sleep!.noDataMilli),
    ),
  };
}

interface ComparisonRow {
  label: string;
  unit: string;
  theirs: number | null;
  mine: number | null;
  format: (value: number) => string;
  /** Null where "better" is not a meaningful direction — strain is not a score. */
  higherIsBetter: boolean | null;
}

function ComparisonTable({ theirName, rows }: { theirName: string; rows: ComparisonRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-hairline">
            <th className="pb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Metric</th>
            <th className="pb-2 text-right text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
              {theirName}
            </th>
            <th className="pb-2 text-right text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">You</th>
            <th className="pb-2 text-right text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Diff</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const diff =
              row.theirs !== null && row.mine !== null ? row.theirs - row.mine : null;
            // "Better" is only shown where the direction is defined; a higher
            // strain is neither good nor bad without knowing whose it is.
            const tone =
              diff === null || row.higherIsBetter === null || Math.abs(diff) < 0.5
                ? "text-muted"
                : diff > 0 === row.higherIsBetter
                  ? "text-good"
                  : "text-critical";

            return (
              <tr key={row.label} className="border-b border-hairline last:border-0">
                <td className="py-3 text-[13px] font-medium text-ink-2">{row.label}</td>
                <td className="py-3 text-right text-[14px] font-semibold tabular text-ink">
                  {row.theirs !== null ? row.format(row.theirs) : "—"}
                  {row.unit ? <span className="text-[11px] text-muted">{row.unit}</span> : null}
                </td>
                <td className="py-3 text-right text-[14px] tabular text-ink-2">
                  {row.mine !== null ? row.format(row.mine) : "—"}
                  {row.unit ? <span className="text-[11px] text-muted">{row.unit}</span> : null}
                </td>
                <td className={`py-3 text-right text-[13px] font-medium tabular ${tone}`}>
                  {diff === null ? "—" : `${diff > 0 ? "+" : "−"}${row.format(Math.abs(diff))}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FriendHeader({
  name,
  handle,
  profile,
}: {
  name: string;
  handle: string;
  profile: Parameters<typeof Avatar>[0]["profile"];
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar profile={profile} size={52} />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{name}</h1>
        <p className="mt-1 text-[13px] text-muted">@{handle} · sharing with you</p>
      </div>
      <Link
        href="/friends"
        className="shrink-0 rounded-xl border border-hairline bg-surface px-4 py-2 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink"
      >
        ← All friends
      </Link>
    </div>
  );
}

function Vital({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</dt>
      <dd className="mt-1.5">
        <span className="text-[20px] font-semibold tabular text-ink">{value}</span>
        {unit ? <span className="ml-1 text-[12px] text-muted">{unit}</span> : null}
      </dd>
    </div>
  );
}

function Tile({
  label,
  value,
  unit,
  accent,
  caption,
}: {
  label: string;
  value: string;
  unit?: string;
  accent: string;
  caption: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-hairline bg-surface p-4 sm:p-5">
      <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: accent }} />
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="text-[30px] font-semibold leading-none tracking-tight text-ink">{value}</span>
        {unit ? <span className="text-[13px] font-medium text-ink-2">{unit}</span> : null}
      </p>
      <p className="mt-2 text-[12px] leading-relaxed text-muted">{caption}</p>
    </div>
  );
}
