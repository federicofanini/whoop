/**
 * English source dictionary.
 *
 * This file is the contract: `it.ts` is typed against it, so a missing Italian
 * string is a compile error rather than an English word appearing mid-sentence
 * in production.
 *
 * Placeholders are `{name}`. Anything numeric stays a number until render time,
 * because 1.234 and 1,234 are the same quantity in different languages.
 */
export const en = {
  app: {
    name: "Strap",
    tagline: "Recovery, strain and sleep from your WHOOP data.",
  },

  nav: {
    overview: "Overview",
    recovery: "Recovery",
    strain: "Strain",
    sleep: "Sleep",
    friends: "Friends",
    live: "Live",
    settings: "Settings",
    signIn: "Sign in",
    signOut: "Sign out",
    demoBadge: "Demo data",
    demoTitle: "No WHOOP account linked — showing a generated dataset.",
    pendingRequests: "{count} pending friend request",
    pendingRequests_plural: "{count} pending friend requests",
    theme: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System",
    language: "Language",
  },

  common: {
    none: "—",
    ms: "ms",
    bpm: "bpm",
    rpm: "rpm",
    percent: "%",
    times: "×",
    detail: "Detail →",
    back: "← Back",
    loading: "Loading…",
  },

  signIn: {
    title: "Sign in",
    lead: "Strap uses your Google account to know who you are, and your WHOOP account to know how you slept. They are separate on purpose — you can sign in and be invited by family before ever linking a strap.",
    google: "Continue with Google",
    error: "Sign-in failed: {message}",
    unconfigured:
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then enable the Google provider in your Supabase project.",
  },

  overview: {
    greeting: "Morning, {name}",
    today: "Today",
    recovery: "Recovery",
    liveSession: "Live session →",
    meaning: "What today's numbers mean",
    meaningSub: "Ranked by how far each one sits from your own baseline.",
    everything: "Everything worth flagging",
    everythingSub: "The full set, across all three domains.",
    dayStrain: "Day strain",
    loadRatio: "Load ratio",
    sleepLastNight: "Sleep last night",
    sleepDebt: "Sleep debt",
    supports: "Recovery supports {low}–{high} today",
    loadProductive: "Acute load matched to your base",
    loadOver: "Acute load running ahead of your base",
    loadUnder: "Acute load below your base",
    ofNeed: "{percent}% of what you needed",
    debtCaption: "Accumulated shortfall over 7 nights",
    recovery30: "Recovery, last 30 days",
    recovery30Sub: "Bars are coloured by band; the score is always on the tooltip.",
    strain30: "Strain, last 30 days",
    strain30Sub: "{over} of the last {total} days ran ahead of recovery.",
    last14: "Last 14 days",
    hrv: "HRV",
    restingHr: "Resting HR",
    respRate: "Resp. rate",
    demoTitle: "Demo data.",
    demoBody:
      "No WHOOP account is linked yet, so this is a generated dataset — realistic, deterministic, and built to exercise every insight including a seeded illness episode.",
    demoLink: "Connect your WHOOP",
    demoAfter: "to replace it.",
    nothingFlagged: "Nothing stands out today — your numbers are sitting inside their usual range.",
  },

  band: {
    primed: "Primed",
    adequate: "Adequate",
    compromised: "Compromised",
  },

  tone: {
    positive: "Good",
    neutral: "Note",
    caution: "Watch",
    alert: "Alert",
  },

  friends: {
    title: "Shared with family",
    eyebrow: "Friends",
    lead: "Sharing is mutual and symmetric: when a request is approved, each of you sees the other's recovery, strain and sleep. Either side can end it at any time.",
    invite: "Invite someone",
    inviteSub:
      "WHOOP has no public directory, so people are found by the handle this app gives them — ask them for theirs.",
    invitePlaceholder: "brother.handle",
    theirHandle: "Their handle",
    send: "Send request",
    sending: "Sending…",
    willSendTo: "Will be sent to @{handle}",
    yourHandle: "Your handle",
    yourHandleSub:
      "This is what you give out. Changing it does not disturb anyone you already share with.",
    rename: "Rename",
    waitingOnYou: "{count} waiting on you",
    waitingOnYouSub:
      "Approving lets them see your recovery, strain and sleep — and lets you see theirs.",
    sharingWith: "Sharing with you",
    nobodyYet: "Nobody yet. Send an invite above, or give out your handle and let them start it.",
    wantsToShare: "wants to share data with you",
    approve: "Approve",
    decline: "Decline",
    withdraw: "Withdraw",
    waitingApproval: "Waiting for approval",
    sentNotApproved: "Sent, not yet approved",
    stopSharing: "Stop sharing",
    fullDetail: "Full detail →",
    allFriends: "← All friends",
    sharingWithYou: "sharing with you",
    notSynced: "Nothing synced yet — {name} has linked WHOOP but has not run a backfill.",
    noHistory:
      "{name} has approved sharing but has no synced history yet. Their data appears here once they run a backfill.",
    sideBySide: "This week, side by side",
    sideBySideSub: "Seven-day averages. Both sides are each person's own recent history.",
    sideBySideDemo: "Seven-day averages. Your side is demo data until you connect WHOOP.",
    metric: "Metric",
    you: "You",
    diff: "Diff",
    recoveryToday: "Recovery today",
    hrvBaseline: "HRV baseline",
    rhrBaseline: "RHR baseline",
    thirtyDayMean: "30-day mean",
    shortfall: "Shortfall over 7 nights",
    signedOutTitle: "Share with family",
    signedOutLead:
      "Invite someone by handle. Once they approve, each of you sees the other's recovery, strain and sleep.",
    signedOutConnect: "Sign in to get a handle and start sharing.",
    signedOutDb:
      "Friends need a database to live in — set DATABASE_URL, then sign in.",
    openSettings: "Open settings",
    sent: "Request sent to @{handle}.",
    renamed: "You are @{handle}.",
    reverseAccepted: "@{handle} had already invited you — you are now sharing.",
    error: {
      tooShort: "Handles are at least 3 characters.",
      charset: "Handles start with a letter and use letters, numbers, . or _",
      self: "That is your own handle.",
      already: "You and @{handle} are already sharing.",
      pending: "Already waiting on @{handle} to approve.",
      taken: "@{handle} is taken.",
      noDatabase: "No database configured — friends need one to live in.",
      signedOut: "Sign in first.",
    },
  },

  settings: {
    eyebrow: "Settings",
    title: "Connections",
    lead: "Three independent pieces: Google says who you are, the WHOOP API supplies everything historical, and a Bluetooth broadcast carries live heart rate. Each works without the others.",
    identity: "Your identity here",
    identitySub: "Google signs you in; WHOOP supplies the data. Unlinking one leaves the other.",
    signedInAs: "Signed in as {email}",
    handOut: "Give this handle to family so they can send you a request.",
    manageSharing: "Manage sharing",
    notSignedIn: "Not signed in.",
    whoopAccount: "WHOOP account",
    whoopAccountSub: "OAuth 2.0 with the offline scope, so the link survives past the first hour.",
    connect: "Connect WHOOP",
    reconnect: "Reconnect WHOOP",
    connected: "WHOOP account linked. Run a backfill below to pull your history: it walks 25 records a page, so a few years takes a few minutes.",
    connectFailed: "Connection failed: {message}",
    reqDatabase: "DATABASE_URL configured",
    reqDatabaseBody: "Postgres holds your synced history. Without it the dashboard runs on demo data.",
    reqWhoop: "WHOOP OAuth credentials configured",
    reqWhoopBody:
      "Create an app at developer-dashboard.whoop.com and set the client id, secret and redirect URI.",
    reqSupabase: "Supabase configured",
    reqSupabaseBody: "Supabase Auth provides Google sign-in and carries the live heart-rate stream.",
    reqLinked: "Account linked",
    reqLinkedBody: "{count} cycles held locally.",
    reqNotLinked: "Not linked yet — the dashboard is showing generated data.",
    envHint:
      "Copy .env.example to .env.local and fill in the values, then restart the dev server.",
    freshness: "Keeping data fresh",
    freshnessSub: "Three mechanisms, deliberately overlapping.",
    webhooks: "Webhooks",
    webhooksBody:
      "WHOOP posts to /api/whoop/webhook when a record is scored, rescored or deleted. Signature-verified, and the fastest path.",
    reconcile: "Nightly reconcile",
    reconcileBody:
      "A cron job re-pulls the last week every morning for every linked account, so a webhook missed during a deploy costs a day of freshness rather than leaving a permanent hole.",
    manual: "Manual sync",
    manualBody:
      "Backfill walks your whole history; incremental picks up from the newest record held. Both respect the 100 requests/minute limit.",
    cli: "Without the UI",
    cliBody:
      "Every one of these runs from the command line too: npm run whoop -- status, backfill, sync and export all drive the same core the dashboard uses.",
  },

  live: {
    title: "Live heart rate",
    sub: "Independent of the API — this path is pure Bluetooth.",
  },

  insight: {
    hrvSuppressed: {
      title: "HRV is {sd} SD below your baseline",
      detail:
        "{latest}ms against a 30-day baseline of {baseline}ms ({delta}ms). A single suppressed morning is noise; two or three in a row usually means accumulated load, a short night, alcohol, or something incubating.",
    },
    hrvElevated: {
      title: "HRV is running {delta}ms above baseline",
      detail:
        "{latest}ms against {baseline}ms. Your parasympathetic system has capacity — this is the profile of a day that can absorb real intensity.",
    },
    hrvTrendUp: {
      title: "HRV has been climbing for two weeks",
      detail:
        "About {perWeek}ms per week over the last 14 days. That is the signature of adaptation catching up with your training.",
    },
    hrvTrendDown: {
      title: "HRV has been drifting down for two weeks",
      detail:
        "About {perWeek}ms per week over the last 14 days. Sustained decline over this long is worth taking seriously — check sleep debt and load before adding intensity.",
    },
    rhrElevated: {
      title: "Resting heart rate is elevated by {delta} bpm",
      detail:
        "{latest} bpm against a baseline of {baseline}. Elevated RHR alongside suppressed HRV is the classic pre-illness or under-recovered pattern.",
    },
    illnessSignal: {
      title: "Skin temperature and respiratory rate are both elevated",
      detail:
        "Respiratory rate {respiratoryRate} rpm and skin temperature {skinTemp}°C are each more than 1.5 SD above baseline. Both moving together is the combination WHOOP flags for possible illness onset.",
    },
    greenStreak: {
      title: "{days} green days in a row",
      detail:
        "A run this long means you are genuinely under-loaded relative to capacity. This is when to schedule the hard block, not when to keep coasting.",
    },
    loadSpike: {
      title: "Acute load is {ratio}× your chronic base",
      detail:
        "This week is running well ahead of the last four. Ratios above 1.5 are where the injury and illness curves start bending upward — the fix is a couple of genuinely easy days, not a rest week.",
    },
    loadDecay: {
      title: "Acute load has dropped to {ratio}× your base",
      detail:
        "Fitness built over the last month is starting to decay. A single hard session will not reverse it — consistency will.",
    },
    loadProductive: {
      title: "Training load is in the productive band ({ratio}×)",
      detail:
        "Acute {acute} against chronic {chronic}. You are adding stimulus at a rate your base can absorb.",
    },
    balanceOver: {
      title: "You have outrun your recovery on {over} of the last {total} days",
      detail:
        "Average of {mean} strain above what each day's recovery supported. Occasional overreach is how adaptation happens; a month of it is how you end up flat.",
    },
    balanceUnder: {
      title: "You have left capacity unused on {under} of the last {total} days",
      detail:
        "Average of {mean} strain below what your recovery supported. Your body has been offering more than you have asked of it.",
    },
    todayTarget: {
      title: "Today's strain target is {target}",
      detail:
        "On {recovery}% recovery, a session landing between {low} and {high} strain adds stimulus without digging a hole.",
      detailWithStrain:
        "On {recovery}% recovery, a session landing between {low} and {high} strain adds stimulus without digging a hole. You are at {strain} so far.",
    },
    sleepDebt: {
      title: "{debt} of sleep debt over the last week",
      detail:
        "You have averaged {asleep} asleep against a need of {need}. Debt is repaid at roughly an extra hour a night — a single long weekend lie-in does not clear it.",
    },
    sleepConsistency: {
      title: "Your bedtime swings by ±{minutes} minutes",
      detail:
        "Consistency is the single most controllable input to sleep quality. Holding bedtime inside a 30-minute window typically buys more recovery than adding total time.",
    },
    sleepRegular: {
      title: "Bedtime is holding to ±{minutes} minutes",
      detail: "That is genuinely regular, and it is doing quiet work for your recovery scores.",
    },
    restorativeLow: {
      title: "Only {share}% of your sleep is REM or deep",
      detail:
        "Typical is 40-50%. Time in bed is not the constraint here — quality is. Alcohol, late meals and a warm room all suppress exactly these two stages.",
    },
    sleepRecoveryLink: {
      title: "Sleep performance explains {variance}% of your recovery variance",
      detail:
        "Correlation of {r} across {nights} nights. A real but partial link: sleep matters, and so does load management.",
      detailStrong:
        "Correlation of {r} across {nights} nights. Sleep is your dominant recovery lever — for you, more than it is for most people.",
    },
  },
} as const;

/**
 * The shape of a dictionary, with every leaf widened back to `string`.
 *
 * `en` is `as const` so its keys are exact, but that also makes every value a
 * literal type — and "Overview" is not assignable to "Panoramica". Widening the
 * leaves keeps the key checking, which is the part that matters, while letting
 * a translation actually differ from the source.
 */
type Translated<T> = {
  [K in keyof T]: T[K] extends string ? string : Translated<T[K]>;
};

export type Dictionary = Translated<typeof en>;
