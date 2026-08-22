# Environment

Every variable the auth subsystem reads, and what happens without it.

## Telegram — required for sign-in today

| Variable | Required for | Without it |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | Sending codes | The sign-in panel says Telegram is not set up. The webhook answers 200 and records nothing |
| `TELEGRAM_WEBHOOK_SECRET` | Accepting webhook deliveries | **The webhook rejects everything with 401.** Fails closed on purpose |
| `SESSION_SECRET` | Issuing and reading sessions | Codes can be sent but not exchanged for a session. Existing sessions all read as invalid |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | The "open the bot" link | The link is omitted; the instructions still make sense |

```bash
TELEGRAM_BOT_TOKEN=123456:AA...
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=strapbot
TELEGRAM_WEBHOOK_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)
```

`NEXT_PUBLIC_` means it is sent to the browser. That is correct for the bot's
username, which is printed on the page, and would be catastrophic for the token
— note which one is which.

## Database

| Variable | Required for | Without it |
| --- | --- | --- |
| `DATABASE_URL` | Everything about identity | `getViewer()` returns null and the app runs on demo data. Sign-in is unavailable — profiles, the bot registry and login codes all live here |

Use Supabase's **transaction pooler** string (port `6543`). The client is
configured with `prepare: false`, which that pooler requires.

## Google — not needed while it is closed

| Variable | Required for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Google sign-in, **and** the live heart-rate transport |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same |

The anon key is public by design: it is protected by row-level security and is
the key the browser is meant to hold. Both are still worth setting even with
Google closed, because `/live` uses Supabase Realtime.

## Which secret is which

Four long random strings, none interchangeable:

| Variable | Protects |
| --- | --- |
| `SESSION_SECRET` | Signs the Telegram session cookie. Changing it signs everyone out |
| `CREDENTIALS_SECRET` | AES-256-GCM key for WHOOP client secrets in the database. Changing it makes stored keys unreadable |
| `TELEGRAM_WEBHOOK_SECRET` | Proves a webhook delivery came from Telegram |
| `CRON_SECRET` | Bearer token on `/api/cron/reconcile` |

They are separate variables rather than one because they have different blast
radii and different rotation costs. Rotating `SESSION_SECRET` costs everybody
one sign-in; rotating `CREDENTIALS_SECRET` costs everybody who brought their own
WHOOP app a re-entry of credentials they may no longer have.

Generate each with:

```bash
openssl rand -hex 32
```

## Local development

Copy `.env.example` to `.env.local` and fill it in. Telegram only delivers to a
public HTTPS URL, so the webhook needs a tunnel — see
[Strap Bot → Local development](./strap-bot.md#local-development).

## Verifying a deployment

```bash
bun run telegram info      # bot identity, webhook URL, pending updates, last error
bun run db:migrate --dry   # what schema changes are outstanding
bun run db:migrate         # apply them
```

`/settings` shows the same picture from inside the app: which requirements are
met, and which halves of your identity are linked.
