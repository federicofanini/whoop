#!/usr/bin/env bun
/**
 * Strap Bot, from the command line.
 *
 * Registering a webhook is a one-off HTTP call that has to be made from
 * somewhere, and doing it by hand means a curl command with a bot token in
 * shell history. This reads the token from the environment instead, and gives
 * the three commands that setup actually needs.
 *
 *   bun run telegram info
 *   bun run telegram set-webhook --url https://strap.example.com
 *   bun run telegram set-commands
 *   bun run telegram delete-webhook
 */

// Load .env.local before anything reads process.env at module scope.
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
    break;
  } catch {
    // Not present; fall through to the real environment.
  }
}

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

/** The commands Telegram offers in the bot's menu. */
const COMMANDS = [
  { command: "start", description: "Register so Strap can send you sign-in codes" },
  { command: "whoami", description: "Show the Telegram id and username Strap sees" },
  { command: "stop", description: "Stop the bot messaging you and block sign-in" },
  { command: "help", description: "What this bot is for" },
];

async function api<T>(method: string, body: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as { ok: boolean; result?: T; description?: string };
  if (!payload.ok) throw new Error(payload.description ?? `${method} failed (${response.status})`);
  return payload.result as T;
}

function flag(argv: string[], name: string): string | undefined {
  const at = argv.indexOf(`--${name}`);
  return at === -1 ? undefined : argv[at + 1];
}

async function main() {
  const [command = "help", ...rest] = process.argv.slice(2);

  if (command === "help") {
    console.log(
      [
        "bun run telegram info                          bot identity and webhook status",
        "bun run telegram set-webhook --url <origin>    point Telegram at this deployment",
        "bun run telegram set-commands                  publish the bot's command menu",
        "bun run telegram delete-webhook                stop deliveries",
      ].join("\n"),
    );
    return;
  }

  if (!TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN is not set. Copy .env.example to .env.local and fill it in.");
    process.exit(1);
  }

  switch (command) {
    case "info": {
      const me = await api<{ username: string; first_name: string; id: number }>("getMe");
      const hook = await api<{ url: string; pending_update_count: number; last_error_message?: string }>(
        "getWebhookInfo",
      );

      console.log(`@${me.username} (${me.first_name}, id ${me.id})`);
      console.log(`webhook: ${hook.url || "— none set"}`);
      console.log(`pending updates: ${hook.pending_update_count}`);
      if (hook.last_error_message) console.log(`last error: ${hook.last_error_message}`);
      break;
    }

    case "set-webhook": {
      const origin = flag(rest, "url");
      if (!origin) {
        console.error("Pass the deployment origin: --url https://strap.example.com");
        process.exit(1);
      }
      if (!WEBHOOK_SECRET) {
        // The route refuses every delivery without it, so a webhook registered
        // now would look healthy from here and fail on every real update.
        console.error("TELEGRAM_WEBHOOK_SECRET is not set — the webhook route would reject Telegram.");
        process.exit(1);
      }

      await api("setWebhook", {
        url: new URL("/api/telegram/webhook", origin).toString(),
        secret_token: WEBHOOK_SECRET,
        // The bot only ever reacts to private messages; asking for anything
        // else is bandwidth spent on updates the handler drops.
        allowed_updates: ["message", "edited_message"],
        drop_pending_updates: true,
      });

      console.log(`Webhook set to ${new URL("/api/telegram/webhook", origin)}`);
      break;
    }

    case "set-commands": {
      await api("setMyCommands", { commands: COMMANDS });
      console.log(`Published ${COMMANDS.length} commands.`);
      break;
    }

    case "delete-webhook": {
      await api("deleteWebhook", { drop_pending_updates: true });
      console.log("Webhook removed.");
      break;
    }

    default:
      console.error(`Unknown command: ${command}. Try 'help'.`);
      process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
