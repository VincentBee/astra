// Point d'entrée de l'interface (ancien js/app.js) : tout ce qui s'exécute au chargement,
// dans le même ordre qu'avant. Les fonctions et constantes sont chacune dans leur fichier.
import { readTap } from '../../aim.js';
import { backAction } from '../../back.js';
import { addBot, editableBot, removeBot, renameBot, setBotRace, wakeBots } from '../../bot.js';
import { aggressive } from '../../fleet.js';
import { setSkyMode, skyMode, startGalaxy } from '../../galaxy.js';
import { RACES, sameCell, shipsAffordable, stateAt } from '../../game.js';
import { fillIcons } from '../../icons.js';
import { inviteLink } from '../../invite.js';
import { forgetGame, onSaveFailed, selectGame } from '../../save.js';
import { Session } from '../../session.js';
import { holdGame } from '../../tablock.js';
import { onLost } from './accueil/on-lost.js';
import { showSaved } from './accueil/show-saved.js';
import { closePlanetSheet } from './carte/fiche/close-planet-sheet.js';
import { renderPick } from './carte/fiche/render-pick.js';
import { mapVeiled } from './carte/map-veiled.js';
import { closeMenu } from './carte/menu/close-menu.js';
import { openMenu } from './carte/menu/open-menu.js';
import { actionsFor } from './carte/selection/actions-for.js';
import { dropFleet } from './carte/selection/drop-fleet.js';
import { fleetSpots } from './carte/selection/fleet-spots.js';
import { mapItems } from './carte/selection/map-items.js';
import { orderAt } from './carte/selection/order-at.js';
import { selectFleet } from './carte/selection/select-fleet.js';
import { showPlanet } from './carte/selection/show-planet.js';
import { cellCss } from './carte/zoom/cell-css.js';
import { clampZoom } from './carte/zoom/clamp-zoom.js';
import { gesture } from './carte/zoom/gesture.js';
import { grabFleet } from './carte/zoom/grab-fleet.js';
import { reveal } from './carte/zoom/reveal.js';
import { toCells } from './carte/zoom/to-cells.js';
import { zoomAt } from './carte/zoom/zoom-at.js';
import { zoomCenter } from './carte/zoom/zoom-center.js';
import { zoom } from './carte/zoom/zoom.js';
import { myColonizer } from './depart/my-colonizer.js';
import { openBotSheet } from './depart/open-bot-sheet.js';
import { openMoveSheet } from './echanges/open-move-sheet.js';
import { openTradeSheet } from './echanges/open-trade-sheet.js';
import { readTrade } from './echanges/read-trade.js';
import { refreshMoveSheet } from './echanges/refresh-move-sheet.js';
import { etat } from './etat.js';
import { fleetChoice } from './flotte/decollage/fleet-choice.js';
import { openFleetSheet } from './flotte/decollage/open-fleet-sheet.js';
import { updateFleetSheet } from './flotte/decollage/update-fleet-sheet.js';
import { renderFleetInfo } from './flotte/pilotage/render-fleet-info.js';
import { renderMapFleets } from './flotte/pilotage/render-map-fleets.js';
import { closeInviteSheet } from './invitation/close-invite-sheet.js';
import { openInviteSheet } from './invitation/open-invite-sheet.js';
import { useAnswer } from './invitation/use-answer.js';
import { openJournal } from './journal/open-journal.js';
import { showAbsence } from './journal/show-absence.js';
import { showSnapshot } from './lecture/show-snapshot.js';
import { VIEW } from './lecture/view.js';
import { copy } from './outils/copy.js';
import { $ } from './outils/dollar.js';
import { keepAwake } from './outils/keep-awake.js';
import { playerName } from './outils/player-name.js';
import { scan } from './outils/scan.js';
import { share } from './outils/share.js';
import { show } from './outils/show.js';
import { toast } from './outils/toast.js';
import { topSheet } from './outils/top-sheet.js';
import { boot } from './partie/boot.js';
import { onSessionChange } from './partie/on-session-change.js';
import { renderLive } from './partie/render-live.js';
import { showFinish } from './partie/show-finish.js';
import { showTab } from './partie/show-tab.js';
import { showView } from './partie/show-view.js';
import { startGame } from './partie/start-game.js';
import { stopGame } from './partie/stop-game.js';
import { BAR, STICKY, TABS } from './planete/entete/entete-dom.js';
import { stackSticky } from './planete/entete/stack-sticky.js';
import { stack } from './planete/entete/stack.js';
import { updateRacePick } from './race/update-race-pick.js';
import { joinError } from './rejoindre/join-error.js';
import { startJoin } from './rejoindre/start-join.js';
import { useOffer } from './rejoindre/use-offer.js';
import { armBack } from './retour/arm-back.js';
import { inGame } from './retour/in-game.js';
import { stayInGame } from './retour/stay-in-game.js';

fillIcons(); // les icônes du HTML statique, avant tout le reste
startGalaxy();
for (const el of [BAR, ...STICKY, TABS]) stack.observe(el);
addEventListener('scroll', stackSticky, { passive: true });
// Accès depuis la console du navigateur, pour déboguer : astra.session
window.astra = { get session() { return etat.session; } };

// ---------------------------------------------------------------------------
// Utilitaires d'interface
// ---------------------------------------------------------------------------
// Mémoire du téléphone pleine malgré le ménage de l'historique (D-415) : le joueur est prévenu.
onSaveFailed((kind, n) => {
  if (kind === 'history') return toast(`Mémoire du téléphone pleine : ${n} ancienne${n > 1 ? 's' : ''} partie${n > 1 ? 's' : ''} n’${n > 1 ? 'ont' : 'a'} pas pu être gardée${n > 1 ? 's' : ''}.`, 8000);
  toast('Sauvegarde impossible : la mémoire du téléphone est pleine. La partie continue, mais elle ne sera pas gardée si tu fermes l’appli.', 8000);
  return document.visibilityState !== 'hidden'; // appli cachée : pas de toast, on redira au prochain échec
});
document.addEventListener('visibilitychange', () => {
  if (etat.session && document.visibilityState === 'visible' && (!etat.wakeLock || etat.wakeLock.released)) keepAwake();
});
$('btn-scan-cancel').onclick = () => etat.scanAbort?.abort();

// ---------------------------------------------------------------------------
// Accueil
// ---------------------------------------------------------------------------

try {
  $('name').value = localStorage.getItem('astra.name') || '';
} catch {}

// Réglages de l'appareil : une fenêtre, ouverte par la roue crantée (accueil et jeu).
for (const btn of document.querySelectorAll('[data-settings]')) {
  btn.onclick = () => {
    $('sky').value = skyMode();
    $('sheet-settings').hidden = false;
  };
}
$('btn-settings-close').onclick = () => ($('sheet-settings').hidden = true);
$('sky').onchange = () => setSkyMode($('sky').value);

for (const el of document.querySelectorAll('[data-go]')) {
  el.onclick = () => {
    etat.session?.end?.();
    etat.session = null;
    show(el.dataset.go);
    showSaved();
  };
}
$('games').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-resume], [data-replay], [data-forget]');
  if (!btn || etat.taking) return;
  const { resume, replay, forget } = btn.dataset;
  if (forget) {
    forgetGame(forget);
    return showSaved();
  }
  if (replay) {
    if (!selectGame(replay)) return showSaved();
    return (location.href = 'replay.html');
  }
  // D-430 : si un autre onglet joue cette partie, il sauve et s'arrête d'abord ; la sauvegarde
  // n'est lue qu'ensuite (au plus WAIT ms si cet onglet-là est gelé).
  etat.session?.end?.();
  etat.session = null;
  etat.taking = true;
  let hold;
  try {
    hold = await holdGame(resume);
  } finally {
    etat.taking = false;
  }
  const saved = selectGame(resume);
  if (!saved) {
    hold.release();
    return showSaved();
  }
  $('home-note').hidden = true;
  etat.session = Session.resume(saved, hold);
  etat.session.ontoast = toast;
  etat.session.onchange = onSessionChange;
  etat.session.onlost = onLost;
  wakeBots(etat.session); // les IA que ce téléphone faisait jouer reprennent (D-151)
  startGame();
  toast('Partie reprise.');
  // Les combats rattrapés à la reprise ont été notés avant que l'écran existe, ceux d'avant la
  // fermeture (appli en arrière-plan) n'ont pas été lus : le résumé montre tout ce qui n'est pas lu.
  etat.awayFrom = saved.journal?.read || 0;
  showAbsence(Date.now() - saved.savedAt);
});

window.addEventListener('pagehide', () => etat.session?.save?.()); // en lecture seule (D-139), `save` ne fait rien

$('btn-create').onclick = async () => {
  const name = playerName();
  if (!name) return;
  etat.session = await Session.create(name);
  etat.session.ontoast = toast;
  etat.session.onchange = onSessionChange;
  etat.session.onlost = onLost;
  startGame();
};

// Partie contre l'IA (D-151) : une partie neuve, avec une IA qui joue sur ce téléphone ; d'autres
// IA (ou des joueurs) s'ajoutent depuis le bandeau du départ.
$('btn-solo').onclick = async () => {
  const name = playerName();
  if (!name) return;
  etat.session = await Session.create(name);
  etat.session.ontoast = toast;
  etat.session.onchange = onSessionChange;
  etat.session.onlost = onLost;
  addBot(etat.session);
  startGame();
};

$('btn-join').onclick = () => {
  if (!playerName()) return;
  const invite = etat.pendingInvite;
  etat.pendingInvite = null;
  if (invite) $('home-note').hidden = true;
  startJoin(invite || undefined);
};

// ---------------------------------------------------------------------------
// Rejoindre (joueur)
// ---------------------------------------------------------------------------

$('btn-scan-offer').onclick = async () => {
  try {
    useOffer(await scan());
  } catch (e) {
    if (e?.name !== 'AbortError') joinError(e.message);
  }
};
$('btn-offer-ok').onclick = () => useOffer($('offer-input').value);

// Étape 2 → étape 1 (#69) : abandonner cette réponse pour scanner ou coller une autre invitation.
// Comme la flèche Retour, la tentative en cours est arrêtée (session.end) ; useOffer en refera une.
$('btn-other-invite').onclick = () => {
  etat.session?.end?.();
  etat.session = null;
  startJoin();
};

$('btn-copy-answer').onclick = () => copy(etat.answerCode, 'Réponse copiée. Envoie-la à la personne qui t’invite.');
$('btn-share-answer').onclick = () => share(etat.answerCode, 'Ma réponse Astra');
// Compteur de rendus complets, pour la mesure de l'issue #39 (tests/perf-ia-page.mjs).
globalThis.astraStats = { renders: 0 };

// Resté seul : la partie continue ici ; ce bouton permet de rejoindre les autres.
$('btn-rejoin').onclick = () => {
  stopGame();
  startJoin();
};

// ---------------------------------------------------------------------------
// Invitations (tout le monde peut inviter)
// ---------------------------------------------------------------------------

// Fenêtre des joueurs : qui est en ligne, le classement, et inviter. Cachée en préparation (D-310).
$('net').onclick = () => {
  if (mapVeiled()) return; // en préparation, le lobby tient ce rôle (D-310)
  $('sheet-players').hidden = false;
  renderLive();
};
$('btn-players-close').onclick = () => ($('sheet-players').hidden = true);
$('btn-invite').onclick = () => {
  $('sheet-players').hidden = true;
  openInviteSheet();
};
$('btn-invite-close').onclick = () => {
  etat.session.cancelInvite();
  closeInviteSheet();
};
$('btn-copy-offer').onclick = () => copy(inviteLink(etat.offerCode, etat.session.state?.gid), 'Lien copié. Envoie-le au joueur.');
$('btn-share-offer').onclick = () => share(inviteLink(etat.offerCode, etat.session.state?.gid), 'Rejoins ma partie Astra');

$('btn-scan-answer').onclick = async () => {
  if (etat.connecting) return;
  try {
    useAnswer(await scan());
  } catch (e) {
    if (e?.name !== 'AbortError') $('invite-status').textContent = e.message;
  }
};
$('btn-answer-ok').onclick = () => useAnswer($('answer-input').value);

// ---------------------------------------------------------------------------
// Partie
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Choix de la race, à l'arrivée dans la partie (définitif)
// ---------------------------------------------------------------------------

$('races').addEventListener('click', (e) => {
  const el = e.target.closest('[data-race]');
  if (!el) return;
  etat.pickedRace = el.dataset.race;
  updateRacePick();
});

$('btn-race').onclick = () => {
  if (!etat.pickedRace || !etat.session) return;
  if (!etat.session.chooseRace(etat.pickedRace)) return;
  startGame();
};

// ---------------------------------------------------------------------------

// Toucher le nom d'une carte déplie ou replie sa description.
document.addEventListener('click', (e) => {
  const name = e.target.closest('.b-name');
  if (!name) return;
  const open = name.closest('.building').classList.toggle('open');
  name.setAttribute('aria-expanded', String(open));
});

$('powers').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-power]');
  if (btn && !btn.disabled) etat.session.power(btn.dataset.power, etat.openKey);
});
$('techs').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-research]');
  if (btn && !btn.disabled) {
    if (btn.dataset.mode === 'plan') etat.session.planResearch(btn.dataset.research, etat.openKey);
    else etat.session.research(btn.dataset.research, etat.openKey);
  }
});
$('ships').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-ship]');
  if (btn && !btn.disabled) {
    if (btn.dataset.mode === 'plan') etat.session.planShips(btn.dataset.ship, Number(btn.dataset.n), etat.openKey);
    else etat.session.buildShips(btn.dataset.ship, Number(btn.dataset.n), etat.openKey);
  }
});

// ---------------------------------------------------------------------------
// Historique des ressources : un mini-graphe discret dans chaque tuile
// ---------------------------------------------------------------------------

// Toutes les fenêtres se ferment d'un toucher sur le fond sombre ou avec Échap (comme leur croix).
// Échap ferme seulement celle du dessus (#72) : toutes les fenêtres ont le même z-index (style.css,
// `.sheet`), donc celle qui se voit devant est la dernière ouverte dans l'ordre du HTML. Un deuxième
// Échap ferme la suivante. Le « retour » en partie (D-417) ferme la même : `topSheet`.
for (const sheet of document.querySelectorAll('.sheet')) {
  sheet.addEventListener('click', (e) => {
    if (e.target === sheet) sheet.querySelector('.close-btn')?.click();
  });
}
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  topSheet()?.querySelector('.close-btn')?.click();
});

$('buildings').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-build]');
  if (btn && !btn.disabled) {
    if (btn.dataset.mode === 'now') etat.session.build(btn.dataset.build, etat.openKey);
    else etat.session.planBuild(btn.dataset.build, etat.openKey);
  }
  const down = e.target.closest('[data-demolish]');
  if (down && !down.disabled) {
    const name = RACES[etat.session.myRace].buildings[down.dataset.demolish].name;
    if (confirm(`Déconstruire un niveau de ${name} ? Tu récupères la moitié de son prix et sa place.`)) etat.session.demolish(down.dataset.demolish, etat.openKey);
  }
});

// ---------------------------------------------------------------------------
// Journal en jeu (D-110) : mes combats vus de mon côté (carnet du téléphone),
// puis les lignes du journal partagé qui me nomment.
// ---------------------------------------------------------------------------

$('btn-journal').onclick = () => openJournal();
$('btn-journal-all').onclick = () => openJournal();
$('btn-journal-close').onclick = () => ($('sheet-journal').hidden = true);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    etat.hiddenAt = Date.now();
    etat.awayFrom = etat.session?.journal?.n || 0;
    return;
  }
  if (!etat.hiddenAt) return;
  const gone = Date.now() - etat.hiddenAt;
  etat.hiddenAt = 0;
  // Le rattrapage tourne au passage suivant (toutes les 250 ms) : on lui laisse le temps.
  setTimeout(() => showAbsence(gone), 1000);
});
$('threat').addEventListener('click', () => showView('map'));
$('race').addEventListener('click', (e) => {
  if (e.target.closest('[data-finish]') && etat.session?.over) showFinish(etat.session.over, true);
});
$('btn-finish-close').onclick = () => ($('sheet-finish').hidden = true);
$('btn-finish-map').onclick = () => {
  $('sheet-finish').hidden = true;
  showView('map');
};

$('plan').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-unplan]');
  if (btn && !btn.disabled) etat.session.unplan(btn.dataset.key, Number(btn.dataset.unplan), etat.openKey);
});

$('fleets').addEventListener('click', (e) => {
  const id = e.target.closest('[data-fleet]')?.dataset.fleet;
  if (!id) return;
  etat.selFleet = id;
  showView('map');
  renderFleetInfo();
});

// ---------------------------------------------------------------------------
// Décollage d'une flotte
// ---------------------------------------------------------------------------

$('btn-send-fleet').onclick = () => openFleetSheet(etat.openKey);
$('btn-fleet-close').onclick = () => ($('sheet-fleet').hidden = true);
$('sheet-fleet').addEventListener('input', updateFleetSheet);
$('btn-fleet-go').onclick = () => {
  const { ships, cargo } = fleetChoice();
  const id = etat.session.takeOff(etat.fleetKey, ships, cargo, Math.floor(Number($('fleet-fuel').value) || 0));
  if (!id) return;
  $('sheet-fleet').hidden = true;
  // Direction la carte, flotte sélectionnée : il ne reste qu'à toucher une case.
  etat.selFleet = id;
  etat.selected = null;
  showView('map');
  renderPick();
  renderFleetInfo();
};

// ---------------------------------------------------------------------------
// Univers : la carte des planètes, vue principale de la partie
// ---------------------------------------------------------------------------

$('btn-back-map').onclick = () => showView('map');
for (const b of document.querySelectorAll('[data-tab-btn]')) b.onclick = () => showTab(b.dataset.tabBtn);
// Flèches gauche et droite : onglet voisin (visible).
document.querySelector('.tabs').addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  const tabs = [...document.querySelectorAll('[data-tab-btn]')].filter((b) => !b.hidden);
  const i = tabs.findIndex((b) => b.getAttribute('aria-selected') === 'true');
  const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
  showTab(next.dataset.tabBtn);
  next.focus();
});
try {
  localStorage.removeItem('astra.tab'); // onglet retenu d'avant D-156, plus lu
} catch {}
$('alerts-btn').onclick = () => {
  const open = $('alerts-panel').hidden;
  $('alerts-panel').hidden = !open;
  $('alerts-btn').setAttribute('aria-expanded', String(open));
  delete $('alerts-list').dataset.html; // réécrire la liste tout de suite
  renderLive();
};
$('alerts-list').addEventListener('click', (e) => {
  const go = e.target.closest('[data-alert-go]');
  if (!go) return;
  etat.selected = null;
  renderPick();
  showView('planet', go.dataset.alertGo);
});
$('btn-open-planet').onclick = (e) => {
  etat.selected = null; // sinon la fiche se rouvrirait au retour sur la carte
  renderPick();
  showView('planet', e.currentTarget.dataset.key || 'home');
};

// ---------------------------------------------------------------------------
// Zoom de la carte (D-117) : pincer ou molette pour zoomer, glisser pour se déplacer,
// boutons + / − / vue entière. `zoom.x`, `zoom.y` : coin haut-gauche de la partie vue, en cases.
// ---------------------------------------------------------------------------

$('btn-zoom-in').onclick = () => (closeMenu(), zoomCenter(1.6));
$('btn-zoom-out').onclick = () => (closeMenu(), zoomCenter(1 / 1.6));
$('btn-zoom-fit').onclick = () => {
  closeMenu();
  zoom.z = 1;
  clampZoom();
};

$('map').addEventListener('pointerdown', (e) => {
  if (!gesture.pts.size) gesture.moved = false;
  gesture.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  gesture.start = null;
  // Un deuxième doigt : c'est un pincement, plus une visée.
  const id = gesture.pts.size === 1 && (e.pointerType !== 'mouse' || e.button === 0) ? grabFleet(toCells(e.clientX, e.clientY)) : null;
  gesture.aim = id ? { id, at: null, started: false } : null;
  try {
    e.currentTarget.setPointerCapture(e.pointerId);
  } catch {}
});
$('map').addEventListener('pointermove', (e) => {
  const p = gesture.pts.get(e.pointerId);
  if (!p) return;
  const r = e.currentTarget.getBoundingClientRect();
  const pts = [...gesture.pts.values()];
  if (pts.length === 1) {
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (!gesture.moved && Math.hypot(dx, dy) < 8) return; // petit tremblement : c'est encore un toucher
    gesture.moved = true;
    if (gesture.aim) {
      // Visée : la vue ne bouge pas, un trait suit le doigt jusqu'à la cible.
      if (!gesture.aim.started) {
        gesture.aim.started = true;
        if (etat.selFleet !== gesture.aim.id) selectFleet(gesture.aim.id);
        else closeMenu();
      }
      gesture.aim.at = toCells(e.clientX, e.clientY);
      gesture.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      return;
    }
    closeMenu(); // le menu est posé sur un point de la carte : il ne suit pas la vue
    const c = cellCss();
    zoom.x -= dx / c;
    zoom.y -= dy / c;
    clampZoom();
  } else if (pts.length === 2) {
    gesture.moved = true;
    gesture.aim = null;
    closeMenu();
    const other = pts.find((q) => q !== p);
    const before = Math.hypot(p.x - other.x, p.y - other.y);
    const after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
    // Le point entre les deux doigts suit les doigts ; l'écart des doigts donne le zoom.
    const mx0 = (p.x + other.x) / 2 - r.left;
    const my0 = (p.y + other.y) / 2 - r.top;
    const mx1 = (e.clientX + other.x) / 2 - r.left;
    const my1 = (e.clientY + other.y) / 2 - r.top;
    if (before > 0) zoomAt(after / before, mx0, my0);
    const c = cellCss();
    zoom.x -= (mx1 - mx0) / c;
    zoom.y -= (my1 - my0) / c;
    clampZoom();
  }
  gesture.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
});
$('map').addEventListener('pointerup', (e) => {
  gesture.pts.delete(e.pointerId);
  const aim = gesture.aim;
  if (gesture.pts.size) return;
  gesture.aim = null;
  if (aim?.started) dropFleet(aim.id, toCells(e.clientX, e.clientY));
});
$('map').addEventListener('pointercancel', (e) => {
  gesture.pts.delete(e.pointerId);
  if (!gesture.pts.size) gesture.aim = null;
});
$('map').addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    closeMenu();
    const r = e.currentTarget.getBoundingClientRect();
    zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
  },
  { passive: false },
);
clampZoom();

/**
 * Toucher la carte (D-126). Ce qui est sous le doigt est cherché avec un aimant (`js/aim.js`) ;
 * plusieurs objets presque aussi près : un menu au doigt pour choisir, au lieu de deviner.
 * Sans flotte sélectionnée : une de mes flottes la sélectionne, une planète ouvre sa fiche.
 * Flotte sélectionnée : la retoucher la relâche, une autre de mes flottes ouvre le menu « Fusionner » (ou
 * « Rejoindre et fusionner ») / « Choisir » (D-159), ailleurs
 * c'est sa cible (un seul ordre possible : il part ; plusieurs : menu au doigt).
 */
$('map').addEventListener('click', (e) => {
  if (!etat.session?.state) return;
  if (gesture.moved) return; // fin d'un glissé, d'un pincement ou d'une visée, pas un toucher
  if (etat.menu) return closeMenu(); // toucher à côté du menu le ferme, sans rien faire d'autre
  const at = toCells(e.clientX, e.clientY);
  const fid = etat.selFleet && etat.session.myFleet(etat.selFleet) ? etat.selFleet : null;
  const t = readTap(mapItems(), at, cellCss(), fid);
  if (t.kind === 'many') {
    if (!fid) return openMenu(at, t.list.flatMap((it) => actionsFor(null, it, at)), { title: 'Lequel ?' });
    return orderAt(fid, t, at);
  }
  const it = t.kind === 'one' ? t.it : null;
  // Une autre de mes flottes, flotte choisie : menu « Fusionner / Rejoindre et fusionner / Choisir » (D-159).
  if (it?.type === 'mine' && (!fid || it.id === fid)) return selectFleet(it.id === fid ? null : it.id);
  if (fid) return orderAt(fid, t, at);
  if (it?.type === 'planet') return showPlanet(it.w);
  etat.selected = null;
  renderPick();
});

$('map-menu').addEventListener('click', (e) => {
  if (e.target.closest('[data-mm-close]')) return closeMenu();
  const o = etat.menu?.items[Number(e.target.closest('[data-mm]')?.dataset.mm)];
  if (!o) return;
  closeMenu();
  o.run();
});
// Échap ou un toucher hors de la carte ferment le menu.
document.addEventListener('keydown', (e) => e.key === 'Escape' && closeMenu());
document.addEventListener('click', (e) => {
  if (etat.menu && !e.target.closest('#map-menu, #map')) closeMenu();
});

$('map-fleets').addEventListener('click', (e) => {
  if (!etat.session?.state) return;
  const me = etat.session.state.players[etat.session.me];
  // Construire : la fiche de la planète s'ouvre sur son chantier (×1, ×5, ×N, D-106).
  const build = e.target.closest('[data-mp-build]')?.dataset.mpBuild;
  if (build) {
    const pl = etat.session.planetOf(me, build);
    if (!pl) return;
    etat.selected = { x: pl.cell.x, y: pl.cell.y };
    renderPick();
    $('pi-yard').scrollIntoView({ block: 'nearest' });
    return;
  }
  // Décoller : le formulaire de décollage de cette planète, directement.
  const go = e.target.closest('[data-mp-go]')?.dataset.mpGo;
  if (go) {
    etat.selected = null;
    renderPick();
    openFleetSheet(go);
    return;
  }
  // Ailleurs sur la case d'une planète : sa fiche, comme en la touchant sur la carte.
  const tile = e.target.closest('[data-planet]')?.dataset.planet;
  const pl = tile && etat.session.planetOf(me, tile);
  if (pl) {
    etat.selected = { x: pl.cell.x, y: pl.cell.y };
    return renderPick();
  }
  const id = e.target.closest('[data-fleet]')?.dataset.fleet;
  if (!id) return;
  etat.selFleet = etat.selFleet === id ? null : id; // retoucher la flotte choisie la relâche
  closeMenu();
  const spot = etat.selFleet && fleetSpots(etat.session.now()).find((x) => x.p.id === etat.session.me && x.f.id === etat.selFleet);
  if (spot) reveal(spot.x, spot.y); // carte zoomée : la flotte choisie revient dans la vue
  renderFleetInfo();
  renderMapFleets();
});

$('btn-fi-stop').onclick = () => etat.session.stopFleet(etat.selFleet) && renderFleetInfo();
$('btn-fi-stance').onclick = () => {
  const f = etat.session.myFleet(etat.selFleet);
  if (f && etat.session.setFleetStance(etat.selFleet, aggressive(f) ? 'passive' : 'aggressive')) {
    toast(`Flotte ${aggressive(f) ? 'agressive : elle combattra toute flotte ennemie qu’elle croise' : 'passive : elle ne combattra que sur ordre'}.`);
    renderFleetInfo();
  }
};
$('btn-fi-refuel').onclick = () => etat.session.refuelFleet(etat.selFleet) && renderFleetInfo();
$('btn-fi-return').onclick = () => etat.session.returnFleet(etat.selFleet) && renderFleetInfo();
$('btn-fi-dock').onclick = () => {
  const f = etat.session.myFleet(etat.selFleet);
  if (f) etat.session.moveFleet(etat.selFleet, f.to, 'dock');
  renderFleetInfo();
};
$('btn-fi-close').onclick = () => selectFleet(null);

// ---------------------------------------------------------------------------
// Échanges entre joueurs
// ---------------------------------------------------------------------------

for (const box of ['fi-partners', 'planet-partners']) {
  $(box).addEventListener('click', (e) => {
    const raw = e.target.closest('[data-trade]')?.dataset.trade;
    if (raw) openTradeSheet(JSON.parse(raw));
  });
}
$('btn-trade-close').onclick = () => ($('sheet-trade').hidden = true);
$('btn-trade-go').onclick = () => {
  if (!etat.tradeSheet) return;
  const ok = etat.session.proposeTrade(etat.tradeSheet.from, { pid: etat.tradeSheet.pid, ...etat.tradeSheet.ref }, readTrade('tgive'), readTrade('twant'));
  if (!ok) return;
  $('sheet-trade').hidden = true;
  toast('Échange proposé : réponse sous 5 minutes.');
};

$('trades').addEventListener('click', (e) => {
  const acc = e.target.closest('[data-accept]')?.dataset.accept;
  const ref = e.target.closest('[data-refuse]')?.dataset.refuse;
  const [pid, id] = (acc || ref || '').split(':');
  if (pid && id) etat.session.answerTrade(pid, id, !!acc);
});

$('fi-beside').addEventListener('click', (e) => {
  const give = e.target.closest('[data-give]')?.dataset.give;
  const into = e.target.closest('[data-merge]')?.dataset.merge;
  if (give) openMoveSheet('give', give);
  // « Fusionner ici » : l'autre flotte rejoint celle qui est sélectionnée.
  if (into && etat.session.mergeFleets(into, etat.selFleet)) renderFleetInfo();
});

$('btn-fi-split').onclick = () => openMoveSheet('split');
$('btn-move-close').onclick = () => {
  $('sheet-move').hidden = true;
  etat.moveSheet = null;
};
$('btn-move-go').onclick = () => {
  const part = { ships: {}, cargo: {}, fuel: 0 };
  for (const el of document.querySelectorAll('[data-mship]')) part.ships[el.dataset.mship] = Math.max(0, Math.floor(Number(el.value) || 0));
  for (const el of document.querySelectorAll('[data-mcargo]')) part.cargo[el.dataset.mcargo] = Math.max(0, Math.floor(Number(el.value) || 0));
  part.fuel = Math.max(0, Math.floor(Number(document.querySelector('[data-mfuel]')?.value) || 0));
  const ok = etat.moveSheet?.kind === 'give' ? etat.session.transferFleet(etat.moveSheet.from, etat.moveSheet.to, part) : etat.session.splitFleet(etat.moveSheet?.from, part);
  if (!ok) return refreshMoveSheet();
  $('sheet-move').hidden = true;
  etat.moveSheet = null;
  renderFleetInfo();
};
$('btn-ready').onclick = (e) => {
  if (!etat.session?.state) return;
  etat.session.ready(e.currentTarget.dataset.on === '1');
  etat.session.checkStart(); // seul présent : le départ part tout de suite
  renderPick();
};
$('btn-pick-fleet').onclick = (e) => {
  const id = e.currentTarget.dataset.fleet;
  if (!id) return;
  etat.selFleet = id;
  etat.selected = null;
  showView('map');
  const spot = fleetSpots(etat.session.now()).find((x) => x.p.id === etat.session.me && x.f.id === id);
  if (spot) reveal(spot.x, spot.y);
  renderPick();
  renderFleetInfo();
  renderMapFleets();
};
$('btn-pick-invite').onclick = () => openInviteSheet();
$('btn-pick-bot').onclick = () => {
  if (!etat.session?.state) return;
  const bot = addBot(etat.session);
  toast(bot ? `${bot.name} rejoint la partie : elle joue sur ce téléphone.` : 'La partie est complète (8 joueurs).');
  renderPick();
};
$('pick-who').addEventListener('click', (e) => {
  const el = e.target.closest('[data-bot]');
  if (el) openBotSheet(el.dataset.bot);
});
$('bot-races').addEventListener('click', (e) => {
  const el = e.target.closest('[data-botrace]');
  if (!el) return;
  etat.botRace = el.dataset.botrace;
  for (const b of document.querySelectorAll('[data-botrace]')) b.setAttribute('aria-checked', String(b.dataset.botrace === etat.botRace));
});
$('btn-bot-close').onclick = () => ($('sheet-bot').hidden = true);
$('btn-bot-save').onclick = () => {
  const pid = etat.botSheet;
  if (!editableBot(etat.session, pid)) return ($('sheet-bot').hidden = true);
  const name = $('bot-name').value.trim();
  if (!name) {
    // Nom vide : refusé, l'IA garde le sien.
    $('bot-name').value = etat.session.state.players[pid].name;
    return toast('Le nom ne peut pas être vide : l’IA garde le sien.');
  }
  renameBot(etat.session, pid, name);
  setBotRace(etat.session, pid, etat.botRace);
  $('sheet-bot').hidden = true;
  renderPick();
};
$('btn-bot-remove').onclick = () => {
  const pid = etat.botSheet;
  const name = etat.session.state.players[pid]?.name;
  $('sheet-bot').hidden = true;
  if (removeBot(etat.session, pid)) toast(`${name} quitte la partie.`);
  renderPick();
};

$('pi-ships').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-pi-ship]');
  const key = $('btn-open-planet').dataset.key;
  if (!btn || btn.disabled || !etat.session?.state) return;
  const me = etat.session.state.players[etat.session.me];
  const pl = etat.session.planetOf(me, key);
  if (!pl) return;
  const n = btn.dataset.n === 'max' ? shipsAffordable(me.race, btn.dataset.piShip, stateAt(pl.planet, etat.session.now()).stock) : Number(btn.dataset.n);
  if (n < 1) return;
  // Même choix que l'onglet de la planète (D-312) : tout de suite, ou au fil.
  if (btn.dataset.mode === 'plan') etat.session.planShips(btn.dataset.piShip, n, key);
  else etat.session.buildShips(btn.dataset.piShip, n, key);
});
$('btn-pi-takeoff').onclick = (e) => {
  const key = e.currentTarget.dataset.key || 'home';
  etat.selected = null; // la fiche de la planète se ferme, le formulaire de décollage prend sa place
  renderPick();
  openFleetSheet(key);
};
$('btn-planet-close').onclick = closePlanetSheet;

$('btn-claim').onclick = () => {
  const w = etat.selected && etat.session.planets.find((x) => sameCell(x, etat.selected));
  const f = myColonizer(etat.session.state.players[etat.session.me]);
  if (!w || !f || !etat.session.moveFleet(f.id, { x: w.x, y: w.y }, 'colonize')) return;
  etat.selected = null;
  etat.selFleet = f.id; // la flotte reste choisie : on la voit partir
  renderPick();
  renderFleetInfo();
  renderMapFleets();
};

// ---------------------------------------------------------------------------
// Démarrage : lien d'invitation dans l'adresse ?
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Lecture seule (D-139) : index.html?view montre une partie enregistrée par un scénario de test,
// image par image, avec le vrai écran du jeu. La page qui l'embarque (le rapport du test, même
// origine) envoie chaque image par postMessage : { astraView: { state, me, t, intel, selected, view } }.
// Pas de réseau, pas de sauvegarde, horloge arrêtée à l'heure de l'image, rien n'est écrit.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// « Retour » pendant une partie en cours (D-417) : une entrée d'historique « garde » au-dessus
// de la page ; un retour la consomme et on demande « Quitter la partie en cours ? ». Une fenêtre
// ouverte se ferme d'abord. Le lobby et l'écran de fin laissent le retour faire comme avant.
// ---------------------------------------------------------------------------

if (!VIEW) {
  addEventListener('popstate', () => {
    if (!etat.backArmed) return; // retour hors de notre garde : rien à faire
    etat.backArmed = false;
    if (etat.leaving) return;
    const open = topSheet(); // la fenêtre du dessus, comme Échap (D-192)
    const action = backAction({ status: etat.session?.status, startedAt: etat.session?.startedAt, over: etat.session?.over, gameShown: !$('screen-game').hidden, sheetOpen: !!open });
    if (action === 'close') {
      open.querySelector('.close-btn')?.click();
      armBack();
    } else if (action === 'ask') {
      $('sheet-quit').hidden = false; // garde pas reposée : un 2ᵉ retour ici quitte
    }
  });
  addEventListener('beforeunload', (e) => {
    if (etat.leaving || !$('sheet-quit').hidden || !inGame()) return;
    e.preventDefault();
    e.returnValue = '';
  });
  addEventListener('pagehide', () => clearTimeout(etat.leaveTimer));
  addEventListener('pageshow', (e) => e.persisted && (etat.leaving = false)); // revenu par « avancer » : la garde revient
}
$('btn-quit-close').onclick = stayInGame;
$('btn-quit-stay').onclick = stayInGame;
$('btn-quit-go').onclick = () => {
  etat.leaving = true;
  $('sheet-quit').hidden = true;
  history.back(); // comme le retour d'avant : page précédente, ou l'appli se ferme
  // Rien avant nous (appli installée, onglet neuf) : retour à l'accueil, la partie reste enregistrée.
  etat.leaveTimer = setTimeout(() => location.replace(location.pathname), 600);
};

if (VIEW) {
  document.documentElement.classList.add('view-only');
  addEventListener('message', (e) => {
    if (e.origin !== location.origin || !e.data?.astraView) return;
    try {
      showSnapshot(e.data.astraView);
    } catch (err) {
      console.error(err);
      document.body.dataset.viewError = err.message;
    }
  });
  parent.postMessage({ astraViewReady: true }, location.origin);
} else {
  showSaved();
  boot();
  // Lien d'invitation ouvert alors que l'appli est déjà affichée dans cet onglet.
  window.addEventListener('hashchange', () => location.hash.length > 1 && !etat.session && boot());

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
