# Google OAuth — currently closed

Google sign-in is written, wired, and switched off. The OAuth callback still
works end to end; the button on `/sign-in` is rendered inert with a note saying
it is coming.

## The switch

```ts
// src/core/auth/providers.ts
export const GOOGLE_SIGN_IN_ENABLED: boolean = false;
```

One flag rather than a condition scattered across the sign-in page, the settings
panel and the callback. It is annotated `: boolean` on purpose — without the
annotation TypeScript infers the literal `false`, every branch behind it narrows
to dead code, and the Google path stops being type-checked the moment it stops
being reachable.

## Why the button is still there

Hiding it would be easier and worse. The plan is a profile that has proved
[both methods](./identity-model.md), so a member signing in over Telegram today
should already be able to see what the second half will be, rather than meeting
it as a surprise later.

`GoogleButton` takes a `comingSoon` prop and renders the same button, disabled,
with `aria-disabled` and a `cursor-not-allowed`. Opening it later is a flag, not
a layout change.

## What still runs

| Path | State |
| --- | --- |
| `src/app/auth/callback/route.ts` | Live. Unchanged except that it now stamps `google_linked_at` |
| `provisionViewer()` in `src/server/auth.ts` | Live. Creates or refreshes the profile from Google's fields |
| `viewerFromSupabase()` | Live. Any existing Supabase session still resolves to a viewer |
| Supabase client helpers | Live, and also used by the live heart-rate transport |

Nothing was deleted or stubbed. A deployment that already had Google sessions
keeps them working through the switch.

## Opening it

1. **Google Cloud console** → *APIs & Services* → *Credentials* → create an
   OAuth 2.0 client ID (Web application). Supabase shows the exact callback URL
   to register on the Google side.
2. **Supabase** → *Authentication* → *Providers* → *Google*: enable, paste the
   client ID and secret.
3. **Supabase** → *Authentication* → *URL Configuration*: add
   `<your-origin>/auth/callback` to the redirect allow-list, for both localhost
   and production.
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Flip `GOOGLE_SIGN_IN_ENABLED` to `true`.

If the flag is on but Supabase is not configured, the panel says so
(`signIn.unconfigured`) instead of offering a button that cannot work.

## Then what

Once both methods are open, the remaining work for the "both required" end state
is small and localised:

- **Linking already works in one direction.** Sign in with Google, then verify a
  Telegram code, and `linkTelegramIdentity` attaches it to the profile you are
  already using.
- **The other direction does not exist.** A Telegram-only member has no way to
  add Google, because `/auth/callback` always resolves to the Supabase user's
  own id — it would need to notice an existing `strap_session` and merge onto
  that profile instead. That is the one piece of new logic required.
- **The gate itself** reads `viewer.identity.google && viewer.identity.telegram`.
  `getViewer()` already returns both flags, so nothing above it changes.
- **Merging two profiles** — someone who signed up twice, once each way — is not
  handled and should be a deliberate, manual operation. Friendships, handles and
  a WHOOP connection all hang off `profiles.id`.
