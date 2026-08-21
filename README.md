# Strap — a WHOOP dashboard

Recovery, strain and sleep analytics built on the WHOOP API v2, with live heart
rate over Bluetooth — and shared with whichever family members you invite. Runs
on your Mac, reads on your iPhone.

Clone it and run `npm run dev` — it works immediately on a generated dataset, no
accounts required.

---

## Why it is built this way

WHOOP gives you two completely separate data paths, and they do not overlap:

| | Past data | Live data |
|---|---|---|
| Source | WHOOP REST API v2 (OAuth 2.0) | BLE Heart Rate Broadcast, GATT service `0x180D` |
| Contents | cycles, strain, recovery, HRV, RHR, sleep stages, workouts | BPM + RR intervals, ~1 Hz |
| Transport | HTTPS + webhooks | Bluetooth, needs physical proximity to the strap |
| Limits | 100 req/min, 10k req/day, cursor pagination | broadcast must be on; one connection at a time |

**There is no continuous heart rate in the WHOOP API.** The BLE broadcast is the
only real-time path — the same standard service Zwift, Peloton and Wahoo read.

That matters on Apple hardware, because **Safari does not implement Web Bluetooth
on macOS or iOS**, and Apple has stated no intent to ship it. So a pure web app
could only ever do live HR in Chrome on a Mac, and never on an iPhone.

The architecture follows from that constraint:

```
   ┌───────────────┐   Bluetooth 0x180D    ┌──────────────┐
   │  WHOOP strap  │ ────────────────────▶ │  HR bridge   │  Chrome on your Mac
   └───────┬───────┘                       │ (Web BT tab) │  (or a native Swift app)
           │                               └──────┬───────┘
           │ REST v2 + webhooks                   │ publish
           ▼                                      ▼
   ┌───────────────┐                       ┌──────────────┐
   │   Postgres    │ ◀──── sync ───────    │  Realtime    │  Supabase broadcast
   │  (Supabase)   │                       │   channel    │
   └───────┬───────┘                       └──────┬───────┘
           │                                      │ subscribe
           └───────────────┬──────────────────────┘
                           ▼
                 ┌───────────────────┐
                 │  Next.js dashboard │  Mac, iPhone (PWA), anywhere
                 └───────────────────┘
```

The expensive, iterate-heavy part (charts, insights, layout) lives in the fast
medium. The part that genuinely needs native access is one small component that
almost never changes — and the dashboard cannot tell which bridge is publishing.

## Sharing with family

The second feature, and the one WHOOP gives you no help with at all.

**WHOOP has no user directory.** There is no endpoint that resolves a member by
username, name or email — and there should not be, since it would turn any
member id into a lookup oracle. So the app mints its own handle when an account
first links, and friend search resolves against that.

```
  you                                            your brother
   │  1. invite @marco.fanini                          │
   ├──────────────────────────────────────────────────▶│
   │                                    2. he approves │
   │◀──────────────────────────────────────────────────┤
   │        3. sharing is on, in both directions       │
   ▼                                                   ▼
 you see his recovery /                    he sees your recovery /
 strain / sleep                            strain / sleep
```

Sharing is **symmetric and mutual**: one approval turns it on for both people,
and either side can end it from the friend's card. That is why the friend graph
is a single row per pair rather than two mirrored rows — a half-accepted
friendship is not a state that should be representable.

A few decisions worth knowing about:

- **Linking WHOOP is signing in.** WHOOP is the only identity provider the app
  has, so the OAuth callback also sets the session cookie and mints your handle.
- **An unknown handle and a real one look identical.** Inviting `@nobody` reports
  "request sent" exactly like inviting a real person. Anything else would let
  someone enumerate handles to learn who uses the app.
- **Friend pages 404 rather than 403.** Guessing a handle you have no accepted
  friendship with is indistinguishable from guessing one that does not exist.
- **A friend's view is a glance, not a research tool.** Their card and detail
  page show today's headline, a week of context and a side-by-side comparison
  with your own numbers. The full insight engine stays with the person whose
  body it is describing — and its prose is second-person, which would read wrong
  over someone else's data anyway.
- **No demo fallback on a friend's page.** The dashboard falls back to generated
  data when you are signed out, but a friend with no synced history renders an
  explicit empty state: a generated dataset under a real person's name would be
  indistinguishable from their real numbers.

## Architecture: core, then everything else

The code is split so that pulling and analysing WHOOP data never depends on the
UI existing.

```
  src/core/          pure TypeScript — no React, no Next, no browser
    db/              Drizzle schema and connection
    whoop/           OAuth, rate-limited API client, sync
    analytics/       baselines, load, sleep, insights
    friends/         handles and the friend graph
    i18n/            dictionaries and the translator
    data/            loadDashboardForUser(userId, days)

  src/server/        the Next.js seam — sessions, request caching, policy
  src/app/           pages and routes
  scripts/whoop.ts   the same core, driven from a terminal
```

`src/core` imports nothing from `src/app`, `src/server`, `react` or `next`. That
is not a style preference — it is what makes the CLI below possible, and it is
enforced by the fact that the CLI would fail to run otherwise.

The seam is deliberate about *policy*. `loadDashboardForUser(userId, days)` reads
one member's history and nothing more: it does not decide who is asking, what to
do when there is no data, or whether to cache. Those are request-shaped decisions
and they live in `src/server`, where a page can make them differently from a
friend view — the dashboard falls back to demo data, a friend's page never does.

## Using it without a UI

```bash
npm run whoop -- status                    # what is linked, how fresh it is
npm run whoop -- backfill --user 1001      # pull the full history
npm run whoop -- sync --all                # incremental, every linked account
npm run whoop -- export --user 1001 --format csv --days 90 --out year.csv
npm run whoop -- insights --user 1001 --locale it
```

`insights` is the useful demonstration: it prints the same analysis the dashboard
renders, in either language, with no server running.

```
2026-08-20 — WHOOP user 1002
recovery 40%  strain 17.3  hrv 40ms (baseline 42)  load 1.06x

[ALERT] 14h 35min di debito di sonno nell'ultima settimana
  Hai dormito in media 6h 31min contro un fabbisogno di 8h 35min. Il debito si
  ripaga con circa un'ora in più a notte — una singola dormita del fine
  settimana non lo azzera.
```

## Connecting WHOOP: ten shared slots, then your own app

A WHOOP developer app in development mode is limited to **ten users**. That is a
platform cap, not a setting — the eleventh person to authorise simply fails, and
the failure does not explain itself. So the cap is modelled explicitly rather
than left to surface as a bug report:

- The first ten members claim a numbered slot on this deployment's shared app.
- Everyone after that brings their own WHOOP developer app — client id and
  secret, pasted into settings.
- Anyone may bring their own at any time, which **frees their slot** for someone
  who has no alternative.

Slots are numbered rather than counted, and the number carries a unique
constraint. Two people claiming at once means one `UPDATE` wins and the other
hits the constraint and retries against the next free number — correct across
processes, which an in-memory lock would not be on a platform that runs many
instances at once.

Member-supplied secrets are encrypted with AES-256-GCM before they are stored,
keyed on `CREDENTIALS_SECRET`. The client id is not secret — it travels in the
authorize URL — so settings shows it in full; the secret is never read back,
only replaced.

An account records **which app linked it**. A refresh token is only valid for
the client that issued it, so someone who links via a shared slot and later adds
their own keys keeps refreshing against the shared app until they reconnect.
Re-deriving that at refresh time instead would fail with an opaque 401.

## Tests

```bash
npm test              # 62 tests
npm run test:coverage # statement coverage across src/core
```

The analytics are the product — every insight is downstream of them, so a wrong
z-score produces a dashboard that is confidently wrong rather than visibly
broken. Those get hand-built fixtures with known answers, so a failure names the
arithmetic rather than the fixture. Alongside them: locale negotiation, number
and duration formatting, dictionary parity between English and Italian, secret
encryption, webhook signature verification, and handle validation.

Two assertions are worth calling out because they catch whole classes of
regression rather than single cases:

- **Dictionary parity.** Every leaf key in English must exist in Italian, and no
  Italian string may be byte-identical to its English source outside an explicit
  allow-list of product names and units. An untranslated string cannot ship.
- **Insight keys resolve.** Every key `generateInsights` emits is looked up in
  both languages across several synthetic histories, and the rendered result
  must contain no leftover `{placeholder}`. A renamed key or a params mismatch
  fails the build rather than printing a dotted path on the dashboard.

## Running it against a real database

```bash
npm run db:push   # create the schema
npm run seed      # two members, 180 days each, an accepted friendship
npm run whoop -- status
```

`npm run seed` writes through the same tables the sync path writes to, so the
queries it exercises are the queries production runs. It uses fixed profile ids
and derived record ids, which makes re-seeding idempotent.

## Signing in

Two accounts, doing two different jobs:

- **Google, via Supabase Auth** — who you are. Creates a profile and a handle on
  first sign-in.
- **WHOOP, via OAuth 2.0** — where the data comes from. A *connection* owned by
  a profile, not an identity.

Keeping them separate is what lets you sign in, be invited by your brother and
approve him before you have ever linked a strap — and it means unlinking WHOOP
does not delete who you are or who you share with.

## English and Italian

Locale is resolved per request from, in order: an explicit click on the switcher
(cookie), the signed-in profile, then `Accept-Language`. A stored choice beats
the browser — someone with an Italian phone who picked English meant it.

Two things fall out of doing this properly:

- **The insight engine emits keys and numbers, never prose.** A sentence
  assembled in `insights.ts` could only ever be one language. `translateInsight`
  turns `{ titleKey, params }` into a sentence at render time — in a page, or in
  the CLI.
- **Numbers are formatted by the reader, not the writer.** `10.4` and `10,4` are
  the same strain target; `7h 32m` is `7h 32min` in Italian, because `m` reads as
  metres. Both come from `Intl`, keyed on the request's locale.

`it.ts` is typed against `en.ts`, so a missing translation is a compile error
rather than an English word appearing mid-sentence in production.

## The design system

Modelled on router.com: a technical spec sheet rather than a dashboard.

- **Hairline rules instead of shadows, square corners instead of soft ones.**
  Content is separated the way a table separates it — nothing floats at a
  different elevation. One radius survives, on the segmented nav control, where
  a hard-edged fill behind text reads as a button rather than a tab.
- **Two faces doing two jobs.** A tight grotesque (Inter) for anything a person
  wrote; monospace (IBM Plex Mono) for anything a machine produced — every
  number, axis tick, eyebrow label and piece of metadata. That split is the
  whole typographic idea.
- **Ink is the accent.** There is no brand colour in the chrome: the primary
  action is simply the one element that inverts. Colour is spent only where it
  carries information, in the charts.

Both themes are declared token-for-token in `globals.css`, and `data-theme` is
stamped onto `<html>` by a blocking inline script before first paint — a
dashboard that flashes white for one frame on every load is worse than one with
no light mode at all.

The chart palette was re-picked for this system and checked against **both**
grounds, because one set of colours has to work on white and on near-black:

| | |
|---|---|
| slate / terracotta / moss / heather, adjacent pairs | PASS |
| the three scatter-safe slots, all pairs | PASS |
| every series against its own ground (3:1 graphics minimum) | PASS |

Two rules fall out and are enforced in the components: heather never shares a
scatter plot with slate (the pair collapses under protanopia), and the
recovery bands never carry meaning alone, since a red/amber/green ramp is not
CVD-separable — every use ships with the score and a written label.

Most coloured elements are plain `var(--…)` strings, so they follow the theme
without knowing what it is, including on the server. Recharts is the exception —
some of its props need a concrete value — so client charts resolve the same
variables through `useChartTokens()`, which re-reads them when `data-theme`
changes.

## Stack

- **Next.js 15** (App Router) + React 19 + TypeScript
- **Tailwind v4** with a light/dark token system
- **Recharts** for the analytical charts
- **Drizzle ORM** + Postgres for synced history and the friend graph
- **Supabase Auth** for Google sign-in, **Supabase Realtime** for the live stream
- **No i18n library** — a typed dictionary and `Intl` cover two languages
- **Inter + IBM Plex Mono** via `next/font`, self-hosted, no runtime request
- **Supabase Realtime** broadcast channels for the live heart-rate stream
- **Web Bluetooth** for the HR bridge, with a `BroadcastChannel` fallback for local use

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000 — runs on demo data
```

To connect real data:

```bash
cp .env.example .env.local
# fill in the values, then
npm run db:push      # create the schema
npm run dev
```

Sign in with Google at `/sign-in`, then open `/settings`, click **Connect WHOOP**
and run a backfill. Your handle is minted at sign-in; `/friends` is where you
hand it out.

### Environment

| Variable | Purpose |
|---|---|
| `WHOOP_CLIENT_ID` / `WHOOP_CLIENT_SECRET` | From [developer-dashboard.whoop.com](https://developer-dashboard.whoop.com) |
| `WHOOP_REDIRECT_URI` | Must match the app registration exactly |
| `WHOOP_WEBHOOK_SECRET` | Signing key for webhook deliveries (defaults to the client secret) |
| `DATABASE_URL` | Postgres connection string. Required for friends |

| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Google sign-in and the live HR transport |
| `CRON_SECRET` | Bearer token protecting the nightly reconcile job |

Everything is optional. Without `DATABASE_URL` the dashboard runs on demo data
and friends are unavailable — the graph needs somewhere to live. Without the
Supabase keys the live stream stays inside one browser.

## Live heart rate

1. Open the WHOOP app → **Heart Rate Broadcast** → on.
2. Open `/live` in **Chrome or Edge on macOS** and click **Connect strap**.
3. Open `/live` anywhere else — iPhone included — to watch the same stream.

The iPhone is a pure subscriber. It never touches Bluetooth, which is exactly why
it works despite Safari having no Web Bluetooth.

Add the dashboard to your iPhone home screen (Share → Add to Home Screen) and it
runs standalone, with a manifest and safe-area handling already in place.

### Swapping in a native bridge

The bridge publishes one message shape:

```ts
{ sessionId, bpm, rrIntervals, energyExpended, at, deviceName }
```

Anything that can publish that onto the Supabase channel is a valid bridge — a
SwiftUI menu-bar app using CoreBluetooth drops in without a single change to the
dashboard. `src/lib/live/protocol.ts` holds the parser and the message contract,
including the detail that RR intervals arrive in units of 1/1024 s rather than
milliseconds.

## Keeping data fresh

Three overlapping mechanisms, because webhooks alone are not reliable enough:

1. **Webhooks** → `/api/whoop/webhook`. HMAC-verified against the raw body, with a
   five-minute replay window. Re-fetches only the record that changed.
2. **Nightly reconcile** → `/api/cron/reconcile`, wired up in `vercel.json`. Re-pulls
   a rolling week so a delivery missed during a deploy costs a day of freshness
   rather than leaving a permanent hole. It runs for *every* linked account: a
   friend's dashboard is only as fresh as their own sync, and they are not
   necessarily around to trigger one.
3. **Manual sync** → `/api/whoop/sync?mode=backfill|incremental`.

The API client spaces requests ~650 ms apart (≈92 req/min against the 100 ceiling)
and honours `X-RateLimit-Reset` on a 429 rather than retrying blindly.

## What the analytics actually do

Everything is measured against *your own* baseline, because population norms for
these metrics are close to useless — healthy adult HRV spans 20–200 ms.

- **Baselines** (`src/lib/analytics/baselines.ts`) — 30-day rolling mean and SD per
  metric, with today excluded from its own baseline. Charts show a ±1 SD band, so
  "48 ms" becomes "outside your normal range".
- **Training load** (`load.ts`) — acute (7-day) vs chronic (28-day) exponentially
  weighted strain. The ratio is the number that matters: 0.80–1.30 is productive,
  above 1.5 is a spike.
- **Strain vs recovery** (`load.ts`) — an explicit heuristic mapping recovery to a
  supported strain range, and a deviation series with a real zero.
- **Sleep** (`sleep.ts`) — debt against WHOOP's own computed need, stage
  composition, bedtime variability, and the correlation between sleep performance
  and next-day recovery.
- **Live HRV** (`hrv.ts`) — RMSSD and SDNN from RR intervals, with artifact
  filtering. A single dropped beat can otherwise double the RMSSD.
- **Insights** (`insights.ts`) — turns those into sentences. Every insight names its
  evidence: not "HRV is 48 ms" but "HRV is 1.8 SD below your 30-day baseline".

Where a number is an approximation rather than WHOOP's own, the UI says so — the
live strain estimate in particular reproduces the *shape* of WHOOP's scale, not
its proprietary formula.

## Charts

The palette is not chosen by eye. It was run through a validator against this
app's own dark surface, checking lightness band, chroma floor, colour-vision
separation and contrast. Two rules fall out and are enforced in the components:

- Violet never shares a scatter plot with blue — the pair measures ΔE 1.9 under
  protanopia. It is fine on lines and stacks, where marks are separated.
- The red/amber/green recovery bands are inherently not CVD-separable, so they
  never carry meaning alone: every use ships with the score and a written label.

Strain and recovery are never plotted on one pair of axes. A dual-axis version of
that chart aligns two unrelated scales arbitrarily and invents a relationship —
so the app uses a scatter (one measure per axis) and a deviation series instead.

## Demo data

`src/lib/data/demo.ts` generates 180 seeded days where recovery responds to the
previous day's strain and the night's sleep, load builds and tapers across a
training block, and one seeded illness episode raises temperature, respiratory
rate and RHR together while HRV collapses — the exact pattern the insight engine
is built to catch. It is deterministic, so the same day always renders the same
numbers.

## Scripts

```bash
npm run dev          # dev server
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run db:generate  # generate SQL migrations from the schema
npm run db:push      # apply the schema to DATABASE_URL
npm run whoop        # the CLI above — pass -- before its arguments
```
