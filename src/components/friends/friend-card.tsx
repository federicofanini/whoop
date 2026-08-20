import Link from "next/link";
import { removeFriendship } from "@/app/friends/actions";
import type { FriendSnapshot } from "@/core/friends/summary";
import { recoveryColor, recoveryLabelKey, series } from "@/lib/theme";
import { RecoveryStrip } from "@/components/ui/recovery-strip";
import type { Translator } from "@/core/i18n";
import { stripDate } from "@/lib/utils";
import { Avatar } from "./avatar";

/**
 * One friend, at a glance.
 *
 * The recovery score leads because it is the number people actually compare, and
 * it always travels with its written band — the red/amber/green ramp is not
 * colour-vision separable and can never carry the meaning alone.
 */
export function FriendCard({
  snapshot,
  t,
  friendshipId,
}: {
  snapshot: FriendSnapshot;
  t: Translator;
  friendshipId?: string;
}) {
  const { latest, weekly, profile, name } = snapshot;
  const recovery = latest?.recovery ?? null;

  return (
    <article className="rounded-2xl border border-hairline bg-surface p-5">
      <header className="flex items-center gap-3">
        <Avatar profile={profile} size={44} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold tracking-tight text-ink">{name}</h3>
          <p className="truncate text-[12px] text-muted">@{profile.handle}</p>
        </div>
        {recovery !== null ? (
          <div className="shrink-0 text-right">
            <p
              className="text-[28px] font-semibold leading-none tabular"
              style={{ color: recoveryColor(recovery) }}
            >
              {recovery}
              <span className="text-[15px] font-medium text-ink-2">%</span>
            </p>
            <p className="mt-1 text-[11px] font-medium text-muted">{t(recoveryLabelKey(recovery))}</p>
          </div>
        ) : null}
      </header>

      {latest ? (
        <>
          <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-hairline pt-4">
            <Metric
              label={t("nav.strain")}
              value={latest.strain?.toFixed(1) ?? "—"}
              sub={weekly.strain !== null ? t.number(weekly.strain, 1) : undefined}
              accent={series.strain}
            />
            <Metric
              label={t("nav.sleep")}
              value={latest.asleepMilli !== null ? t.duration(latest.asleepMilli) : t("common.none")}
              sub={weekly.asleepMilli !== null ? t.duration(weekly.asleepMilli) : undefined}
              accent={series.sleep}
            />
            <Metric
              label={t("overview.hrv")}
              value={latest.hrvMs !== null ? latest.hrvMs.toFixed(0) : "—"}
              sub={latest.restingHr !== null ? `${latest.restingHr} ${t("common.bpm")}` : undefined}
              accent={series.recovery}
            />
          </dl>

          <div className="mt-5">
            <RecoveryStrip days={snapshot.days} label={t("overview.last14")} formatDate={stripDate(t)} />
          </div>
        </>
      ) : (
        <p className="mt-5 border-t border-hairline pt-4 text-[13px] leading-relaxed text-muted">
          {t("friends.notSynced", { name: name.split(" ")[0] })}
        </p>
      )}

      <footer className="mt-5 flex items-center justify-between gap-3 border-t border-hairline pt-4">
        <Link
          href={`/friends/${profile.handle}`}
          className="text-[13px] font-medium text-ink-2 transition-colors hover:text-ink"
        >
          {t("friends.fullDetail")}
        </Link>
        {friendshipId ? (
          <form action={removeFriendship}>
            <input type="hidden" name="id" value={friendshipId} />
            <button
              type="submit"
              className="text-[12px] font-medium text-muted transition-colors hover:text-critical"
            >
              {t("friends.stopSharing")}
            </button>
          </form>
        ) : null}
      </footer>
    </article>
  );
}

function Metric({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
        <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
        {label}
      </dt>
      <dd className="mt-1.5">
        <span className="text-[17px] font-semibold tabular text-ink">{value}</span>
        {sub ? <span className="mt-0.5 block text-[11px] text-muted">{sub}</span> : null}
      </dd>
    </div>
  );
}
