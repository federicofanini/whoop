import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * The app is fully usable with no database at all — it falls back to the demo
 * dataset — so the connection is created lazily and `isDbConfigured` gates every
 * call site rather than throwing at import time.
 */
let client: ReturnType<typeof postgres> | null = null;
let database: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — the app is running on demo data.");
  }
  if (!database) {
    // `prepare: false` is required by Supabase's transaction-mode pooler.
    client = postgres(process.env.DATABASE_URL, { prepare: false, max: 4 });
    database = drizzle(client, { schema });
  }
  return database;
}

export { schema };
