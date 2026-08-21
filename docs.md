# Setup and operations

Everything needed to run this dashboard locally and put it in production: what
each environment variable does, which accounts you need to create, how the data
gets in, and how the pages are built so they stay fast.

- [1. Quick start](#1-quick-start)
- [2. Environment variables](#2-environment-variables)
- [3. Providers](#3-providers)
- [4. Database](#4-database)
- [5. Getting data in](#5-getting-data-in)
- [6. Deployment](#6-deployment)
- [7. Architecture: how a page loads](#7-architecture-how-a-page-loads)
- [8. Command reference](#8-command-reference)
- [9. Troubleshooting](#9-troubleshooting)

---

## 1. Quick start

The package manager is [Bun](https://bun.sh). `bun.lock` is the lockfile; there
is no `package-lock.json`.

```bash
bun install
cp .env.example .env
bun run dev
```

Open http://localhost:3000.

**Nothing is required to see the app.** With an empty `.env` the dashboard runs
on a generated dataset — six months of plausible recovery, strain and sleep — so
every chart, insight and layout decision is visible before you have connected
anything. A "demo data" chip in the header says so. Providers are what turn it
into *your* data:

| You want | You need |
| --- | --- |
| Your own WHOOP history | `DATABASE_URL` + WHOOP OAuth |
| Sign-in and friends | the above + Supabase Auth |
| Live heart rate across devices | the above + Supabase Realtime |

---

## 2. Environment variables

Copy `.env.example` to `.env`. Every variable, what breaks without it, and where
to get it:

### WHOOP

| Variable | Required for | Where it comes from |
| --- | --- | --- |
| `WHOOP_CLIENT_ID` | Connecting a strap | [developer-dashboard.whoop.com](https://developer-dashboard.whoop.com) |
| `WHOOP_CLIENT_SECRET` | Connecting a strap | Same app, shown once at creation |
| `WHOOP_REDIRECT_URI` | Connecting a strap | Must match the app config **exactly**, including scheme and trailing path |
| `WHOOP_WEBHOOK_SECRET` | Push updates | The signing secret WHOOP uses for webhook deliveries. Defaults to `WHOOP_CLIENT_SECRET` if unset |
| `WHOOP_SHARED_USER_LIMIT` | Multi-user deploys | A WHOOP app in development is capped at **10 users by the platform**. Raise this only after your app is approved for production |

The redirect URI is `<origin>/api/auth/whoop/callback` — so
`http://localhost:3000/api/auth/whoop/callback` locally, and the production
origin in production. WHOOP allows several, so register both.

### Database

| Variable | Required for | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Everything except demo mode | Any Postgres. Use Supabase's **transaction pooler** string (port 6543), not the direct one |

### Supabase

| Variable | Required for | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Sign-in, friends, live | Project settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sign-in, friends, live | Public by design — it is protected by row-level security and is the key the browser is meant to hold |

### Application

| Variable | Required for | Notes |
| --- | --- | --- |
| `APP_URL` | Correct redirects in production | The deployment's own origin. Falls back to `http://localhost:3000`, which is wrong anywhere else |
| `CRON_SECRET` | The nightly reconcile | Any long random string. Without it `/api/cron/reconcile` refuses to run rather than exposing an unauthenticated re-sync of every account |
| `CREDENTIALS_SECRET` | Members bringing their own WHOOP app | AES-256-GCM key for the client secrets they paste in. `openssl rand -hex 32`. **Changing it makes every stored key unreadable** and those members must re-enter them |

Generate the two secrets:

```bash
openssl rand -hex 32   # CREDENTIALS_SECRET
openssl rand -hex 32   # CRON_SECRET
```

---

## 3. Providers

### WHOOP developer app

1. Sign in at [developer-dashboard.whoop.com](https://developer-dashboard.whoop.com).
2. Create an app.
3. Add redirect URIs: `http://localhost:3000/api/auth/whoop/callback` and
   `https://<your-domain>/api/auth/whoop/callback`.
4. Request these scopes — the dashboard uses all of them:
   `read:profile`, `read:body_measurement`, `read:cycles`, `read:recovery`,
   `read:sleep`, `read:workout`, `offline`.

   `offline` is not optional. Without it there is no refresh token, and the
   connection dies after a few hours.
5. Copy the client ID and secret into `.env`.

**The ten-user cap.** A WHOOP app in development may have at most ten users.
This is a platform limit, not something the app can raise. The dashboard handles
it in two ways: it hands out numbered *slots* (a unique constraint in the
database, so two people can never claim the same one), and it lets a member
bring their own developer app instead, pasting their client ID and secret into
settings where they are encrypted with `CREDENTIALS_SECRET`.

### Supabase

Supabase does three jobs: it hosts Postgres, it provides Google sign-in, and it
carries the live heart-rate broadcast over Realtime.

1. Create a project at [supabase.com](https://supabase.com).
2. **Database** → Connect → copy the **transaction pooler** URI (port `6543`)
   into `DATABASE_URL`. The client is configured with `prepare: false`, which
   this pooler requires.
3. **Authentication → Providers → Google**: enable it, and paste in a Google
   OAuth client ID and secret from the
   [Google Cloud console](https://console.cloud.google.com/apis/credentials).
   Supabase shows the callback URL to register on the Google side.
4. **Authentication → URL Configuration**: add `<your-origin>/auth/callback` to
   the redirect allow-list — both localhost and production.
5. **Settings → API**: copy the project URL and the anon key.

Realtime needs no setup beyond those credentials. Without them the live view
still works, but the stream stays inside the one browser that is connected to
the strap over Bluetooth instead of reaching your other devices.

### Google OAuth

Only needed because Supabase Auth uses it. In the Google Cloud console create an
OAuth 2.0 Client ID of type "Web application", add the Supabase callback URL it
asks for, and paste the ID and secret into Supabase. Nothing from Google goes
into this app's `.env`.

---

## 4. Database

The schema lives in `src/core/db/schema.ts` and is managed with Drizzle.

```bash
bun run db:push       # push the schema straight to the database (development)
bun run db:generate   # write a migration file to drizzle/ (production)
bun run db:studio     # browse the data
```

Tables:

| Table | Holds |
| --- | --- |
| `profiles` | Identity — mirrors `auth.users`, plus handle, language and any bring-your-own WHOOP keys |
| `accounts` | One row per linked WHOOP account: tokens, body measurements, backfill state |
| `cycles` | WHOOP's "day", which runs sleep-to-sleep. Carries day strain |
| `recoveries` | Recovery score, HRV, resting heart rate, SpO2, skin temperature |
| `sleeps` | Stage durations, sleep need and its four components, respiratory rate |
| `workouts` | Logged sessions with heart-rate zone durations |
| `hr_samples` / `hr_sessions` | Beat-level data from the Bluetooth bridge. The WHOOP API has no continuous heart-rate endpoint, so this is the only place it exists |
| `friendships` | One row per pair, in whichever direction the request went |

Identity and the WHOOP connection are deliberately separate. You can sign in, be
invited and approve friends before ever linking a strap, and unlinking WHOOP does
not delete who you are.

To try the friends flow without two real WHOOP accounts:

```bash
SEED_PROFILE_A=<uuid> SEED_PROFILE_B=<uuid> bun run seed
```

The UUIDs are `auth.users.id` values from your Supabase project.

---

## 5. Getting data in

Three mechanisms, in order of immediacy:

**Webhooks** — `POST /api/whoop/webhook`. WHOOP calls this when a cycle scores
or a sleep is edited, and the row is updated within seconds. Register the URL in
the developer dashboard. Signatures are verified against
`WHOOP_WEBHOOK_SECRET`; an unsigned or mis-signed delivery is rejected.

**Nightly reconcile** — `GET /api/cron/reconcile`, scheduled in `vercel.json`
for 05:00 UTC. Webhooks get lost; this walks every linked account and fills the
gaps. It requires `CRON_SECRET` as a Bearer token and returns `503` if the
variable is unset, rather than running unauthenticated.

**Manual** — the sync button in settings, or the CLI:

```bash
bun run whoop status
bun run whoop backfill --user 1001
bun run whoop sync --all
bun run whoop export --user 1001 --format csv --days 90 --out history.csv
bun run whoop insights --user 1001 --locale it
```

The CLI drives `src/core` directly and never touches Next.js or React's render
path, so it works with the web app deleted.

---

## 6. Deployment

Built for Vercel; nothing prevents any Node host.

### Vercel

1. Import the repository. The framework is detected; the build command is
   `bun run build`.
2. Add every variable from section 2 to **Settings → Environment Variables**.
   `APP_URL` and `WHOOP_REDIRECT_URI` must use the production origin, not
   localhost.
3. `vercel.json` already registers the cron job:

   ```json
   { "crons": [{ "path": "/api/cron/reconcile", "schedule": "0 5 * * *" }] }
   ```

   Vercel sends `CRON_SECRET` as the Bearer token automatically.
4. Deploy, then go back and add the production URLs to **WHOOP** (redirect URI)
   and **Supabase** (auth redirect allow-list). Both fail closed, and both fail
   with an unhelpful message if you skip this.

### Post-deploy checklist

- [ ] `/settings` shows four green requirement ticks
- [ ] Google sign-in completes and returns you to the app
- [ ] "Connect WHOOP" completes and the demo chip disappears from the header
- [ ] `curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/reconcile`
      returns a sync summary rather than `401` or `503`
- [ ] The WHOOP developer dashboard shows the webhook URL as verified

### Other hosts

`bun run build && bun run start`. You need a Node 20+ runtime, the same
environment variables, and something to hit `/api/cron/reconcile` daily with the
Bearer token — a system cron and `curl` is enough.

---

## 7. Architecture: how a page loads

Worth understanding before changing anything, because the loading behaviour is
structural rather than incidental.

### The shape

```
src/
  app/                    routes; each page is a layout, not a loader
    _sections/            shared page sections (overview, band labels)
    <route>/_sections.tsx that route's sections, one export per panel
    <route>/loading.tsx   route-level skeleton, for client navigations
  components/
    charts/lazy.tsx       every chart, code-split and client-only
    ui/skeleton.tsx       skeleton primitives shaped like the real components
    nav/                  header slots that need a query
  core/                   pure domain logic — no React, no Next.js
    analytics/            baselines, load, sleep, insights
    data/tables.ts        one request-cached read per table
    data/load.ts          assembles table reads into day records
    whoop/                OAuth, sync, the API client
  server/                 the bridge: request-scoped, policy-applying
    dashboard.ts          whose data, and what to do when there is none
    analytics.ts          the analytics engine, memoised per request
```

### Three rules

**1. A page never awaits data.** Pages await the translator — a cookie read and
a static import — and nothing else. Every panel is an `async` component wrapped
in its own `<Suspense>`, so the grid, the headings and the navigation paint
immediately and each figure appears as it resolves.

**2. A section asks for the shallowest slice it can use.** The four tables are
read separately and concurrently, so a panel blocks only on the tables it
actually reads:

| Slice | Reads | Used by |
| --- | --- | --- |
| `getCoreDays()` | cycles + recoveries | Recovery score, strain, HRV, resting HR |
| `getVitalsDays()` | + sleeps | Everything the analytics engine computes |
| `getAllDays()` | + workouts | Only the strain bars, which shade by logged session |

The recovery score is on screen without waiting for the sleep scan; the strain
bars are last because they are the only thing that needs workouts.

**3. Nothing is computed twice.** `server/analytics.ts` wraps every derivation in
React's `cache`, and the loaders are cached too, so identical arguments are the
same array reference. Ten panels asking for the baseline set produce one
computation.

### Adding a panel

```tsx
// app/<route>/_sections.tsx
export async function MyPanel() {
  const [t, days] = await Promise.all([getTranslator(), getCoreDays()]);
  return <StatTile label={t("...")} value={days.length} />;
}

// app/<route>/page.tsx
<Suspense fallback={<StatTileSkeleton />}>
  <MyPanel />
</Suspense>
```

Two things to get right. Ask for the shallowest slice that works — reaching for
`getAllDays()` out of habit makes your panel wait on the workouts query for
nothing. And make the skeleton the same height as the content, because a
placeholder that is the wrong size makes the page jump when the data lands,
which is worse than no placeholder at all.

### Adding a chart

Import it from `components/charts/lazy`, never from the chart file directly.
Recharts is the largest thing this app ships and the lazy layer is what keeps it
out of every route's first load. Every chart draws inside a `ResponsiveContainer`
that measures its parent before rendering, so server-rendering it produced an
empty `<div>` anyway — `ssr: false` costs nothing and saves the hydration.

### Why it is fast

- The root layout awaits no query. Anything awaited there is awaited before the
  browser gets a single byte, so the header's session, badge and demo chip are
  streamed in as slots instead.
- Reading the viewer is a read. Creating the profile row and minting a handle
  happen once at sign-in, in the OAuth callback, not on every render.
- Resolving the language is a cookie read, never a database round trip. Sign-in
  copies the stored preference into the cookie.
- Every query is bounded by user *and* date. Recoveries are windowed through a
  join on cycles rather than fetched in full and mostly discarded.
- The history window is 120 days. The deepest view uses 90, and the rolling
  baselines inside it need a month of run-up.
- A failed query returns an empty result and costs one panel. It does not throw
  and blank the page around it.

---

## 8. Command reference

| Command | Does |
| --- | --- |
| `bun run dev` | Development server, Turbopack |
| `bun run build` | Production build |
| `bun run start` | Serve the production build |
| `bun run check` | Types, lint and tests in one go |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run lint` | ESLint |
| `bun run test` | Vitest, once |
| `bun run test:watch` | Vitest, watching |
| `bun run test:coverage` | Coverage report |
| `bun run db:push` | Schema to database, no migration file |
| `bun run db:generate` | Write a migration file |
| `bun run db:studio` | Drizzle Studio |
| `bun run seed` | Demo data for two profiles |
| `bun run whoop <cmd>` | The CLI — see section 5 |

---

## 9. Troubleshooting

**Everything says "demo data" even though I connected WHOOP.** The dashboard
falls back to the generated dataset when a linked account has no cycles yet.
Run `bun run whoop backfill --user <id>` and check `/settings` for which
requirement is unticked.

**`invalid_client` from WHOOP.** `WHOOP_REDIRECT_URI` does not match the app
configuration byte for byte. Check the scheme, the port and the trailing path.

**Signed in, but connecting WHOOP redirects to sign-in.** `APP_URL` is unset in
production, so the redirect is being built against `http://localhost:3000`.

**Token refresh fails with a 401 after a while.** Refreshing requires the *same*
client that issued the token. If you linked through a shared slot and later added
your own keys, reconnect from settings — the `credential_source` column records
which one was used, and it does not switch on its own.

**`prepared statement "s1" already exists`.** You are on Supabase's direct
connection string. Switch to the transaction pooler on port 6543.

**Charts are blank on first paint, then appear.** Working as intended. Recharts
is loaded on demand behind a skeleton; if it never arrives, look for a chunk
404 caused by a stale service worker or CDN cache.

**A panel shows an empty state and the rest of the page is fine.** That panel's
query failed. The reason is logged server-side as `[data] <table> failed`.
