# Telegram OTP sign-in

The flow the user asked for, in four steps:

1. The member opens Strap Bot and presses **Start**, so we know who they are.
2. They type their Telegram username into Strap.
3. The bot sends a one-time code to their Telegram.
4. They type the code back. If it is right, they are signed in.

## The flow, in detail

### Step 0 — registration (`/start`)

Telegram delivers an update to `POST /api/telegram/webhook`. The handler
verifies the secret token header, then calls `rememberChat()`, which upserts
into `telegram_chats`: the numeric user id, the chat id to send to, the
username, the display name, and the interface language.

This happens on **every** update, not only on `/start`. A username or display
name changed inside Telegram never produces an event of its own — the change
simply rides along on the next message — so the registry refreshes each time it
hears anything.

The bot replies with a short confirmation, and with a specific nudge if the
account has no username at all: without one there is nothing to type on the
sign-in page.

Group messages and messages from other bots are dropped. A bot added to a group
would otherwise register every member of it as reachable, with the group as the
place to send their codes.

### Step 1 — request a code

`requestStep` in `src/app/sign-in/actions.ts`:

```
validateTelegramUsername(input)     → 5-32 chars, [a-z0-9_], starts with a letter
withinRequestLimit(ip)              → 5 codes per IP per hour
reachableChatFor(username)          → telegram_chats, excluding /stop
issueLoginCode(userId, chatId, ip)  → mint, store hash, send plaintext
```

**The response is identical whether or not the username exists.** Not
registered, never started the bot, and asked the bot to stop all produce the
same screen and the same message. Distinguishing them would make an
unauthenticated page into a membership oracle: type usernames, watch which ones
come back different, and you have a list of who uses Strap.

The code is six digits from `randomInt` — not `Math.random`, because this is a
credential and a predictable one is worth nothing.

Issuing a code marks any previous unconsumed code for the same person as
consumed. Two codes are never live at once, so pressing "start over" repeatedly
cannot be used to widen the guessing window.

### Step 2 — verify

`verifyStep`:

```
normalizeCode(input)                → strips everything that is not a digit
verifyLoginCode(userId, code)       → "ok" | "invalid" | "too-many-attempts"
getViewer()                         → already signed in? then this is a link
linkTelegramIdentity(...)           → create or attach the profile
startTelegramSession(...)           → sign and set strap_session
redirect(safeNext(next))
```

`verifyLoginCode` does three things in a specific order:

1. Select the newest unconsumed, unexpired code for that person.
2. `UPDATE … SET attempts = attempts + 1 … RETURNING attempts` — a separate
   statement, **before** the comparison. A client that fires a guess and drops
   the connection still pays for it; otherwise the attempt budget is bypassed
   by never reading the response.
3. Compare `sha256(input)` against the stored hash with `timingSafeEqual`, then
   consume the row.

Over the budget, the code is destroyed rather than merely refused, so five wrong
guesses cost a round trip through Telegram.

**Identity is written here and only here.** A code that was never typed back
creates nothing. If the bot's `/start` created profiles, anyone could fill the
table by pressing a button.

### Step 3 — linking rather than creating

If `getViewer()` already returns somebody, the verified Telegram account is
attached to *that* profile instead of starting a new one. This is the half of
"both methods" that works today: sign in with Google, verify a Telegram code,
and the two are the same person for good.

`linkTelegramIdentity` resolves the profile id in this order:

1. **Refuse** if this `telegram_user_id` already belongs to one profile and a
   *different* profile is signed in. Both are real, each may own friendships and
   a WHOOP connection, and picking a winner would silently strand the other.
2. A profile that already holds this `telegram_user_id` — the same person
   coming back on a new device.
3. The profile of whoever is currently signed in — a link.
4. A fresh `randomUUID()` — a new member.

On conflict it uses `coalesce(profiles.full_name, <telegram name>)`, so linking
Telegram to a Google profile never quietly renames the member to their Telegram
alias.

## Limits

| Limit | Value | Where |
| --- | --- | --- |
| Code lifetime | 5 minutes | `CODE_TTL_MS` |
| Guesses per code | 5 | `MAX_ATTEMPTS` |
| Codes per IP | 5 per hour | `MAX_REQUESTS_PER_IP` / `REQUEST_WINDOW_MS` |
| Session lifetime | 30 days | `SESSION_MAX_AGE_SECONDS` |
| Code row retention | 24 hours | `pruneOldCodes` |

The request limit is counted **per IP, not per username**. The thing worth
limiting is somebody walking a list of usernames to find which ones the bot
knows, and a per-user limit does nothing about that.

Brute-force arithmetic: a six-digit code is one in a million, five guesses per
code, five codes per IP per hour. That is 25 guesses per hour per IP against a
million-value space, and each new code invalidates the last.

## The form

One form, two steps, one server action. `useActionState` carries which step is
showing, so the username survives a failed verification without the client
holding a copy of anything the server already knows.

The username field becomes `readOnly` — not `disabled` — once a code is out. A
disabled field is not submitted, and the action needs it back.

The code field is `inputMode="numeric"` with `autoComplete="one-time-code"`: a
numeric keypad on a phone and iOS SMS-style autofill, without the spinners
`type="number"` brings and without rejecting a pasted `123 456`.

Every message the action returns is a **dictionary key**, not a sentence. The
server does not know which language the member reads. Keys live under
`signIn.telegram.*` in `src/core/i18n/en.ts` and `it.ts`.

## Failure modes

| What the member sees | What happened |
| --- | --- |
| "If that username is registered, a code is on its way" | Either a code was sent, or there was nobody to send it to. Deliberately indistinguishable |
| "That code is wrong or has expired" | Wrong code, expired code, or no code was ever issued |
| "Too many wrong codes" | Five guesses used. The code is gone; ask for another |
| "Too many sign-in attempts from here" | Five codes from this IP within the hour |
| "That Telegram account already belongs to a different Strap profile" | You are signed in as one profile and verified a code for a Telegram account owned by another. Sign out first |
| "Telegram sign-in is not set up on this deployment" | One of `TELEGRAM_BOT_TOKEN`, `SESSION_SECRET`, `DATABASE_URL` is missing |

Telegram being unreachable is not surfaced separately. `sendMessage` returns
false and the member sees the same "a code is on its way" — they will notice
nothing arrived and press "start over", which is the same recovery either way.
