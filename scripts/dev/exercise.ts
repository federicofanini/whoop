/** Drives every Drizzle query the app relies on, against real rows. */
import { loadDashboardForUser } from "@/core/data/load";
import { computeBaselines } from "@/core/analytics/baselines";
import { computeLoad, summarizeBalance } from "@/core/analytics/load";
import { summarizeSleep, sleepRecoveryCorrelation } from "@/core/analytics/sleep";
import { generateInsights } from "@/core/analytics/insights";
import { loadFriendGraph, loadFriendIfPermitted, findProfileByHandle } from "@/core/friends/queries";
import { loadFriendSnapshots } from "@/core/friends/summary";
import { sharedSlotAvailability, claimSharedSlot } from "@/core/whoop/credentials";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

const check = (name: string, ok: boolean, detail = "") =>
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);


async function main() {
const data = await loadDashboardForUser(1001, 180);
check("loadDashboardForUser returns rows", !!data && data.days.length === 180, `${data?.days.length} days`);

const withSleep = data!.days.filter((d) => d.sleep).length;
const withWorkouts = data!.days.filter((d) => d.workouts.length > 0).length;
check("sleep joined onto days", withSleep === 180, `${withSleep}/180`);
check("workouts joined onto days", withWorkouts > 100, `${withWorkouts} days`);
check("recovery joined onto days", data!.days.filter((d) => d.recoveryScore !== null).length > 150);

const baselines = computeBaselines(data!.days);
check("baselines computed from real rows", baselines.hrv.baseline !== null,
  `hrv ${baselines.hrv.latest?.toFixed(0)} vs ${baselines.hrv.baseline?.toFixed(0)}, z=${baselines.hrv.z.toFixed(2)}`);

const load = computeLoad(data!.days);
check("acute:chronic computed", load.chronic > 0, `${load.acute.toFixed(1)}/${load.chronic.toFixed(1)} = ${load.ratio.toFixed(2)} (${load.zone})`);

const sleep = summarizeSleep(data!.days);
check("sleep summarised", sleep.nights.length > 0, `${sleep.nights.length} nights, debt ${(sleep.debtMilli / 3600000).toFixed(1)}h`);

const corr = sleepRecoveryCorrelation(data!.days);
check("correlation computed", corr.n > 100, `r=${corr.r.toFixed(2)} over ${corr.n} nights`);

const insights = generateInsights(data!.days);
check("insights generated", insights.length > 0, `${insights.length}: ${insights.slice(0,3).map(i => i.titleKey).join(", ")}`);
check("balance summarised", summarizeBalance(data!.days).points.length > 0);

// Friend graph
const graph = await loadFriendGraph(A);
check("friend graph loads", graph.friends.length === 1, `${graph.friends.length} friends, ${graph.incoming.length} incoming`);
check("friend carries whoop id", graph.friends[0]?.whoopUserId === 1002, `whoopUserId=${graph.friends[0]?.whoopUserId}`);

const permitted = await loadFriendIfPermitted(A, "fratello");
check("accepted friend is visible", permitted?.whoopUserId === 1002);

const stranger = await loadFriendIfPermitted(A, "nobody");
check("unknown handle is refused", stranger === null);

// The authorisation check that matters: B must not be reachable from a profile
// with no friendship to them.
const outsider = "33333333-3333-4333-8333-333333333333";
check("non-friend cannot read a friend", (await loadFriendIfPermitted(outsider, "fratello")) === null);

check("handle lookup resolves", (await findProfileByHandle("fratello")) === B);
check("missing handle resolves to null", (await findProfileByHandle("ghost")) === null);

const snapshots = await loadFriendSnapshots(graph.friends);
check("friend snapshot built", snapshots[0]?.days?.length ? snapshots[0].days.length > 0 : false,
  `${snapshots[0]?.days?.length ?? 0} days for ${snapshots[0]?.name}`);

// Shared-slot accounting
const before = await sharedSlotAvailability(A);
const slotA = await claimSharedSlot(A);
const slotB = await claimSharedSlot(B);
const after = await sharedSlotAvailability(A);
check("slots claimed distinctly", slotA !== null && slotB !== null && slotA !== slotB, `A=${slotA} B=${slotB}`);
check("slot claim is idempotent", (await claimSharedSlot(A)) === slotA);
check("availability tracks claims", after.used === before.used + 2 && after.held, `${after.used}/${after.limit} used`);

process.exit(0);

}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
