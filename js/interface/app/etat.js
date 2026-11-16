// État partagé de l'interface (ancien js/app.js) : toutes les variables `let` du haut du
// fichier, réunies ici parce qu'un import ne se réassigne pas. On écrit `etat.session = …`.
export const etat = {
  session: null,
  liveTimer: null,
  warnedOutdated: false,
  wakeLock: null,
  toastTimer: null,
  // Caméra -----------------------------------------------------------------
  scanAbort: null,
  taking: false, // « Reprendre » attend qu'un autre onglet rende la partie (D-430)
  // Lien d'invitation ouvert sans nom (#69, D-290) : le code attend ici le premier appui sur
  // « Rejoindre », qui le consomme. Les appuis suivants ouvrent l'étape 1 normale.
  pendingInvite: null,
  answerCode: '',
  // Rendus groupés (D-370) : une fiche reçue (d'une IA ou d'un autre téléphone) ne redessine
  // l'écran qu'une fois par image, quel que soit le nombre de fiches arrivées entre deux images.
  // Un changement venu de moi (un ordre, un écran qui change) redessine tout de suite, comme avant.
  stateFrame: 0,
  offerCode: '',
  connecting: false,
  pickedRace: null,
  /** Interface construite pour cette race (les tuiles et bâtiments en dépendent). */
  builtFor: null,
  // Un historique par planète (js/spark.js) : { id: 'partie|joueur', p: { clé: { t, v } } }.
  // (pas « history » : ce nom est celui du navigateur)
  hist: null,
  awayFrom: 0, // numéro de la dernière entrée du carnet quand je suis parti
  hiddenAt: 0,
  // Fin de partie (D-143) : l'écran s'ouvre une fois par partie ; le bandeau le rouvre.
  finishSeen: null, // « gid@heure de fin » déjà montré
  // Diagnostic des planètes : famine, panne d'énergie, stock vital qui baisse (D-111).
  alertsNow: new Map(), // case « x:y » → { key, name, cell, list } : mes planètes à problème
  alertsSeen: new Map(), // problème déjà annoncé → dernière fois vu (évite de répéter le toast)
  openName: null, // nom de la planète affichée au dernier rafraîchissement (#73)
  /**
   * Fil d'attente de la planète ouverte (bâtiments, recherches, vaisseaux), avec
   * l'heure estimée de début et de fin de chaque élément (planForecast,
   * recalculée une fois par seconde). Visible sur les onglets Bâtiments,
   * Recherche et Flottes.
   */
  planCache: { key: '', list: [] },
  fleetKey: 'home', // planète d'où part la flotte du formulaire de décollage
  currentView: 'map',
  openKey: 'home', // planète ouverte : « home » ou l'identifiant d'une colonie
  mapFrame: null,
  selected: null, // planète touchée sur la carte : { x, y }
  selFleet: null, // id d'une de mes flottes, sélectionnée pour la piloter
  // Menu posé sur la carte, au doigt (D-126) : le choix d'un ordre, ou de l'objet visé quand
  // plusieurs sont sous le doigt. { at: { x, y } en cases, cell, foe, title, items: [{ label, primary, run }] }
  menu: null,
  tradeSheet: null, // { from, pid, ref, name }
  moveSheet: null, // { kind: 'give' | 'split', from, to } : `from` est la flotte pour laquelle la fenêtre a été ouverte (#73)
  // IA du lobby (D-399, D-400) : l'hôte qui la fait jouer change son nom, sa race, ou la retire.
  botSheet: null, // pid de l'IA ouverte
  botRace: null, // race cochée dans la fiche
  backArmed: !!history.state?.astraGuard, // l'entrée « garde » est au-dessus de la page (rechargée : déjà là)
  leaving: false, // « Quitter » touché : plus de question, ni la nôtre ni celle du navigateur
  leaveTimer: null,
};
