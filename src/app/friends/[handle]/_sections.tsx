import { cache } from "react";
import { getTranslator } from "@/server/locale";
import { loadVitalsDays } from "@/core/data/load";
import { getVitalsDays } from "@/server/dashboard";
import type { DayRecord } from "@/core/analytics/types";
import { computeBaselines } from "@/core/analytics/baselines";
import { computeLoad } from "@/core/analytics/load";
import { asleepMilli, summarizeSleep } from "@/core/analytics/sleep";
import { PanelHeader } from "@/components/ui/panel";
import { RecoveryStrip } from "@/components/ui/recovery-strip";
import { RecoveryBars, StrainBars } from "@/components/charts/lazy";
import { recoveryColor, recoveryLabelKey, series } from "@/lib/theme";
import { bandLabels } from "../../_sections/band-labels";
import { stripDate } from "@/lib/utils";
import type { Translator } from "@/core/i18n";

/**
 * A friend's page.
 *
 * Two people's histories are needed here — theirs for every panel, and the
 * viewer's only for the comparison table — and they used to be fetched together
 * before anything rendered. Now the comparison is the one section that waits on
 * both; everything else needs only the friend's own numbers.
 */

export const friendDays = cache(async (whoopUserId: number | null): Promise<DayRecord[]> => {
  if (whoopUserId === null) return [];
  return loadVitalsDays(whoopUserId, 90);
});

export async function FriendHero({ whoopUserId }: { whoopUserId: number | null }) {
  const [t, days] = await Promise.all([getTranslator(), friendDays(whoopUserId)]);
  const today = days[days.length - 1];
  const recovery = today?.recoveryScore ?? null;

  return (
    <>
      <div>
        <p className="eyebrow">{t("friends.recoveryToday")}</p>
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
        <Vital
          label={t("overview.hrv")}
          value={today?.hrvMs?.toFixed(0) ?? t("common.none")}
          unit={t("common.ms")}
        />
        <Vital
          label={t("overview.restingHr")}
          value={today?.restingHeartRate?.toFixed(0) ?? t("common.none")}
          unit={t("common.bpm")}
        />
        <Vital
          label={t("overview.dayStrain")}
          value={today?.strain?.toFixed(1) ?? t("common.none")}
          unit=""
        />
      </dl>
    </>
  );
}

export async function SideBySide({
  whoopUserId,
  firstName,
  demo,
}: {
  whoopUserId: number | null;
  firstName: string;
  demo: boolean;
}) {
  const [t, theirDays, myDays] = await Promise.all([
    getTranslator(),
    friendDays(whoopUserId),
    getVitalsDays(),
  ]);

  const theirs = weeklyMeans(theirDays.slice(-7));
  const mine = weeklyMeans(myDays.slice(-7));

  return (
    <>
      <PanelHeader
        title={t("friends.sideBySide")}
        subtitle={demo ? t("friends.sideBySideDemo") : t("friends.sideBySideSub")}
      />
      <ComparisonTable
        theirName={firstName}
        t={t}
        rows={[
          {
            label: t("nav.recovery"),
            unit: "%",
            theirs: theirs.recovery,
            mine: mine.recovery,
            format: (v) => v.toFixed(0),
            higherIsBetter: true,
          },
          {
            label: t("overview.dayStrain"),
            unit: "",
            theirs: theirs.strain,
            mine: mine.strain,
            format: (v) => v.toFixed(1),
            higherIsBetter: null,
          },
          {
            label: t("nav.sleep"),
            unit: "",
            theirs: theirs.asleepMilli,
            mine: mine.asleepMilli,
            format: (v) => t.duration(v),
            higherIsBetter: true,
          },
        ]}
      />
    </>
  );
}

export async function FriendTiles({ whoopUserId }: { whoopUserId: number | null }) {
  const [t, days] = await Promise.all([getTranslator(), friendDays(whoopUserId)]);
  const baselines = computeBaselines(days);
  const load = computeLoad(days);
  const sleep = summarizeSleep(days);

  return (
    <>
      <Tile
        label={t("friends.hrvBaseline")}
        value={baselines.hrv.baseline?.toFixed(0) ?? t("common.none")}
        unit={t("common.ms")}
        accent={series.recovery}
        caption={t("friends.thirtyDayMean")}
      />
      <Tile
        label={t("friends.rhrBaseline")}
        value={baselines.restingHr.baseline?.toFixed(0) ?? t("common.none")}
        unit={t("common.bpm")}
        accent={series.restingHr}
        caption={t("friends.thirtyDayMean")}
      />
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
    </>
  );
}

export async function FriendRecoveryChart({ whoopUserId }: { whoopUserId: number | null }) {
  const [t, days, labels] = await Promise.all([
    getTranslator(),
    friendDays(whoopUserId),
    bandLabels(),
  ]);

  return (
    <>
      <PanelHeader title={t("overview.recovery30")} subtitle={t("overview.recovery30Sub")} />
      <RecoveryBars days={days.slice(-30)} bandLabels={labels} />
    </>
  );
}

export async function FriendStrainChart({ whoopUserId }: { whoopUserId: number | null }) {
  const [t, days] = await Promise.all([getTranslator(), friendDays(whoopUserId)]);

  return (
    <>
      <PanelHeader title={t("overview.strain30")} />
      <StrainBars days={days.slice(-30)} />
    </>
  );
}

function weeklyMeans(days: DayRecord[]) {
  const average = (values: number[]) =>
    values.length === 0 ? null : values.reduce((sum, v) => sum + v, 0) / values.length;

  return {
    recovery: average(days.map((d) => d.recoveryScore).filter((v): v is number => v !== null)),
    strain: average(days.map((d) => d.strain).filter((v): v is number => v !== null)),
    asleepMilli: average(days.filter((d) => d.sleep).map((d) => asleepMilli(d.sleep!))),
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
            <th className="eyebrow pb-2">{t("friends.metric")}</th>
            <th className="eyebrow pb-2 text-right">{theirName}</th>
            <th className="eyebrow pb-2 text-right">{t("friends.you")}</th>
            <th className="eyebrow pb-2 text-right">{t("friends.diff")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const diff = row.theirs !== null && row.mine !== null ? row.theirs - row.mine : null;
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
                <td className="numeral py-3 text-right text-[14px] font-semibold text-ink">
                  {row.theirs !== null ? row.format(row.theirs) : "—"}
                  {row.unit ? <span className="text-[11px] text-muted">{row.unit}</span> : null}
                </td>
                <td className="numeral py-3 text-right text-[14px] text-ink-2">
                  {row.mine !== null ? row.format(row.mine) : "—"}
                  {row.unit ? <span className="text-[11px] text-muted">{row.unit}</span> : null}
                </td>
                <td className={`tabular py-3 text-right text-[13px] font-medium ${tone}`}>
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

function Vital({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1.5">
        <span className="numeral text-[20px] font-semibold text-ink">{value}</span>
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
    <div className="relative overflow-hidden border border-hairline bg-surface p-4 sm:p-5">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ backgroundColor: accent }}
      />
      <p className="eyebrow">{label}</p>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="text-[30px] font-semibold leading-none tracking-tight text-ink">
          {value}
        </span>
        {unit ? <span className="text-[13px] font-medium text-ink-2">{unit}</span> : null}
      </p>
      <p className="mt-2 text-[12px] leading-relaxed text-muted">{caption}</p>
    </div>
  );
}
