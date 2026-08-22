# Identity model

## One profile, several proofs

A **profile** is a person, as this app knows them. It owns a handle, a language,
friendships, and — if they have linked a strap — a WHOOP connection. Everything
in the app keys off `profiles.id`.

A **proof** is a way of demonstrating you are that person. There are two, and a
profile can hold either or both:

| Proof | Column | What it establishes |
| --- | --- | --- |
| Google | `profiles.google_linked_at` | A verified email address, and an account nobody else can open |
| Telegram | `profiles.telegram_user_id` + `telegram_linked_at` | A live channel to a specific human being |

Neither is the primary key. `profiles.id` is a UUID that mirrors
`auth.users.id` when Google created the row, and is locally generated
(`randomUUID()`) when Telegram did. Nothing outside `src/server/auth.ts` cares
which — the rest of the app only ever needs a stable id per person.

## Why both, eventually

They are not redundant.

Google proves an **address**: a mailbox that has been verified, that the app can
write to, and that a stranger cannot claim. What it does not prove is that
anybody is reading it. Email is a dead drop.

Telegram proves **reachability**: there is a person on the other end of a live
channel, they responded within five minutes, and the same channel can be used
again later — for a recovery alert, a friend request, an "your strap has not
synced in four days". What it does not carry is a verified address.

A profile with both is meaningfully harder to impersonate than one with either,
and it is the only configuration where the app can say "we know who this is
*and* we can tell them something".

### What is built, and what is not

| Capability | State |
| --- | --- |
| Sign in with Telegram, creating a profile | Built |
| Sign in with Telegram while already signed in with Google, linking the two | Built — `linkTelegramIdentity` takes the current viewer's profile id |
| Sign in with Google | Built, [closed](./google-oauth.md) |
| Settings shows which halves are held | Built — `IdentityPanel` |
| *Requiring* both before granting access | **Not built.** Deliberately: it cannot be turned on until Google is open, or nobody can sign in |

When the requirement is switched on, the enforcement point is `getViewer()` —
it already returns `identity: { google, telegram }`, so a gate reads
`viewer.identity.google && viewer.identity.telegram` and everything above it
keeps working unchanged.

## Tables

### `profiles` — the person

Columns added for this feature:

| Column | Type | Notes |
| --- | --- | --- |
| `google_linked_at` | `timestamptz` | Set by the OAuth callback. Null on a Telegram-only member |
| `telegram_user_id` | `bigint` unique | The numeric Telegram id. Never changes; this is what owns the link |
| `telegram_username` | `text` | Lowercased, no `@`. A **cache** of what the bot last saw |
| `telegram_linked_at` | `timestamptz` | Set when a code was verified, not when the bot was started |

The id owns the link and the username does not, because Telegram usernames can
be given up and claimed by somebody else. A member who releases `@marco` and
somebody else takes it must not thereby hand over their account — so lookups
resolve username → id at sign-in time, and the id is what gets written.

### `telegram_chats` — who the bot can reach

A bot cannot open a conversation. Telegram only lets it reply inside a chat the
person started, which is why the flow begins in Telegram rather than in the
browser: there is no way to send a code to a username the bot has never met.

| Column | Notes |
| --- | --- |
| `telegram_user_id` | Primary key — the person |
| `chat_id` | Where to deliver. Identical to the user id for a private chat; kept separate because it is the field the Bot API takes |
| `username` | Unique index, nullable. Not the key — see above |
| `first_name`, `last_name`, `language_code` | Whatever Telegram last told us |
| `blocked_at` | Set by `/stop`. The row stays; sign-in stops working |
| `started_at`, `updated_at` | |

**This table is not a user table.** Pressing Start is not signing up — it only
makes someone reachable. A row here becomes a profile the first time a code
minted against it is actually verified. Anything else would let a stranger fill
`profiles` by pressing a button.

#### Username churn

`rememberChat()` handles the reuse case explicitly. Before writing a username it
clears that username from any other row holding it, then from any other profile
caching it. Without that first step, a legitimately transferred username is a
unique-constraint violation on an otherwise ordinary webhook delivery.

### `login_codes` — codes in flight

| Column | Notes |
| --- | --- |
| `id` | uuid |
| `telegram_user_id` | Who the code was sent to |
| `code_hash` | SHA-256. **The plaintext code is never stored** |
| `attempts` | Incremented before each comparison, so an abandoned guess still costs one |
| `request_ip` | Only ever counted and compared; never shown |
| `expires_at` | Five minutes after issue |
| `consumed_at` | What makes a correct code work exactly once |
| `created_at` | Also the window the per-IP rate limit counts over |

Rows are kept after use rather than deleted, then pruned after 24 hours by the
next call to `issueLoginCode`. Opportunistic rather than scheduled: the table
only grows when somebody signs in, so the cleanup naturally lands where the rows
come from, and one extra small `DELETE` is cheaper to operate than a cron entry
that has to be monitored.

## Handles

Handles are minted the same way regardless of method, by `ensureHandle()`. A
Telegram member's handle is derived from their Telegram display name, falling
back to their username, falling back to `member.<first 8 of uuid>` — the same
ladder Google members go down, with a different first rung.

The handle is **not** the Telegram username. It is renameable, it is what
friends search for, and it does not change when Telegram churns.

## Migration

`drizzle/0002_telegram_auth.sql`. Two new tables, four new columns on
`profiles`, and one backfill:

```sql
UPDATE "profiles" SET "google_linked_at" = "created_at" WHERE "google_linked_at" IS NULL;
```

Google was the only way in before this migration, so every existing profile got
here through it. Dating the link from the row's own creation keeps "linked with
Google" true for members who signed in before the column existed.

Apply with:

```bash
bun run db:migrate --dry   # list what would run
bun run db:migrate         # apply it
```

The runner (`scripts/migrate.ts`) executes each file in `drizzle/` once, in
order, inside a transaction, and records it in a `_migrations` table — so
running it twice is a no-op.

`bun run db:push` also works and is what the README documents, but it diffs the
schema against the live database and decides for itself what to do about the
difference. That is convenient on a scratch database and unnerving on one with
data in it, because "the column is gone from the schema" and "the column should
be dropped" look identical to a diff.
