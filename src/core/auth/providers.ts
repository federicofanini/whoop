/**
 * Which ways in are open right now.
 *
 * Two methods exist in this codebase and both are meant to stay. They answer
 * different questions and neither answers the other's:
 *
 *   - **Google** proves an account nobody else can open, and carries a verified
 *     email address the app can write to.
 *   - **Telegram** proves a person who can be *reached* — a live channel for a
 *     code, and later for the notifications a health dashboard actually wants
 *     to push.
 *
 * The intended end state is a profile that has proved both, at which point the
 * pair identifies a member far more tightly than either alone. Until then only
 * Telegram is open, so this file is the single switch rather than a condition
 * scattered across the sign-in page, the settings panel and the callback.
 */

/**
 * Google sign-in is written, wired and left in place — the OAuth callback still
 * works end to end — but the button is closed while the Google Cloud project
 * and the Supabase provider are being set up. Flip this to open it.
 */
// Annotated as `boolean` rather than left to infer `false`: without it every
// branch behind the flag narrows to dead code, and the Google path stops being
// type-checked the moment it stops being reachable.
export const GOOGLE_SIGN_IN_ENABLED: boolean = false;
