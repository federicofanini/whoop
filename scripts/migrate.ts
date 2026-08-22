#!/usr/bin/env bun
/**
 * Applies the SQL files in drizzle/, in order, exactly once each.
 *
 *   bun run db:migrate
 *   bun run db:migrate --dry
 *
 * `drizzle-kit push` diffs the schema against the live database and decides for
 * itself what to do about the difference — which is convenient on a scratch
 * database and unnerving on one with data in it, because "the column is gone
 * from the schema" and "the column should be dropped" look identical to a diff.
 *
 * These files say what they do. Each runs in a transaction, and the ledger
 * below means running this twice is a no-op rather than a gamble on every
 * statement being idempotent.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
    break;
  } catch {
    // Not present; fall through to the real environment.
  }
}

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "drizzle");
const dryRun = process.argv.includes("--dry");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  process.exit(1);
}

const postgres = (await import("postgres")).default;
// `prepare: false` is required by Supabase's transaction-mode pooler.
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

try {
  await sql`
    CREATE TABLE IF NOT EXISTS "_migrations" (
      "name" text PRIMARY KEY,
      "applied_at" timestamp with time zone NOT NULL DEFAULT now()
    )
  `;

  const applied = new Set(
    (await sql<{ name: string }[]>`SELECT name FROM "_migrations"`).map((r) => r.name),
  );

  const files = readdirSync(DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let ran = 0;
  for (const name of files) {
    if (applied.has(name)) {
      console.log(`  skip  ${name}`);
      continue;
    }

    // Drizzle writes this marker between statements. Postgres will not accept
    // several DDL statements in one simple query through the pooler, so they
    // are sent one at a time inside a single transaction.
    const statements = readFileSync(join(DIR, name), "utf8")
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (dryRun) {
      console.log(`  would run  ${name}  (${statements.length} statements)`);
      continue;
    }

    await sql.begin(async (tx) => {
      for (const statement of statements) await tx.unsafe(statement);
      await tx`INSERT INTO "_migrations" (name) VALUES (${name})`;
    });

    console.log(`  applied  ${name}  (${statements.length} statements)`);
    ran += 1;
  }

  console.log(dryRun ? "Dry run: nothing was written." : `Done. ${ran} migration(s) applied.`);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await sql.end();
}
