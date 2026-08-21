#!/usr/bin/env bun
/**
 * The dashboard without the dashboard.
 *
 * Everything here drives `src/core` directly — the same modules the web app
 * calls — so pulling, inspecting and exporting WHOOP data never depends on
 * Next.js, React, a browser, or a running server. If the UI were deleted
 * tomorrow, this would still work.
 *
 *   bun run whoop status
 *   bun run whoop backfill --user 1001
 *   bun run whoop sync --all
 *   bun run whoop export --user 1001 --format csv --days 90 --out history.csv
 *   bun run whoop insights --user 1001 --locale it
 */
import { writeFileSync } from "node:fs";
import { desc, eq } from "drizzle-orm";

// Load .env.local before anything reads process.env at module scope.
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
    break;
  } catch {
    // Not present; fall through to the real environment.
  }
}

const { getDb, isDbConfigured, schema } = await import("../src/core/db/index.ts");
const { getAuthorizedClient, lastSyncedAt, listAccountIds, syncSince, upsertProfile } =
  await import("../src/core/whoop/sync.ts");
const { loadDashboardForUser } = await import("../src/core/data/load.ts");
const { generateInsights } = await import("../src/core/analytics/insights.ts");
const { computeBaselines } = await import("../src/core/analytics/baselines.ts");
const { computeLoad } = await import("../src/core/analytics/load.ts");
const { createTranslator, translateInsight, isLocale } = await import("../src/core/i18n/index.ts");

interface Args {
  command: string;
  user?: number;
  all: boolean;
  days: number;
  format: "json" | "csv";
  out?: string;
  locale: "en" | "it";
  limit: number;
}

function parseArgs(argv: string[]): Args {
  const [command = "help", ...rest] = argv;
  const args: Args = {
    command,
    all: false,
    days: 180,
    format: "json",
    locale: "en",
    limit: 10_000,
  };

  for (let i = 0; i < rest.length; i += 1) {
    const flag = rest[i];
    const value = rest[i + 1];
    switch (flag) {
      case "--user":
        args.user = Number(value);
        i += 1;
        break;
      case "--all":
        args.all = true;
        break;
      case "--days":
        args.days = Number(value);
        i += 1;
        break;
      case "--format":
        args.format = value === "csv" ? "csv" : "json";
        i += 1;
        break;
      case "--out":
        args.out = value;
        i += 1;
        break;
      case "--locale":
        if (isLocale(value)) args.locale = value;
        i += 1;
        break;
      case "--limit":
        args.limit = Number(value);
        i += 1;
        break;
    }
  }
  return args;
}

function requireDb(): void {
  if (!isDbConfigured()) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
    process.exit(1);
  }
}

/**
 * Which accounts a command applies to.
 *
 * `--user` names one; `--all` means every linked account; with neither, a single
 * linked account is unambiguous and anything more is not — so it asks rather
 * than guessing which family member you meant.
 */
async function resolveTargets(args: Args): Promise<number[]> {
  if (args.user !== undefined && Number.isFinite(args.user)) return [args.user];

  const ids = await listAccountIds();
  if (args.all) return ids;
  if (ids.length === 1) return ids;
  if (ids.length === 0) {
    console.error("No WHOOP accounts linked yet. Connect one at /settings first.");
    process.exit(1);
  }
  console.error(
    `${ids.length} accounts linked (${ids.join(", ")}). Pass --user <id> or --all.`,
  );
  process.exit(1);
}

async function status(): Promise<void> {
  requireDb();
  const db = getDb();

  const accounts = await db
    .select({
      userId: schema.accounts.userId,
      firstName: schema.accounts.firstName,
      lastName: schema.accounts.lastName,
      expiresAt: schema.accounts.expiresAt,
      backfilledAt: schema.accounts.backfilledAt,
      profileId: schema.accounts.profileId,
    })
    .from(schema.accounts);

  if (accounts.length === 0) {
    console.log("No WHOOP accounts linked.");
    return;
  }

  for (const account of accounts) {
    const [cycles] = await db
      .select({ id: schema.cycles.id, start: schema.cycles.start })
      .from(schema.cycles)
      .where(eq(schema.cycles.userId, account.userId))
      .orderBy(desc(schema.cycles.start))
      .limit(1);

    const total = await db.$count(schema.cycles, eq(schema.cycles.userId, account.userId));
    const expired = account.expiresAt.getTime() <= Date.now();

    console.log(`WHOOP user ${account.userId} — ${account.firstName ?? "?"} ${account.lastName ?? ""}`.trim());
    console.log(`  profile      ${account.profileId ?? "(not linked to a sign-in)"}`);
    console.log(`  cycles       ${total}`);
    console.log(`  newest       ${cycles?.start.toISOString() ?? "none"}`);
    console.log(`  backfilled   ${account.backfilledAt?.toISOString() ?? "never"}`);
    console.log(`  token        ${expired ? "expired (refreshes on next call)" : `valid until ${account.expiresAt.toISOString()}`}`);
    console.log();
  }
}

async function sync(args: Args, mode: "backfill" | "incremental"): Promise<void> {
  requireDb();

  for (const userId of await resolveTargets(args)) {
    try {
      const { client, account } = await getAuthorizedClient(userId);
      const since = mode === "backfill" ? undefined : await lastSyncedAt(userId);

      console.log(
        `${mode} for WHOOP user ${userId}${since ? ` since ${since.toISOString()}` : " (full history)"}…`,
      );

      await upsertProfile(client, userId);
      const result = await syncSince(client, since, args.limit);

      if (mode === "backfill") {
        await getDb()
          .update(schema.accounts)
          .set({ backfilledAt: new Date(), updatedAt: new Date() })
          .where(eq(schema.accounts.userId, account.userId));
      }

      console.log(`  ${JSON.stringify(result)}`);
    } catch (error) {
      // One member's expired refresh token must not stop the others.
      console.error(`  failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    }
  }
}

function toCsv(days: Awaited<ReturnType<typeof loadDashboardForUser>>): string {
  const rows = days?.days ?? [];
  const header = [
    "date",
    "cycle_id",
    "strain",
    "recovery_score",
    "resting_hr",
    "hrv_ms",
    "spo2",
    "skin_temp_c",
    "asleep_minutes",
    "sleep_performance",
    "respiratory_rate",
    "workouts",
  ];

  const lines = rows.map((day) => {
    const asleep = day.sleep
      ? Math.round(
          (day.sleep.inBedMilli - day.sleep.awakeMilli - day.sleep.noDataMilli) / 60000,
        )
      : "";
    return [
      day.date,
      day.cycleId,
      day.strain ?? "",
      day.recoveryScore ?? "",
      day.restingHeartRate ?? "",
      day.hrvMs ?? "",
      day.spo2 ?? "",
      day.skinTempC ?? "",
      asleep,
      day.sleep?.performancePercentage ?? "",
      day.sleep?.respiratoryRate ?? "",
      day.workouts.length,
    ].join(",");
  });

  return [header.join(","), ...lines].join("\n");
}

async function exportData(args: Args): Promise<void> {
  requireDb();
  const [userId] = await resolveTargets(args);
  const data = await loadDashboardForUser(userId, args.days);

  if (!data) {
    console.error(`No data held for WHOOP user ${userId}.`);
    process.exit(1);
  }

  const payload = args.format === "csv" ? toCsv(data) : JSON.stringify(data, null, 2);

  if (args.out) {
    writeFileSync(args.out, payload);
    console.log(`Wrote ${data.days.length} days to ${args.out}`);
  } else {
    process.stdout.write(`${payload}\n`);
  }
}

/**
 * Prints the analysis as text — proof that the insight engine has no UI
 * dependency, and genuinely useful over SSH or from a cron job.
 */
async function insights(args: Args): Promise<void> {
  requireDb();
  const [userId] = await resolveTargets(args);
  const data = await loadDashboardForUser(userId, args.days);

  if (!data || data.days.length === 0) {
    console.error(`No data held for WHOOP user ${userId}.`);
    process.exit(1);
  }

  const t = createTranslator(args.locale);
  const baselines = computeBaselines(data.days);
  const load = computeLoad(data.days);
  const today = data.days[data.days.length - 1];

  console.log(`${today.date} — WHOOP user ${userId}`);
  console.log(
    `recovery ${today.recoveryScore ?? "—"}%  strain ${today.strain?.toFixed(1) ?? "—"}  ` +
      `hrv ${today.hrvMs?.toFixed(0) ?? "—"}ms (baseline ${baselines.hrv.baseline?.toFixed(0) ?? "—"})  ` +
      `load ${load.ratio.toFixed(2)}x`,
  );
  console.log();

  for (const insight of generateInsights(data.days)) {
    const { title, detail } = translateInsight(t, insight);
    console.log(`[${insight.tone.toUpperCase()}] ${title}`);
    console.log(`  ${detail}`);
    console.log();
  }
}

function help(): void {
  console.log(`strap — WHOOP data, no UI required

  status                          what is linked, how fresh it is
  backfill  [--user N | --all]    pull the full history
  sync      [--user N | --all]    pull everything since the newest record held
  export    [--user N] [--days N] [--format json|csv] [--out FILE]
  insights  [--user N] [--days N] [--locale en|it]

Flags:
  --user N     act on one WHOOP user id      --all      act on every linked account
  --days N     window for export/insights    --limit N  cap records fetched in a sync
`);
}

const args = parseArgs(process.argv.slice(2));

switch (args.command) {
  case "status":
    await status();
    break;
  case "backfill":
    await sync(args, "backfill");
    break;
  case "sync":
    await sync(args, "incremental");
    break;
  case "export":
    await exportData(args);
    break;
  case "insights":
    await insights(args);
    break;
  default:
    help();
}

process.exit(process.exitCode ?? 0);
