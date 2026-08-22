"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isDbConfigured } from "@/core/db";
import { CODE_LENGTH, issueLoginCode, normalizeCode, verifyLoginCode, withinRequestLimit } from "@/core/auth/otp";
import { isSessionSecretConfigured } from "@/core/auth/token";
import { isBotConfigured } from "@/core/telegram/bot";
import { reachableChatFor } from "@/core/telegram/registry";
import { normalizeTelegramUsername, validateTelegramUsername } from "@/core/telegram/username";
import { getViewer, linkTelegramIdentity } from "@/server/auth";
import { syncLocaleCookie } from "@/server/locale";
import { startTelegramSession } from "@/server/session";
import { safeNext, type LoginState } from "./login-state";

/**
 * Both halves of Telegram sign-in, behind one action.
 *
 * One action rather than two because the form is one form: the same submit
 * button asks for a code and then checks it, and `useActionState` carries which
 * step we are on between the two. A "resend" is a request step with the
 * username already filled in.
 */
export async function loginAction(previous: LoginState, formData: FormData): Promise<LoginState> {
  const restarting = formData.get("intent") === "restart";
  return previous.step === "verify" && !restarting
    ? verifyStep(previous, formData)
    : requestStep(formData);
}

/**
 * Step one: turn a username into a code sitting in somebody's Telegram.
 *
 * The reply is identical whether or not that username exists, has started the
 * bot, or asked it to stop. Distinguishing them would make this form a
 * membership oracle: type usernames, watch which ones come back different, and
 * you have a list of who uses the app — from a page that requires no account.
 */
async function requestStep(formData: FormData): Promise<LoginState> {
  const raw = String(formData.get("username") ?? "");
  const parsed = validateTelegramUsername(raw);

  // Every path out of this step starts the attempt count over: a new code
  // means the guesses spent on the last one are no longer being counted.
  if (!parsed.ok) {
    // Normalised even when invalid: the field renders behind a fixed "@", so
    // echoing back what was typed verbatim would show it twice.
    return {
      step: "request",
      username: normalizeTelegramUsername(raw),
      errorKey: parsed.errorKey,
      attempt: 0,
    };
  }
  if (!configured()) {
    return {
      step: "request",
      username: parsed.username,
      errorKey: "signIn.telegram.unconfigured",
      attempt: 0,
    };
  }

  if (!(await withinRequestLimit(await clientIp()))) {
    return {
      step: "request",
      username: parsed.username,
      errorKey: "signIn.telegram.rateLimited",
      attempt: 0,
    };
  }

  const chat = await reachableChatFor(parsed.username);
  if (chat) await issueLoginCode(chat.telegramUserId, chat.chatId, await clientIp());

  return {
    step: "verify",
    username: parsed.username,
    noticeKey: "signIn.telegram.sent",
    attempt: 0,
  };
}

/**
 * Step two: check the code, then become somebody.
 *
 * The identity write happens here and only here — a code that was never typed
 * back must not create a profile, or the bot becomes a way to fill the table
 * with accounts nobody asked for.
 */
async function verifyStep(previous: LoginState, formData: FormData): Promise<LoginState> {
  /** Same step, empty boxes, caret back in the first one. */
  const retry = (errorKey: string): LoginState => ({
    ...previous,
    noticeKey: undefined,
    errorKey,
    attempt: previous.attempt + 1,
  });

  const code = normalizeCode(String(formData.get("code") ?? ""));
  if (code.length !== CODE_LENGTH) return retry("signIn.telegram.badCode");
  if (!configured()) return retry("signIn.telegram.unconfigured");

  const chat = await reachableChatFor(previous.username);
  // No chat means no code was ever issued. Same message as a wrong code, for
  // the same reason step one gives the same message to everyone.
  if (!chat) return retry("signIn.telegram.wrongCode");

  const result = await verifyLoginCode(chat.telegramUserId, code);
  if (result === "too-many-attempts") {
    return {
      step: "request",
      username: previous.username,
      errorKey: "signIn.telegram.tooMany",
      attempt: 0,
    };
  }
  if (result === "invalid") return retry("signIn.telegram.wrongCode");

  // Signed in already? Then this is somebody adding their second method, and
  // the Telegram account joins the profile they are already using rather than
  // starting a new one.
  const existing = await getViewer();

  const linked = await linkTelegramIdentity(
    {
      telegramUserId: chat.telegramUserId,
      username: chat.username,
      firstName: chat.firstName,
      lastName: chat.lastName,
    },
    existing?.profileId ?? null,
  );

  if (!linked.ok) {
    return {
      step: "request",
      username: previous.username,
      errorKey: linked.errorKey,
      attempt: 0,
    };
  }

  await startTelegramSession({
    profileId: linked.profileId,
    telegramUserId: chat.telegramUserId,
  });
  if (existing?.locale) await syncLocaleCookie(existing.locale);

  // Throws by design; nothing below it runs.
  redirect(safeNext(formData.get("next")?.toString()));
}

/** Every piece this flow needs, checked together so the form can say so once. */
function configured(): boolean {
  return isDbConfigured() && isBotConfigured() && isSessionSecretConfigured();
}

async function clientIp(): Promise<string> {
  const list = await headers();
  const forwarded = list.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || list.get("x-real-ip") || "unknown";
}
