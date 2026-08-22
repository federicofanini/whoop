import type { Dictionary } from "./en";

/**
 * Italian dictionary.
 *
 * Typed as `Dictionary`, so anything missing or misspelled fails the build
 * rather than falling back to English at runtime.
 *
 * Translated rather than transliterated: WHOOP's own Italian app keeps the
 * English metric names (Recovery, Strain, HRV) because that is what members
 * actually say, so those stay — but every sentence around them is written as
 * Italian, not as English with Italian words.
 */
export const it: Dictionary = {
  app: {
    name: "Strap",
    tagline: "Recovery, strain e sonno dai tuoi dati WHOOP.",
  },

  nav: {
    overview: "Panoramica",
    recovery: "Recovery",
    strain: "Strain",
    sleep: "Sonno",
    friends: "Amici",
    live: "Live",
    settings: "Impostazioni",
    signIn: "Accedi",
    signOut: "Esci",
    demoBadge: "Dati demo",
    demoTitle: "Nessun account WHOOP collegato — stai vedendo dati generati.",
    pendingRequests: "{count} richiesta di amicizia in sospeso",
    pendingRequests_plural: "{count} richieste di amicizia in sospeso",
    theme: "Tema",
    themeLight: "Chiaro",
    themeDark: "Scuro",
    themeSystem: "Sistema",
    language: "Lingua",
  },

  common: {
    none: "—",
    ms: "ms",
    bpm: "bpm",
    rpm: "rpm",
    percent: "%",
    times: "×",
    detail: "Dettaglio →",
    back: "← Indietro",
    loading: "Caricamento…",
  },

  signIn: {
    title: "Accedi",
    lead: "Strap usa il tuo account Google per sapere chi sei e il tuo account WHOOP per sapere come hai dormito. Sono separati di proposito: puoi accedere e ricevere inviti dalla famiglia anche prima di collegare una fascia.",
    google: "Continua con Google",
    error: "Accesso non riuscito: {message}",
    unconfigured:
      "Supabase non è configurato. Imposta NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY, poi abilita il provider Google nel progetto Supabase.",
  },

  overview: {
    greeting: "Buongiorno, {name}",
    today: "Oggi",
    recovery: "Recovery",
    liveSession: "Sessione live →",
    meaning: "Cosa dicono i numeri di oggi",
    meaningSub: "Ordinati per quanto ciascuno si discosta dalla tua baseline.",
    everything: "Tutto ciò che vale la pena segnalare",
    everythingSub: "L'elenco completo, sui tre ambiti.",
    dayStrain: "Strain giornaliero",
    loadRatio: "Rapporto di carico",
    sleepLastNight: "Sonno di stanotte",
    sleepDebt: "Debito di sonno",
    supports: "La recovery sostiene {low}–{high} oggi",
    loadProductive: "Carico acuto allineato alla tua base",
    loadOver: "Carico acuto più alto della tua base",
    loadUnder: "Carico acuto sotto la tua base",
    ofNeed: "{percent}% di quanto ti serviva",
    debtCaption: "Deficit accumulato in 7 notti",
    recovery30: "Recovery, ultimi 30 giorni",
    recovery30Sub: "Le barre sono colorate per fascia; il punteggio è sempre nel tooltip.",
    strain30: "Strain, ultimi 30 giorni",
    strain30Sub: "{over} degli ultimi {total} giorni sono andati oltre la recovery.",
    last14: "Ultimi 14 giorni",
    hrv: "HRV",
    restingHr: "FC a riposo",
    respRate: "Freq. respiratoria",
    demoTitle: "Dati demo.",
    demoBody:
      "Nessun account WHOOP è ancora collegato, quindi questi sono dati generati — realistici, deterministici e costruiti per mettere alla prova ogni insight, incluso un episodio di malattia simulato.",
    demoLink: "Collega il tuo WHOOP",
    demoAfter: "per sostituirli.",
    nothingFlagged:
      "Oggi non emerge nulla di particolare — i tuoi numeri sono nel loro intervallo abituale.",
  },

  band: {
    primed: "Pronto",
    adequate: "Sufficiente",
    compromised: "Compromessa",
  },

  tone: {
    positive: "Bene",
    neutral: "Nota",
    caution: "Attenzione",
    alert: "Allerta",
  },

  friends: {
    title: "Condiviso con la famiglia",
    eyebrow: "Amici",
    lead: "La condivisione è reciproca e simmetrica: quando una richiesta viene accettata, ciascuno vede recovery, strain e sonno dell'altro. Entrambi potete interromperla quando volete.",
    invite: "Invita qualcuno",
    inviteSub:
      "WHOOP non ha un elenco pubblico, quindi le persone si trovano con l'handle che questa app assegna loro — chiedi il suo.",
    invitePlaceholder: "handle.fratello",
    theirHandle: "Il suo handle",
    send: "Invia richiesta",
    sending: "Invio…",
    willSendTo: "Verrà inviata a @{handle}",
    yourHandle: "Il tuo handle",
    yourHandleSub:
      "È quello che dai agli altri. Cambiarlo non tocca le condivisioni già attive.",
    rename: "Rinomina",
    waitingOnYou: "{count} in attesa di risposta",
    waitingOnYouSub:
      "Accettando, l'altra persona vedrà la tua recovery, il tuo strain e il tuo sonno — e tu i suoi.",
    sharingWith: "Condividono con te",
    nobodyYet:
      "Ancora nessuno. Invia un invito qui sopra, oppure dai il tuo handle e lascia che sia l'altro a iniziare.",
    wantsToShare: "vuole condividere i dati con te",
    approve: "Accetta",
    decline: "Rifiuta",
    withdraw: "Ritira",
    waitingApproval: "In attesa di accettazione",
    sentNotApproved: "Inviate, non ancora accettate",
    stopSharing: "Interrompi condivisione",
    fullDetail: "Dettaglio completo →",
    allFriends: "← Tutti gli amici",
    sharingWithYou: "condivide con te",
    notSynced:
      "Ancora nessun dato sincronizzato — {name} ha collegato WHOOP ma non ha eseguito un backfill.",
    noHistory:
      "{name} ha accettato la condivisione ma non ha ancora uno storico sincronizzato. I dati compariranno qui dopo il primo backfill.",
    sideBySide: "Questa settimana, a confronto",
    sideBySideSub: "Medie su sette giorni. Ogni colonna è lo storico recente di quella persona.",
    sideBySideDemo:
      "Medie su sette giorni. La tua colonna mostra dati demo finché non colleghi WHOOP.",
    metric: "Metrica",
    you: "Tu",
    diff: "Diff.",
    recoveryToday: "Recovery di oggi",
    hrvBaseline: "Baseline HRV",
    rhrBaseline: "Baseline FC a riposo",
    thirtyDayMean: "Media su 30 giorni",
    shortfall: "Deficit su 7 notti",
    signedOutTitle: "Condividi con la famiglia",
    signedOutLead:
      "Invita qualcuno con il suo handle. Quando accetta, ciascuno vede recovery, strain e sonno dell'altro.",
    signedOutConnect: "Accedi per ottenere un handle e iniziare a condividere.",
    signedOutDb:
      "Gli amici hanno bisogno di un database — imposta DATABASE_URL, poi accedi.",
    openSettings: "Apri le impostazioni",
    sent: "Richiesta inviata a @{handle}.",
    renamed: "Ora sei @{handle}.",
    reverseAccepted: "@{handle} ti aveva già invitato — ora state condividendo.",
    error: {
      tooShort: "Gli handle sono di almeno 3 caratteri.",
      charset: "Gli handle iniziano con una lettera e usano lettere, numeri, . o _",
      self: "Questo è il tuo handle.",
      already: "Tu e @{handle} state già condividendo.",
      pending: "Stai già aspettando che @{handle} accetti.",
      taken: "@{handle} è già in uso.",
      noDatabase: "Nessun database configurato — serve per gestire gli amici.",
      signedOut: "Accedi prima di continuare.",
    },
  },

  settings: {
    eyebrow: "Impostazioni",
    title: "Collegamenti",
    lead: "Tre pezzi indipendenti: Google dice chi sei, l'API WHOOP fornisce tutto lo storico e un broadcast Bluetooth porta la frequenza cardiaca in tempo reale. Ognuno funziona senza gli altri.",
    identity: "La tua identità qui",
    identitySub:
      "Google ti fa accedere; WHOOP fornisce i dati. Scollegare l'uno non tocca l'altro.",
    signedInAs: "Hai effettuato l'accesso come {email}",
    handOut: "Dai questo handle alla famiglia per farti mandare una richiesta.",
    manageSharing: "Gestisci le condivisioni",
    notSignedIn: "Non hai effettuato l'accesso.",
    whoopAccount: "Account WHOOP",
    whoopAccountSub:
      "OAuth 2.0 con scope offline, così il collegamento sopravvive oltre la prima ora.",
    connect: "Collega WHOOP",
    reconnect: "Ricollega WHOOP",
    connected:
      "Account WHOOP collegato. Esegui un backfill qui sotto per scaricare lo storico: procede 25 record per pagina, quindi qualche anno richiede qualche minuto.",
    connectFailed: "Collegamento non riuscito: {message}",
    reqDatabase: "DATABASE_URL configurato",
    reqDatabaseBody:
      "Postgres conserva lo storico sincronizzato. Senza, la dashboard funziona con dati demo.",
    reqWhoop: "Credenziali OAuth WHOOP configurate",
    reqWhoopBody:
      "Crea un'app su developer-dashboard.whoop.com e imposta client id, secret e redirect URI.",
    reqSupabase: "Supabase configurato",
    reqSupabaseBody:
      "Supabase Auth gestisce l'accesso con Google e trasporta il flusso live della frequenza cardiaca.",
    reqLinked: "Account collegato",
    reqLinkedBody: "{count} cicli conservati in locale.",
    reqNotLinked: "Non ancora collegato — la dashboard mostra dati generati.",
    envHint:
      "Copia .env.example in .env.local, compila i valori e riavvia il server di sviluppo.",
    freshness: "Mantenere i dati aggiornati",
    freshnessSub: "Tre meccanismi, volutamente sovrapposti.",
    webhooks: "Webhook",
    webhooksBody:
      "WHOOP chiama /api/whoop/webhook quando un record viene calcolato, ricalcolato o eliminato. Firma verificata, ed è la via più rapida.",
    reconcile: "Riconciliazione notturna",
    reconcileBody:
      "Un cron riscarica l'ultima settimana ogni mattina per ogni account collegato, così un webhook perso durante un deploy costa un giorno di freschezza invece di lasciare un buco permanente.",
    manual: "Sincronizzazione manuale",
    manualBody:
      "Il backfill percorre tutto lo storico; l'incrementale riprende dal record più recente. Entrambi rispettano il limite di 100 richieste al minuto.",
    keys: {
      title: "La tua app sviluppatore WHOOP",
      sub: "Un'app WHOOP in sviluppo può avere {limit} utenti. È un limite della piattaforma, quindi questa app condivide i suoi posti — e chi arriva dopo usa la propria app.",
      slots: "Posti condivisi liberi",
      slotsFree: "Ne restano {remaining}. Collegandoti ora ne occupi uno; puoi passare alla tua app più avanti e restituirlo.",
      slotsHeld: "Ne stai usando uno. Altri {remaining} sono liberi — passando alla tua app qui sotto restituisci il tuo.",
      slotsGone: "Tutti i posti sono occupati. Per collegare WHOOP ti serve la tua app sviluppatore — si crea in un paio di minuti.",
      usingOwn: "Stai usando la tua app, quindi non occupi un posto condiviso.",
      stored: "Client ID salvato",
      remove: "Rimuovi le chiavi",
      clientId: "Client ID",
      clientSecret: "Client secret",
      save: "Salva le chiavi",
      saving: "Salvataggio…",
      saved: "Salvate. Collega WHOOP per completare.",
      missing: "Servono sia il client ID sia il secret.",
      tooShort: "Non sembrano un client ID e un secret WHOOP.",
      noEncryption: "CREDENTIALS_SECRET non è impostato, quindi i secret non possono essere salvati in sicurezza. Impostalo e riavvia.",
      signedOut: "Accedi prima di continuare.",
      step: {
        one: "Crea un'app su developer-dashboard.whoop.com — un nome qualsiasi va bene.",
        two: "Imposta il suo redirect URI esattamente al valore usato da questo deployment, mostrato qui sotto.",
        three: "Copia qui client ID e secret. Vengono cifrati prima di essere salvati e usati solo per parlare con WHOOP a tuo nome.",
      },
    },
    error: {
      needs_own_keys: "L'app WHOOP condivisa è piena. Aggiungi qui sotto le tue chiavi sviluppatore per collegarti.",
      not_configured: "Questo deployment non ha un'app WHOOP condivisa. Aggiungi qui sotto le tue chiavi sviluppatore.",
      no_encryption_key: "Le tue chiavi sono salvate ma non possono essere decifrate — CREDENTIALS_SECRET manca o è cambiato.",
      credentials_changed: "Le tue credenziali sono cambiate durante il collegamento. Riprova da capo.",
      state_mismatch: "Non è stato possibile verificare il tentativo di accesso. Riprova.",
    },
    cli: "Senza interfaccia",
    cliBody:
      "Tutto questo funziona anche da riga di comando: npm run whoop -- status, backfill, sync ed export usano lo stesso core della dashboard.",
  },

  chart: {
    recovery: "Recovery",
    strain: "Strain",
    supported: "Sostenuto",
    supportedRange: "Intervallo di strain sostenuto",
    deviation: "Scostamento",
    primedBand: "Pronto (67%+)",
    adequateBand: "Sufficiente (34-66%)",
    compromisedBand: "Compromessa (<34%)",
    eachDot: "Ogni punto è un giorno",
    aboveSupported: "Sopra lo strain sostenuto",
    belowSupported: "Sotto lo strain sostenuto",
    fadedInRange: "Le barre sbiadite sono dentro l'intervallo sostenuto",
    fadedNoSession: "Le barre sbiadite sono giorni senza sessione",
    acute: "Acuto (7g)",
    chronic: "Cronico (28g)",
    acuteLoad: "Carico acuto (7 giorni)",
    chronicLoad: "Carico cronico (28 giorni)",
    baseline30: "Baseline a 30 giorni",
    normalRange: "Intervallo normale ±1 SD",
  },

  live: {
    title: "Frequenza cardiaca live",
    sub: "Indipendente dall'API — questa via è puro Bluetooth.",
    heartRate: "Frequenza cardiaca live",
    session: "Sessione",
    sessionSub: "Accumulato dalla prima lettura ricevuta.",
    avg: "Media",
    peak: "Picco",
    low: "Minimo",
    elapsed: "Trascorso",
    estStrain: "Strain stimato",
    liveHrv: "HRV live",
    sdnn: "SDNN",
    timeInZone: "Tempo in zona",
    broadcast: "Trasmissione della frequenza cardiaca",
    broadcastSub:
      "Attiva Heart Rate Broadcast nell'app WHOOP, poi collegati. Le letture arrivano a ogni dashboard aperta.",
  },

  recoveryPage: {
    title: "HRV e frequenza cardiaca a riposo, rispetto alla tua baseline",
    lead: "Le norme di popolazione per l'HRV variano di un ordine di grandezza, quindi non dicono nulla. Conta dove si colloca oggi dentro la tua distribuzione — ed è esattamente ciò che mostra la banda ombreggiata.",
    vsBaseline: "rispetto alla baseline",
    greenDays: "Giorni verdi",
    greenCaption: "Recovery pari o superiore al 67%",
    redDays: "Giorni rossi",
    redCaption: "Recovery sotto il 34%",
    outOf30: "/ 30",
    signals: "Segnali di recovery",
    signalsSub: "Solo ciò che esce dal tuo intervallo abituale.",
    hrvTitle: "Variabilità della frequenza cardiaca",
    hrvSub: "90 giorni. La banda è ±1 deviazione standard attorno a una media mobile a 30 giorni — dentro è rumore, fuori è segnale.",
    rhrTitle: "Frequenza cardiaca a riposo",
    rhrSub: "Una FC a riposo che sale mentre l'HRV scende è il quadro su cui vale la pena intervenire — presi singolarmente sono di solito rumore.",
    dailyTitle: "Punteggio di recovery giornaliero",
    dailySub: "Ultimi 60 giorni.",
  },

  strainPage: {
    title: "Il tuo allenamento è allineato a ciò che il corpo ti offre?",
    lead: "Strain e recovery stanno su scale diverse, quindi qui non compaiono mai sulla stessa coppia di assi — una versione a doppio asse di questo grafico inventerebbe una relazione. Invece: una misura per asse, e una serie di scostamento con uno zero reale.",
    today: "Strain di oggi",
    supportedRange: "Intervallo sostenuto {low}–{high}",
    acuteChronic: "Acuto : cronico",
    thisWeek: "Questa settimana",
    vsLastWeek: "rispetto alla scorsa",
    weekCaption: "Strain totale su 7 giorni",
    daysOver: "Giorni oltre la recovery",
    meanDeviation: "Scostamento medio {value} di strain",
    signals: "Segnali di carico",
    signalsSub: "Dove sta il tuo allenamento rispetto alla tua capacità.",
    scatterTitle: "Strain rispetto alla recovery",
    scatterSub: "Ogni punto è un giorno. La diagonale ombreggiata è lo strain che ciascun livello di recovery sostiene — i punti sopra sono i giorni in cui hai superato la tua recovery.",
    deviationTitle: "Scostamento giornaliero",
    deviationSub: "Strain meno quanto la recovery di quel giorno sosteneva. Una sola misura, quindi un solo asse, con uno zero reale.",
    loadTitle: "Carico acuto e cronico",
    loadSub: "Sono entrambi strain pesato esponenzialmente nelle stesse unità, quindi condividono legittimamente un asse. Il loro rapporto è il numero che conta: 0,80–1,30 è la fascia produttiva.",
    dailyTitle: "Strain giornaliero",
    dailySub: "Ultimi 60 giorni.",
    zoneProductive: "Stai aggiungendo stimolo a un ritmo che la tua base assorbe",
    zoneOverreaching: "Il carico acuto è schizzato oltre la tua base",
    zoneDetraining: "Il carico acuto è sceso sotto la tua base",
  },

  sleepPage: {
    title: "Debito, architettura e ciò che muove davvero la tua recovery",
    lead: "Il tempo totale a letto è il numero meno interessante. A predire la recovery sono la quota di sonno ristoratore, la regolarità degli orari e se stai colmando il fabbisogno che il corpo ha già accumulato.",
    debtCaption: "Deficit accumulato in 7 notti",
    avgAsleep: "Sonno medio",
    againstNeed: "Contro un fabbisogno di {need}",
    restorative: "Quota ristoratrice",
    restorativeCaption: "REM più profondo, sul totale del sonno. Il valore tipico è 40–50%.",
    spread: "Variabilità dell'orario",
    spreadCaption: "L'obiettivo è restare sotto i ±30 minuti",
    signals: "Segnali dal sonno",
    signalsSub: "Dove le tue notti ti aiutano o ti costano.",
    architecture: "Architettura del sonno",
    architectureSub: "Le fasi si impilano dalla più profonda e condividono una sola tinta — la profondità si legge come scurezza. La linea a gradini è quanto WHOOP ha calcolato che ti servisse quella notte.",
    shortfall: "Deficit per notte",
    shortfallSub: "Di quanto ogni notte è rimasta sotto il proprio fabbisogno. Il debito si accumula — non lo azzera una singola dormita lunga.",
    regularity: "Regolarità degli orari",
    regularitySub: "La costanza è l'ingrediente più controllabile della qualità del sonno, e di solito rende più del tempo extra a letto.",
    correlation: "Il sonno guida davvero la tua recovery?",
    genuinelyRegular: "Davvero regolare",
    deep: "Profondo",
    rem: "REM",
    light: "Leggero",
    awake: "Sveglio",
    needed: "Necessario",
    shortOfNeed: "{amount} sotto il fabbisogno · {performance}% di performance",
    none: "Nessuno",
    needMet: "Fabbisogno coperto · {performance}% di performance",
    time: "Tempo",
    correlationDetail: "Correlazione di {r} su {nights} notti — il sonno spiega circa il {variance}% della variazione del tuo punteggio di recovery.",
  },

  livePage: {
    title: "Frequenza cardiaca in tempo reale",
    lead: "L'API WHOOP non ha un endpoint per la frequenza cardiaca continua, quindi questa arriva via Bluetooth — il servizio Heart Rate standard che la fascia espone quando attivi Heart Rate Broadcast. Un Mac tiene la connessione; ogni dashboard si iscrive.",
    noBroadcast: "Nessuna trasmissione",
    beatsRelayed: "Battiti trasmessi",
    transport: "Trasporto",
    noBluetooth: "Questo browser non può usare il Bluetooth.",
    onMac: "Sul tuo Mac —",
    onIphone: "Sul tuo iPhone —",
    streamingFrom: "In streaming da {device}",
    zonesSub: "Le zone sono quote del tuo massimo di {maxHr} bpm. Le zone alte costano strain in modo più che proporzionale.",
  },

  insight: {
    hrvSuppressed: {
      title: "L'HRV è {sd} SD sotto la tua baseline",
      detail:
        "{latest}ms contro una baseline a 30 giorni di {baseline}ms ({delta}ms). Una singola mattina bassa è rumore; due o tre di fila di solito significano carico accumulato, una notte corta, alcol o qualcosa in incubazione.",
    },
    hrvElevated: {
      title: "L'HRV è {delta}ms sopra la baseline",
      detail:
        "{latest}ms contro {baseline}ms. Il tuo sistema parasimpatico ha margine — è il profilo di una giornata che può assorbire intensità vera.",
    },
    hrvTrendUp: {
      title: "L'HRV sale da due settimane",
      detail:
        "Circa {perWeek}ms a settimana negli ultimi 14 giorni. È la firma dell'adattamento che sta recuperando terreno sull'allenamento.",
    },
    hrvTrendDown: {
      title: "L'HRV scende da due settimane",
      detail:
        "Circa {perWeek}ms a settimana negli ultimi 14 giorni. Un calo prolungato così va preso sul serio — controlla debito di sonno e carico prima di aggiungere intensità.",
    },
    rhrElevated: {
      title: "La frequenza cardiaca a riposo è più alta di {delta} bpm",
      detail:
        "{latest} bpm contro una baseline di {baseline}. FC a riposo alta insieme a HRV bassa è il classico quadro pre-malattia o di recupero incompleto.",
    },
    illnessSignal: {
      title: "Temperatura cutanea e frequenza respiratoria sono entrambe alte",
      detail:
        "Frequenza respiratoria {respiratoryRate} rpm e temperatura cutanea {skinTemp}°C sono entrambe oltre 1,5 SD sopra la baseline. Il movimento congiunto è la combinazione che WHOOP segnala come possibile inizio di malattia.",
    },
    greenStreak: {
      title: "{days} giorni verdi consecutivi",
      detail:
        "Una serie così lunga significa che sei davvero poco caricato rispetto alla tua capacità. È il momento di programmare il blocco duro, non di continuare in scioltezza.",
    },
    loadSpike: {
      title: "Il carico acuto è {ratio}× la tua base cronica",
      detail:
        "Questa settimana corre molto più delle ultime quattro. Sopra 1,5 le curve di infortunio e malattia iniziano a salire — la soluzione sono un paio di giorni davvero facili, non una settimana di stop.",
    },
    loadDecay: {
      title: "Il carico acuto è sceso a {ratio}× la tua base",
      detail:
        "La condizione costruita nell'ultimo mese sta iniziando a calare. Una singola sessione dura non la recupera — la costanza sì.",
    },
    loadProductive: {
      title: "Il carico di allenamento è nella fascia produttiva ({ratio}×)",
      detail:
        "Acuto {acute} contro cronico {chronic}. Stai aggiungendo stimolo a un ritmo che la tua base riesce ad assorbire.",
    },
    balanceOver: {
      title: "Hai superato la tua recovery in {over} degli ultimi {total} giorni",
      detail:
        "In media {mean} di strain sopra quanto la recovery di ciascun giorno sosteneva. Un eccesso occasionale è il modo in cui avviene l'adattamento; un mese così è il modo in cui ci si appiattisce.",
    },
    balanceUnder: {
      title: "Hai lasciato capacità inutilizzata in {under} degli ultimi {total} giorni",
      detail:
        "In media {mean} di strain sotto quanto la recovery sosteneva. Il tuo corpo stava offrendo più di quanto gli hai chiesto.",
    },
    todayTarget: {
      title: "Il target di strain di oggi è {target}",
      detail:
        "Con una recovery del {recovery}%, una sessione tra {low} e {high} di strain aggiunge stimolo senza scavare un buco.",
      detailWithStrain:
        "Con una recovery del {recovery}%, una sessione tra {low} e {high} di strain aggiunge stimolo senza scavare un buco. Finora sei a {strain}.",
    },
    sleepDebt: {
      title: "{debt} di debito di sonno nell'ultima settimana",
      detail:
        "Hai dormito in media {asleep} contro un fabbisogno di {need}. Il debito si ripaga con circa un'ora in più a notte — una singola dormita del fine settimana non lo azzera.",
    },
    sleepConsistency: {
      title: "L'orario in cui vai a letto oscilla di ±{minutes} minuti",
      detail:
        "La costanza è l'ingrediente più controllabile della qualità del sonno. Tenere l'orario dentro una finestra di 30 minuti di solito rende più recovery che aggiungere tempo totale.",
    },
    sleepRegular: {
      title: "L'orario in cui vai a letto resta entro ±{minutes} minuti",
      detail: "È davvero regolare, e sta lavorando in silenzio a favore della tua recovery.",
    },
    restorativeLow: {
      title: "Solo il {share}% del tuo sonno è REM o profondo",
      detail:
        "Il valore tipico è 40-50%. Qui il limite non è il tempo a letto, è la qualità. Alcol, cene tardi e una stanza calda deprimono esattamente queste due fasi.",
    },
    sleepRecoveryLink: {
      title: "Il sonno spiega il {variance}% della variabilità della tua recovery",
      detail:
        "Correlazione di {r} su {nights} notti. Un legame reale ma parziale: conta il sonno, e conta la gestione del carico.",
      detailStrong:
        "Correlazione di {r} su {nights} notti. Il sonno è la tua leva principale di recupero — per te più che per la maggior parte delle persone.",
    },
  },
};
