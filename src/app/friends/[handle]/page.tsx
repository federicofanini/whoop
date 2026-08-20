import { notFound } from "next/navigation";
import Link from "next/link";
import { getViewer } from "@/server/auth";
import { getTranslator } from "@/server/locale";
import { displayName, loadFriendIfPermitted } from "@/core/friends/queries";
import { summarizeForFriend } from "@/core/friends/summary";
import { loadDashboardFor, loadViewerDashboard } from "@/server/dashboard";
import type { Translator } from "@/core/i18n";
import { stripDate } from "@/lib/utils";
import { computeBaselines } from "@/core/analytics/baselines";
import { computeLoad } from "@/core/analytics/load";
import { summarizeSleep } from "@/core/analytics/sleep";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { RecoveryStrip } from "@/components/ui/recovery-strip";
import { RecoveryBars } from "@/components/charts/recovery-bars";
import { StrainBars } from "@/components/charts/strain-charts";
import { Avatar } from "@/components/friends/avatar";
import { recoveryColor, recoveryLabelKey, series, type BandLabels } from "@/lib/theme";


export const dynamic = "force-dynamic";

export default async function FriendPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const t = await getTranslator();
  const viewer = await getViewer();
  if (!viewer) notFound();

  const bandLabels: BandLabels = {
    green: t("band.primed"),
    yellow: t("band.adequate"),
    red: t("band.compromised"),
  };

  // The authorisation check and the lookup are the same query: an unaccepted
  // handle is indistinguishable from one that does not exist, so guessing a
  // handle reveals nothing about whether it belongs to anyone.
  const friend = await loadFriendIfPermitted(viewer.profileId, handle);
  if (!friend) notFound();

  const [friendData, mine] = await Promise.all([
    // A friend who has signed in but never linked a strap has nothing to show.
    friend.whoopUserId ? loadDashboardFor(friend.whoopUserId, 90) : Promise.resolve(null),
    loadViewerDashboard(),
  ]);

  const snapshot = summarizeForFriend(friend, friendData);
  const days = friendData?.days ?? [];
  const name = displayName(friend);
  // Italian and English both read better with a first name than a full one.
  const firstName = friend.fullName?.split(" ")[0] ?? `@${friend.handle}`;

  if (days.length === 0) {
    return (
      <div className="space-y-5">
        <FriendHeader name={name} handle={friend.handle} profile={friend} t={t} />
        <Panel>
          <p className="text-[13px] leading-relaxed text-muted">
            {t("friends.noHistory", { name: firstName })}
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
      <FriendHeader name={name} handle={friend.handle} profile={friend} t={t} />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        <Panel className="flex flex-col justify-between">
          <div>
            <p className="eyebrow">
              {t("friends.recoveryToday")}
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
              <p className="mt-3 inline-flex items-center gap-2 border border-hairline px-2.5 py-1 text-[12px] font-medium text-ink-2">
                <span
                  aria-hidden
                  className="h-2 w-2"
                  style={{ backgroundColor: recoveryColor(recovery) }}
                />
                {t(recoveryLabelKey(recovery))}
              </p>
            ) : null}
          </div>

          <div className="mt-8">
            <RecoveryStrip days={days} label={t("overview.last14")} formatDate={stripDate(t)} />
          </div>

          <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-hairline pt-5">
            <Vital label={t("overview.hrv")} value={today?.hrvMs?.toFixed(0) ?? t("common.none")} unit={t("common.ms")} />
            <Vital label={t("overview.restingHr")} value={today?.restingHeartRate?.toFixed(0) ?? t("common.none")} unit={t("common.bpm")} />
            <Vital label={t("overview.dayStrain")} value={today?.strain?.toFixed(1) ?? t("common.none")} unit="" />
          </dl>
        </Panel>

        <Panel>
          <PanelHeader
            title={t("friends.sideBySide")}
            subtitle={mine.user.demo ? t("friends.sideBySideDemo") : t("friends.sideBySideSub")}
          />
          <ComparisonTable
            theirName={firstName}
            t={t}
            rows={[
              {
                label: t("nav.recovery"),
                unit: "%",
                theirs: theirWeek.recovery,
                mine: myWeek.recovery,
                format: (v) => v.toFixed(0),
                higherIsBetter: true,
              },
              {
                label: t("overview.dayStrain"),
                unit: "",
                theirs: theirWeek.strain,
                mine: myWeek.strain,
                format: (v) => v.toFixed(1),
                higherIsBetter: null,
              },
              {
                label: t("nav.sleep"),
                unit: "",
                theirs: theirWeek.asleepMilli,
                mine: myWeek.asleepMilli,
                format: (v) => t.duration(v),
                higherIsBetter: true,
              },
            ]}
          />
        </Panel>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label={t("friends.hrvBaseline")} value={baselines.hrv.baseline?.toFixed(0) ?? t("common.none")} unit={t("common.ms")} accent={series.recovery} caption={t("friends.thirtyDayMean")} />
        <Tile label={t("friends.rhrBaseline")} value={baselines.restingHr.baseline?.toFixed(0) ?? t("common.none")} unit={t("common.bpm")} accent={series.restingHr} caption={t("friends.thirtyDayMean")} />
        <Tile
          label={t("overview.loadRatio")}
          value={load.ratio.toFixed(2)}
          unit={t("common.times")}
          accent={series.strain}
          caption={
            load.zone === "productive"
              ? t("overview.loadProductive")
              : load.zone === "overreaching"
                ? t("overview.loadOver")
                : t("overview.loadUnder")
          }
        />
        <Tile
          label={t("overview.sleepDebt")}
          value={t.duration(sleep.debtMilli)}
          accent={series.sleep}
          caption={t("friends.shortfall")}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelHeader title={t("overview.recovery30")} subtitle={t("overview.recovery30Sub")} />
          <RecoveryBars days={days.slice(-30)} bandLabels={bandLabels} />
        </Panel>
        <Panel>
          <PanelHeader title={t("overview.strain30")} />
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

function ComparisonTable({
  theirName,
  rows,
  t,
}: {
  theirName: string;
  rows: ComparisonRow[];
  t: Translator;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-hairline">
            <th className="pb-2 eyebrow">{t("friends.metric")}</th>
            <th className="pb-2 text-right eyebrow">
              {theirName}
            </th>
            <th className="pb-2 text-right eyebrow">{t("friends.you")}</th>
            <th className="pb-2 text-right eyebrow">{t("friends.diff")}</th>
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
                <td className="py-3 text-right text-[14px] font-semibold numeral text-ink">
                  {row.theirs !== null ? row.format(row.theirs) : "—"}
                  {row.unit ? <span className="text-[11px] text-muted">{row.unit}</span> : null}
                </td>
                <td className="py-3 text-right text-[14px] numeral text-ink-2">
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
  t,
}: {
  name: string;
  handle: string;
  profile: Parameters<typeof Avatar>[0]["profile"];
  t: Translator;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar profile={profile} size={52} />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{name}</h1>
        <p className="mt-1 text-[13px] text-muted">@{handle} · {t("friends.sharingWithYou")}</p>
      </div>
      <Link
        href="/friends"
        className="shrink-0  border border-hairline bg-surface px-4 py-2 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink"
      >
        {t("friends.allFriends")}
      </Link>
    </div>
  );
}

function Vital({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1.5">
        <span className="text-[20px] font-semibold numeral text-ink">{value}</span>
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
    <div className="relative overflow-hidden  border border-hairline bg-surface p-4 sm:p-5">
      <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: accent }} />
      <p className="eyebrow">{label}</p>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="text-[30px] font-semibold leading-none tracking-tight text-ink">{value}</span>
        {unit ? <span className="text-[13px] font-medium text-ink-2">{unit}</span> : null}
      </p>
      <p className="mt-2 text-[12px] leading-relaxed text-muted">{caption}</p>
    </div>
  );
}
