# Threat model

What each control is for, and what is deliberately left undefended.

## Defended

### Guessing a code

Six digits is one in a million. Five guesses per code, five codes per IP per
hour, each new code invalidating the last: 25 guesses per hour per IP against a
million-value space, and no way to keep several codes alive at once.

The attempt counter is incremented in its own statement **before** the
comparison, so a client that fires a guess and drops the connection still pays
for it. Counting after the comparison is the classic way to make a budget
meaningless — never read the response and it never increments.

Comparison is `timingSafeEqual` over the hashes.

### Reading codes out of the database

Only `sha256(code)` is stored. For the five minutes a code is alive its row is a
valid credential, and a leaked backup, a query printed into a log, or a read
replica somebody forgot about must not be enough to sign in as another member.

### Reusing a code

`consumed_at` is set on success, and on the fifth wrong guess, and on any
subsequent code request. A correct code works exactly once.

### Enumerating who uses the app

The sign-in form gives one response to four different situations: username
registered, username not registered, username never started the bot, username
sent `/stop`. Distinguishing them would turn an unauthenticated page into a
membership directory.

The same reasoning is already applied to friend requests in
`src/app/friends/actions.ts`, for the same reason.

### Forging a session

The cookie is HMAC-SHA256 over the payload, verified constant-time. There is no
`alg` field to confuse, because there is no header — see
[Sessions](./sessions.md).

The expiry lives inside the signed payload as well as on the cookie, so a
browser that ignores `maxAge` gains nothing.

`httpOnly` keeps it away from any script, so an XSS is not automatically a
stolen session.

### Forging a webhook delivery

Telegram echoes `TELEGRAM_WEBHOOK_SECRET` in a header on every delivery,
compared with `timingSafeEqual`, **failing closed**: unset means every request
is rejected. Without this, anyone who learned the URL could register themselves
as any chat id — and a URL leaks into logs, proxies and browser history in a way
a header does not.

### Hijacking a released username

Telegram lets an abandoned username be claimed by somebody else. The link is
owned by the numeric `telegram_user_id`, which never changes; the username is a
cache, refreshed on every update, and cleared from the previous holder before
being written. Taking over `@marco` does not take over Marco's Strap account.

### Being registered by a stranger

Pressing Start does not create a profile. It creates a row in
`telegram_chats`, which only means "reachable". A profile appears the first time
a code minted against that row is actually typed back.

### Group chats

`chat.type === "private"` is required. A bot added to a group would otherwise
register every member as reachable, with the group as the place to send their
codes. `/setjoingroups Disable` in BotFather enforces the same thing a second
time, on Telegram's side.

### HTML injection into bot messages

Display names are attacker-chosen — anyone can call themselves `<b>Strap` — and
messages are sent with `parse_mode: HTML`. Everything interpolated goes through
`escapeHtml()`.

### Open redirect after sign-in

`safeNext()` accepts same-origin paths only. It rejects absolute URLs, the
protocol-relative `//elsewhere`, and anything containing `..`. An open redirect
on a sign-in page is a phishing primitive: the link is genuinely ours right up
to the moment it is not.

## Not defended

These are known and accepted, not overlooked.

### A compromised Telegram account

Whoever controls the Telegram account controls the Strap account. That is what
the method means. It is also the strongest argument for
[requiring both methods](./identity-model.md): a compromise would then need the
Google account too.

### A compromised Telegram *client*

Somebody reading over a shoulder, or a desktop client left unlocked, sees the
code. Five minutes is the mitigation, and it is a partial one.

### The bot token

Anyone holding `TELEGRAM_BOT_TOKEN` can read every message sent to the bot,
including codes in flight. It is as sensitive as the session secret. Rotate via
BotFather `/revoke`.

### Distributed rate-limit evasion

The request limit is per IP. An attacker with many IPs gets many buckets. The
per-code attempt limit is not evadable that way — it is per code — so the ceiling
is still five guesses per code, but a botnet can request more codes. Codes go to
the *victim's* Telegram, so the visible effect is a flood of unwanted messages
rather than a viable path in.

There is no per-username request limit, on purpose: it would let anyone lock a
specific member out of signing in by requesting codes on their behalf.

### Timing the username lookup

`reachableChatFor()` is one indexed query and the response is otherwise
identical, but a registered username does trigger an outbound Telegram call.
That is measurable if you are patient. Making it constant-time would mean
issuing codes for usernames that do not exist, which is worse.

### Account merging

Somebody who signs up twice — once with Google, once with Telegram — ends up
with two profiles. This is not detected or repaired. Friendships, the handle and
a WHOOP connection all hang off `profiles.id`, so merging is a deliberate manual
operation, not something to do automatically on a name collision.

### Session revocation

There is no server-side session list. A `strap_session` cookie is valid until it
expires or `SESSION_SECRET` changes; there is no way to sign out one device.
Acceptable for a 30-day cookie that costs six digits to replace, and the reason
sign-out clears both cookies rather than trying to be clever.
