# Authentication

Strap has two ways in. Both are meant to stay.

| Method | Status | What it proves |
| --- | --- | --- |
| **Telegram OTP** — Strap Bot sends a six-digit code | **Open** | A person who can be *reached*: a live channel, not just an address |
| **Google OAuth** — via Supabase Auth | **Closed** ([how to open it](./google-oauth.md)) | An email address nobody else can claim |

They are not alternatives that happen to coexist. They answer different
questions, and the intended end state is a profile that has proved both — at
which point the pair identifies a member far more tightly than either alone.
[The identity model](./identity-model.md) explains what that means for the
schema and what still has to be built to get there.

## Read these in order

| Document | What it covers |
| --- | --- |
| [Identity model](./identity-model.md) | What a profile is, how the two methods attach to one, the tables behind it |
| [Telegram OTP](./telegram-otp.md) | The sign-in flow end to end, and why each step is the way it is |
| [Strap Bot](./strap-bot.md) | The bot specification: BotFather setup, commands, webhook contract |
| [Sessions](./sessions.md) | Two cookies, two lifetimes, how `getViewer` resolves either |
| [Google OAuth](./google-oauth.md) | The closed path, and the checklist to open it |
| [Environment](./environment.md) | Every variable this subsystem reads, and what breaks without it |
| [Threat model](./threat-model.md) | What each control is defending against, and what is deliberately not defended |

## The thirty-second version

```
 Telegram                      Strap                        Postgres
 ────────                      ─────                        ────────
 /start  ──────────────────▶  /api/telegram/webhook  ────▶  telegram_chats
                                                            (who can be reached)

                              /sign-in
                              "type your @username"
                                     │
                                     ▼
                              reachableChatFor()   ◀─────── telegram_chats
                                     │
                                     ▼
 6-digit code  ◀────────────  issueLoginCode()     ────────▶ login_codes
                                                            (sha256 only)
 read the code
      │
      ▼
 type it into Strap  ───────▶ verifyLoginCode()    ◀───────  login_codes
                                     │
                                     ▼
                              linkTelegramIdentity() ─────▶  profiles
                                     │
                                     ▼
                              strap_session cookie
```

## Where the code lives

| Path | Role |
| --- | --- |
| `src/core/auth/providers.ts` | The single switch for which methods are open |
| `src/core/auth/otp.ts` | Issuing, sending and verifying codes |
| `src/core/auth/token.ts` | Signing and verifying the session cookie — pure, no request |
| `src/core/telegram/bot.ts` | The Bot API calls this app makes |
| `src/core/telegram/registry.ts` | The bot's address book |
| `src/core/telegram/username.ts` | Telegram's username rules, kept pure and testable |
| `src/server/session.ts` | The cookie side of a Telegram session |
| `src/server/auth.ts` | `getViewer()` — the one place identity is resolved |
| `src/app/sign-in/` | The page, its two-step form, and the server actions |
| `src/app/api/telegram/webhook/route.ts` | Everything the bot hears |
| `src/app/auth/callback/route.ts` | Where Google sends members back |
| `scripts/telegram.ts` | `bun run telegram` — webhook and command-menu setup |

Tests are in `tests/auth.test.ts`, covering the pure parts: username rules,
code normalisation and hashing, session token forgery and expiry, and the
post-sign-in redirect.

## A note on the reference code

`auth_telegram_example/` at the repository root is pasted-in reference code from
another project (CertDesk). It was the starting point for this implementation
and has been read, ported and superseded. It cannot compile here — it imports
`jose` and a Redis client that this repo does not have — so it is excluded from
`tsconfig.json` and from ESLint.

Two things were changed deliberately in the port, both recorded in the code:

- **Redis became Postgres.** The reference kept codes and rate-limit counters in
  Redis. This app already runs Postgres, and the only property Redis was
  providing was expiry — which a timestamp column expresses just as well,
  without a second piece of infrastructure to run, secure and pay for.
- **`jose` became `node:crypto`.** See [Sessions](./sessions.md) for why the
  session token has no JWT header.

The folder is safe to delete once you are satisfied with the port.
