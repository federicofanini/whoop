/**
 * The state of the sign-in form, shared between the Server Action and the client.
 *
 * In its own module because a `"use server"` file may only export async
 * functions — a constant or a type declared there fails the build.
 *
 * Messages travel as dictionary keys rather than sentences, like every other
 * action in this app: the server does not know which language the member reads.
 */
export interface LoginState {
  step: "request" | "verify";
  /** Kept across the two steps so the verify screen can name who was messaged. */
  username: string;
  noticeKey?: string;
  errorKey?: string;
}

export const initialLoginState: LoginState = { step: "request", username: "" };

/**
 * Where to land after signing in.
 *
 * The value arrives in the query string, so it is chosen by whoever built the
 * link. Only same-origin paths are accepted: `?next=https://elsewhere` would
 * make the sign-in form an open redirect, and `//elsewhere` is the same trick
 * spelled protocol-relative.
 */
export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("..")) {
    return "/";
  }
  return value;
}
