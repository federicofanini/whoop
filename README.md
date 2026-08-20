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

## Stack

- **Next.js 15** (App Router) + React 19 + TypeScript
- **Tailwind v4** with a dark design system
- **Recharts** for the analytical charts
- **Drizzle ORM** + Postgres for synced history and the friend graph
- **HMAC-signed session cookie** over WHOOP OAuth — no second identity provider
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

Open `/settings` and click **Connect WHOOP**, then **Backfill history**. Linking
also signs you in and gives you a handle; `/friends` is where you hand it out.

### Environment

| Variable | Purpose |
|---|---|
| `WHOOP_CLIENT_ID` / `WHOOP_CLIENT_SECRET` | From [developer-dashboard.whoop.com](https://developer-dashboard.whoop.com) |
| `WHOOP_REDIRECT_URI` | Must match the app registration exactly |
| `WHOOP_WEBHOOK_SECRET` | Signing key for webhook deliveries (defaults to the client secret) |
| `DATABASE_URL` | Postgres connection string. Required for friends |
| `SESSION_SECRET` | Signs the session cookie. Falls back to the client secret |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Realtime transport for live HR |
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
```
