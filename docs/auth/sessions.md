# Sessions

Two methods, two session mechanisms, one resolver.

| Cookie | Owner | Lifetime | Set by |
| --- | --- | --- | --- |
| `sb-*` (several) | Supabase Auth | Supabase's own refresh cycle | `/auth/callback` |
| `strap_session` | This app | 30 days, fixed | The sign-in action, after a correct code |

There is no attempt to unify them. Supabase's cookies are Supabase's business —
including refresh, rotation and revocation — and reimplementing that to make the
two look alike would mean owning a token lifecycle for no gain.

## `getViewer()`

`src/server/auth.ts` is the single place identity is resolved, and it is
`cache()`d, so it runs once per request no matter how many components ask.

```
getViewer()
  ├── viewerFromSupabase()   Supabase getUser() → profiles
  └── viewerFromTelegram()   strap_session      → profiles
```

Supabase is checked first, because a Google session is the stronger claim and
because it is what the app did before Telegram existed. A member who has linked
both and holds both cookies is one profile either way — the two lookups converge
on the same row.

It returns:

```ts
interface Viewer {
  profileId: string;
  handle: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  locale: "en" | "it";
  whoopUserId: number | null;
  telegramUsername: string | null;
  identity: { google: boolean; telegram: boolean };  // what has ever been proved
  signedInWith: "google" | "telegram";               // what opened this session
}
```

`identity` and `signedInWith` are deliberately separate. The first is a
property of the profile and is what a future "both required" gate will read;
the second is a property of this request.

A database error inside `getViewer` is logged and returns null rather than
throwing. Every page streams, so throwing would replace half-rendered markup
with an error screen — and reporting nobody signed in degrades the app to its
demo state, which is what an unreachable database already gives every other read.

## The Telegram token

`src/core/auth/token.ts`. A JSON payload and an HMAC over it, both base64url,
joined by a dot:

```
base64url({"profileId":"…","telegramUserId":123,"expiresAt":1234567890}).base64url(hmac_sha256)
```

That is a JWT in everything but the header — and the header is the part worth
dropping. `alg` *inside* the token is what makes `alg: none` and algorithm
confusion possible at all. Here there is exactly one algorithm, chosen in this
file, and a token claiming otherwise is simply a token whose signature fails.

It also means no dependency: the reference implementation used `jose`, and this
repo now needs nothing it did not already have.

`verifySession` returns `null` for every kind of wrong — tampered, expired,
signed with a retired secret, not ours, or arriving at a deployment whose
`SESSION_SECRET` is unset. One null rather than a set of reasons, because every
one of them means the same thing to the caller.

The expiry is inside the signed payload as well as on the cookie. A cookie
`maxAge` is a request from the server that the browser is free to ignore; the
`expiresAt` claim is not.

### Cookie flags

```ts
httpOnly: true                                   // no script ever needs to read it
secure:   process.env.NODE_ENV === "production"  // plaintext only on localhost
sameSite: "lax"                                  // see below
path:     "/"
maxAge:   30 days
```

`lax`, not `strict`: the sign-in redirect is a top-level navigation, and strict
would drop the cookie on exactly the request that follows sign-in.

### Rotating `SESSION_SECRET`

Changing it invalidates every Telegram session immediately — everyone signs in
again. There is no key list and no grace period, which is the right trade for a
30-day cookie that costs six digits to replace.

## Sign-out

`POST /auth/sign-out` clears **both** sessions, not just the one in use. A
member with both linked holds two cookies, and clearing one would leave them
signed in through the other — which is not what anybody pressing Sign out means.

POST only, so a prefetch or a crawler can never sign anyone out.

Signing out leaves the WHOOP connection and its tokens in place. Coming back is
a round trip through one of the two methods, not another backfill.

## No middleware

There is no `middleware.ts`, and this feature did not add one. Pages gate
themselves by calling `getViewer()`, and most of them do not gate at all — the
dashboard renders demo data when nobody is signed in, which is a feature rather
than a hole.

`core/auth/token.ts` is deliberately free of `next/headers` and of anything
database-shaped, so it can run in a middleware if one is ever added. The
Supabase half would need `@supabase/ssr`'s middleware client, which is why
adding one is a decision rather than a formality.
