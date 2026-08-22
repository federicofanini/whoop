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
    lead: "Strap keeps who you are separate from how you slept: signing in gets you a profile and a handle, linking WHOOP gets you data. You can be invited by family before ever putting on a strap.",
    error: "Sign-in failed: {message}",
    telegram: {
      title: "Telegram",
      sub: "Strap Bot sends you a six-digit code. No password to forget, and the same chat later carries anything worth telling you about.",
      username: "Your Telegram username",
      code: "Code from Strap Bot",
      send: "Send me a code",
      verify: "Sign in",
      resend: "Start over",
      working: "One moment…",
      sent: "If that username is registered, a code is on its way. It expires in five minutes.",
      badUsername: "That is not a Telegram username — 5 to 32 letters, digits or underscores, starting with a letter.",
      badCode: "The code is six digits.",
      wrongCode: "That code is wrong or has expired. Start over to get a fresh one.",
      tooMany: "Too many wrong codes. Ask for a new one.",
      rateLimited: "Too many sign-in attempts from here. Try again in an hour.",
      otherProfile:
        "That Telegram account already belongs to a different Strap profile. Sign out first, or ask for the two to be merged.",
      unconfigured:
        "Telegram sign-in is not set up on this deployment. Set TELEGRAM_BOT_TOKEN, SESSION_SECRET and DATABASE_URL, then restart.",
      step: {
        one: "Open the bot and press Start:",
        two: "Come back here and type the username you use on Telegram.",
        three: "Enter the code it sends you. That is the whole thing.",
      },
    },
    google: {
      title: "Google",
      sub: "A verified email address, and an account nobody else can open.",
      button: "Continue with Google",
      soon: "Not open yet. It is coming, and it is meant to sit alongside Telegram rather than replace it — one proves an address, the other proves someone we can reach.",
    },
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
    identitySub: "Sign-in says who you are; WHOOP supplies the data. Unlinking one leaves the other.",
    methodTelegram: "Telegram linked",
    methodTelegramOn: "Signing in and any future alerts go through @{username}.",
    methodTelegramOff: "Not linked. Without it there is no channel to reach you on.",
    methodGoogle: "Google linked",
    methodGoogleOn: "A verified email address is on file for this profile.",
    methodGoogleOff: "Not linked yet — Google sign-in is still closed.",
    methodBoth:
      "The plan is both: an address that is verified and a person who can be reached. Either one alone gets you in today.",
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
    keys: {
      title: "Your WHOOP developer app",
      sub: "A WHOOP app in development can have {limit} users. That is a platform limit, so this app shares its slots — and anyone past them brings their own app.",
      slots: "Shared slots left",
      slotsFree: "{remaining} still free. Connecting now takes one; you can switch to your own app later and give it back.",
      slotsGone: "All slots are taken. To connect WHOOP you need your own developer app — it takes about two minutes to create.",
      usingOwn: "You are on your own app, so you are not using a shared slot.",
      stored: "Client ID on file",
      remove: "Remove keys",
      clientId: "Client ID",
      clientSecret: "Client secret",
      save: "Save keys",
      saving: "Saving…",
      saved: "Saved. Connect WHOOP to finish.",
      missing: "Both the client ID and the secret are required.",
      tooShort: "That does not look like a WHOOP client ID and secret pair.",
      noEncryption: "CREDENTIALS_SECRET is not set, so secrets cannot be stored safely. Set it and restart.",
      signedOut: "Sign in first.",
      step: {
        one: "Create an app at developer-dashboard.whoop.com — any name will do.",
        two: "Set its redirect URI to exactly the value this deployment uses, shown below.",
        three: "Copy the client ID and secret here. They are encrypted before being stored, and only ever used to talk to WHOOP as you.",
      },
    },
    error: {
      needs_own_keys: "The shared WHOOP app is full. Add your own developer keys below to connect.",
      not_configured: "This deployment has no shared WHOOP app configured. Add your own developer keys below.",
      no_encryption_key: "Your keys are stored but cannot be decrypted — CREDENTIALS_SECRET is missing or changed.",
      credentials_changed: "Your credentials changed mid-handshake. Start the connection again.",
      state_mismatch: "The sign-in attempt could not be verified. Try again.",
    },
    cli: "Without the UI",
    cliBody:
      "Every one of these runs from the command line too: npm run whoop -- status, backfill, sync and export all drive the same core the dashboard uses.",
  },

  chart: {
    recovery: "Recovery",
    strain: "Strain",
    supported: "Supported",
    supportedRange: "Supported strain range",
    deviation: "Deviation",
    primedBand: "Primed (67%+)",
    adequateBand: "Adequate (34-66%)",
    compromisedBand: "Compromised (<34%)",
    eachDot: "Each dot is one day",
    aboveSupported: "Above supported strain",
    belowSupported: "Below supported strain",
    fadedInRange: "Faded bars sit inside the supported range",
    fadedNoSession: "Faded bars are days with no session",
    acute: "Acute (7d)",
    chronic: "Chronic (28d)",
    acuteLoad: "Acute load (7-day)",
    chronicLoad: "Chronic load (28-day)",
    baseline30: "30-day baseline",
    normalRange: "±1 SD normal range",
  },

  live: {
    title: "Live heart rate",
    sub: "Independent of the API — this path is pure Bluetooth.",
    heartRate: "Live heart rate",
    session: "Session",
    sessionSub: "Accumulated since the first reading arrived.",
    avg: "Avg",
    peak: "Peak",
    low: "Low",
    elapsed: "Elapsed",
    estStrain: "Est. strain",
    liveHrv: "Live HRV",
    sdnn: "SDNN",
    timeInZone: "Time in zone",
    broadcast: "Heart rate broadcast",
    broadcastSub:
      "Turn on Heart Rate Broadcast in the WHOOP app, then connect. Readings stream to every open dashboard.",
  },

  recoveryPage: {
    title: "HRV and resting heart rate, against your own baseline",
    lead: "Population HRV norms span an order of magnitude, so they tell you nothing. What matters is where today sits inside your own distribution — which is what the shaded band shows.",
    vsBaseline: "vs baseline",
    greenDays: "Green days",
    greenCaption: "Recovery at or above 67%",
    redDays: "Red days",
    redCaption: "Recovery below 34%",
    outOf30: "/ 30",
    signals: "Recovery signals",
    signalsSub: "Only what departs from your normal range.",
    hrvTitle: "Heart rate variability",
    hrvSub: "90 days. The band is ±1 standard deviation around a trailing 30-day mean — inside it is noise, outside it is signal.",
    rhrTitle: "Resting heart rate",
    rhrSub: "Rising RHR alongside falling HRV is the pattern worth acting on — either alone is usually noise.",
    dailyTitle: "Daily recovery score",
    dailySub: "Last 60 days.",
  },

  strainPage: {
    title: "Is your training matched to what your body is offering?",
    lead: "Strain and recovery are on different scales, so they are never plotted on one pair of axes here — a dual-axis version of this chart invents a relationship. Instead: one measure per axis, and a deviation series that has a real zero.",
    today: "Today's strain",
    supportedRange: "Supported range {low}–{high}",
    acuteChronic: "Acute : chronic",
    thisWeek: "This week",
    vsLastWeek: "vs last week",
    weekCaption: "Total strain across 7 days",
    daysOver: "Days over recovery",
    meanDeviation: "Mean deviation {value} strain",
    signals: "Load signals",
    signalsSub: "Where your training is running relative to your capacity.",
    scatterTitle: "Strain against recovery",
    scatterSub: "Every dot is a day. The shaded diagonal is the strain each recovery level supports — dots above it are days you outran your recovery.",
    deviationTitle: "Daily deviation",
    deviationSub: "Strain minus what that day's recovery supported. One measure, so one axis, with a real zero.",
    loadTitle: "Acute and chronic load",
    loadSub: "Both are exponentially weighted strain in the same units, so they legitimately share an axis. Their ratio is the number that matters: 0.80–1.30 is the productive band.",
    dailyTitle: "Daily strain",
    dailySub: "Last 60 days.",
    zoneProductive: "Adding stimulus at a rate your base absorbs",
    zoneOverreaching: "Acute load has spiked ahead of your base",
    zoneDetraining: "Acute load has fallen below your base",
  },

  sleepPage: {
    title: "Debt, architecture, and what actually moves your recovery",
    lead: "Total time in bed is the least interesting number here. What predicts recovery is the restorative fraction, the regularity of your schedule, and whether you are clearing the need your body has already accumulated.",
    debtCaption: "Shortfall accumulated over 7 nights",
    avgAsleep: "Average asleep",
    againstNeed: "Against a need of {need}",
    restorative: "Restorative share",
    restorativeCaption: "REM plus deep, as a share of total sleep. Typical is 40–50%.",
    spread: "Bedtime spread",
    spreadCaption: "Under ±30 minutes is the target",
    signals: "Sleep signals",
    signalsSub: "Where your nights are helping or costing you.",
    architecture: "Sleep architecture",
    architectureSub: "Stages stack deepest-first and share one hue — depth reads as darkness. The stepped line is what WHOOP calculated you needed that night.",
    shortfall: "Nightly shortfall",
    shortfallSub: "How far each night fell short of its need. Debt compounds — it is not cleared by one long lie-in.",
    regularity: "Schedule regularity",
    regularitySub: "Consistency is the most controllable input to sleep quality, and usually buys more than extra time in bed.",
    correlation: "Does sleep actually drive your recovery?",
    genuinelyRegular: "Genuinely regular",
    deep: "Deep",
    rem: "REM",
    light: "Light",
    awake: "Awake",
    needed: "Needed",
    shortOfNeed: "{amount} short of need · {performance}% performance",
    none: "None",
    needMet: "Need met · {performance}% performance",
    time: "Time",
    correlationDetail: "Correlation of {r} across {nights} nights — sleep performance explains about {variance}% of the variation in your recovery score.",
    correlationThin: "Needs a couple more weeks of nights before the relationship means anything.",
  },

  livePage: {
    title: "Real-time heart rate",
    lead: "The WHOOP API has no continuous heart-rate endpoint, so this comes over Bluetooth instead — the standard Heart Rate Service the strap exposes when you turn on Heart Rate Broadcast. A Mac holds the connection; every dashboard subscribes.",
    noBroadcast: "No broadcast yet",
    beatsRelayed: "Beats relayed",
    transport: "Transport",
    noBluetooth: "This browser cannot talk to Bluetooth.",
    onMac: "On your Mac —",
    onIphone: "On your iPhone —",
    streamingFrom: "Streaming from {device}",
    zonesSub: "Zones are shares of your {maxHr} bpm maximum. Higher zones cost disproportionately more strain.",
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
