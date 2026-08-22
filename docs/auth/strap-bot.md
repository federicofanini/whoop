# Strap Bot — specification

The Telegram bot that signs members in.

| | |
| --- | --- |
| **Name** | Strap Bot |
| **Username** | `@strapbot` — or whatever BotFather gives you; set `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` to match |
| **Purpose** | Deliver sign-in codes, and be the channel Strap can reach a member on later |
| **Transport** | Webhook, `POST /api/telegram/webhook` |
| **Runtime** | Node.js route handler. No long polling, no bot framework, no persistent process |

## Scope

Strap Bot is not a chat interface and is not trying to become one. It does two
things:

1. Notices that somebody has opened a channel to it, and records where to reach
   them.
2. Delivers a six-digit code into that channel when the app asks.

Everything else — dashboards, friend requests, sync — stays in the web app.
That keeps the bot's attack surface to one webhook and one outbound method, and
means it needs no state of its own beyond `telegram_chats`.

Future work that belongs here (recovery alerts, "your strap has not synced in
four days") reuses the same channel and the same table. Nothing about that is
built yet.

## Persona and voice

Plain, short, and never enthusiastic. The bot is a utility that hands over a
number; a mascot handing over a credential reads as a phishing attempt. No
emoji in the code message itself, no links, no unfurled previews.

## Commands

Published to the Telegram menu with `bun run telegram set-commands`.

| Command | Behaviour |
| --- | --- |
| `/start` | Register or refresh the chat. Reply with what the bot is for and, if the member has no Telegram username, how to set one |
| `/help` | Identical to `/start`. Somebody who is lost types one or the other and should not have to guess which |
| `/whoami` | Echo the numeric Telegram id and the username the bot sees. A support tool: "the app says it does not know you" is almost always a username mismatch |
| `/stop` | Set `blocked_at`. The bot stops messaging them and their username can no longer be used to sign in |

Any other message — text, sticker, photo — is silently treated as a
registration refresh. No reply. A bot that answers everything trains people to
talk to it.

Sending `/start` after `/stop` clears `blocked_at`: coming back is consent to be
messaged again.

## Message templates

**On `/start` or `/help`, with a username:**

> Hi {first name} — this is **Strap Bot**.
>
> You are now registered, which is all this chat is for: it is where your
> sign-in codes arrive.
>
> Go back to Strap, enter **@{username}**, and I will send you a six-digit code.
>
> Send /stop at any time and I will stop being able to reach you.

**Without a username**, the third paragraph becomes:

> One thing first: you have no Telegram username. Set one in **Settings →
> Username**, send me any message so I see it, then use it to sign in.

**The sign-in code:**

> **{code}** is your Strap sign-in code.
>
> It expires in 5 minutes and can be used once. If you did not just try to sign
> in, ignore this message — someone typed your username, and without this code
> they get nowhere.

The last sentence is doing real work. Someone who receives an unexpected code
has just learned that a stranger knows their Telegram username, and the message
needs to tell them both that this is not an emergency and that they should not
type the number anywhere.

All messages are sent with `parse_mode: HTML` and
`disable_web_page_preview: true`. Display names are attacker-chosen — anyone can
call themselves `<b>Strap` — so everything interpolated goes through
`escapeHtml()` first.

## Webhook contract

```
POST /api/telegram/webhook
X-Telegram-Bot-Api-Secret-Token: <TELEGRAM_WEBHOOK_SECRET>
Content-Type: application/json
```

### Authentication

The secret token is compared with `timingSafeEqual` and **fails closed**: if
`TELEGRAM_WEBHOOK_SECRET` is unset, every delivery is rejected with 401. An
unset secret meaning "skip the check" would leave a public endpoint anyone can
use to register themselves as any chat id.

The URL is not treated as a secret. URLs leak into logs, proxies and browser
history in a way a header does not.

### Responses

| Status | When |
| --- | --- |
| `401` | Missing or wrong secret token |
| `200` | Handled, **and** anything not actionable: malformed JSON, a group message, a message from a bot, an unconfigured deployment |
| `500` | The database was unreachable while recording a registration |

Telegram retries non-2xx deliveries, so the split is by whether a retry would
help. A sticker will still be a sticker next time; a database that was down for
two seconds will not be.

### Accepted updates

Only `message` and `edited_message`, requested explicitly in `setWebhook`.
Everything else is bandwidth spent on updates the handler drops.

Within those, the handler requires `chat.type === "private"` and
`from.is_bot !== true`.

## Setup

### 1. Create the bot

Talk to [@BotFather](https://t.me/BotFather):

```
/newbot
  name:     Strap Bot
  username: strapbot          (must end in "bot" and be globally unique)
```

BotFather replies with the token. Recommended follow-ups, all in BotFather:

```
/setdescription    Signs you in to Strap and sends you a code. Nothing else.
/setabouttext      Sign-in codes for Strap.
/setuserpic        (the Strap mark)
/setprivacy        Enable    — the bot only sees commands addressed to it
/setjoingroups     Disable   — this bot has no business in a group
```

`/setjoingroups Disable` is worth doing even though the handler already rejects
group messages: two independent controls, and the second one is enforced by
Telegram.

### 2. Configure the deployment

```bash
TELEGRAM_BOT_TOKEN=123456:AA...              # from BotFather
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=strapbot   # no @, printed on the sign-in page
TELEGRAM_WEBHOOK_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)
```

### 3. Register the webhook

```bash
bun run telegram set-webhook --url https://strap.example.com
bun run telegram set-commands
bun run telegram info
```

`set-webhook` refuses to run without `TELEGRAM_WEBHOOK_SECRET` — a webhook
registered without one would look healthy from the CLI and fail on every real
delivery.

`info` prints the bot identity, the registered URL, the pending update count and
the last delivery error, which is the first thing to check when codes stop
arriving.

### Local development

Telegram only delivers to a public HTTPS URL, so `localhost` needs a tunnel:

```bash
ngrok http 3000
bun run telegram set-webhook --url https://<subdomain>.ngrok-free.app
```

One bot can have exactly one webhook. Sharing a bot between a laptop and
production means whoever ran `set-webhook` last receives everything — create a
second bot (`@strapbot_dev`) rather than fighting over one.

Run `bun run telegram set-webhook --url https://strap.example.com` again when
you are done, or production stays pointed at a dead tunnel.

## Operations

| Symptom | Check |
| --- | --- |
| No code arrives | `bun run telegram info` — is the webhook URL right, and what is `last error`? |
| "If that username is registered…" but nothing comes | The member has not pressed Start, or their Telegram username differs from what they typed. Have them send `/whoami` |
| Codes arrive but sign-in fails | `SESSION_SECRET` is unset or changed |
| Webhook returns 401 to everything | `TELEGRAM_WEBHOOK_SECRET` differs between the deployment and what `setWebhook` registered. Re-run `set-webhook` |
| Pending update count climbing | The handler is returning 500 — almost always the database |

### Rotating the bot token

Ask BotFather for `/revoke`, update `TELEGRAM_BOT_TOKEN`, then re-run
`set-webhook` and `set-commands`. The old token stops working immediately, so
do it in that order. `telegram_chats` is unaffected — chat ids belong to the
bot's identity, not its token.
