import { Session } from './session.js';
import { loadGame, listGames, selectGame, forgetGame, describeSave } from './save.js';
import { inviteLink, drawQr, decode } from './invite.js';
import { scanQr } from './scanner.js';
import {
  RACES, RACE_KEYS, RES_INFO, resIcon, raceIcon, POWERS, POWER_KEYS, stateAt, upgradeCost, buildDuration, covers, score, power,
  powerReadyAt, powerCost, liftGain, fmt, UNIVERSE, SOIL, sameCell, sunFor, climateName, kindLabel, usedPlaces, TEMPO, frostLine, planForecast, PLAN_MAX,
  shipsAffordable,
} from './game.js';
import { drawSun } from './sky.js';
import { ic, fillIcons } from './icons.js';
import { startGalaxy } from './galaxy.js';
import { TECHS, SHIPS, SHIP_KEYS, techCost, techMissing, researchDuration, shipUnlock, shipUnlocked, shipStats, shipDuration } from './tech.js';
import { TRADE_RES, TRADE_NAMES } from './trade.js';
import { ORDERS, countShips, fleetCargo, fleetPos, fleetTank, fleetBurn, fleetSpeed, slowestShip, fuelAt, moving, aggressive, armed } from './fleet.js';

fillIcons(); // les icônes du HTML statique, avant tout le reste
startGalaxy();

// Haut de l'écran de la planète : nom, gisements et stocks se collent sous la
// barre au même endroit, le suivant recouvrant le précédent ; les onglets se
// collent sous les stocks. À la fin, on voit toujours les stocks et les onglets.
const [BAR, ...STICKY] = ['.topbar', '.planet-head', '#soil-zone', '#resources'].map((q) => document.querySelector(q));
const TABS = document.querySelector('.tabs');
function stackSticky() {
  const top = BAR.offsetHeight;
  for (const el of STICKY) el.style.top = `calc(${top}px + env(safe-area-inset-top, 0px))`;
  TABS.style.top = `calc(${top + STICKY[STICKY.length - 1].offsetHeight}px + env(safe-area-inset-top, 0px))`;
  const edge = BAR.getBoundingClientRect().bottom + 1;
  // Un bloc arrivé en haut cache tous ceux d'avant (sinon les plus grands dépasseraient dessous).
  const stuck = STICKY.filter((el) => el.offsetHeight && el.getBoundingClientRect().top <= edge);
  const last = stuck[stuck.length - 1];
  for (const el of STICKY) el.classList.toggle('sticky-covered', stuck.includes(el) && el !== last);
}
const stack = new ResizeObserver(stackSticky);
for (const el of [BAR, ...STICKY, TABS]) stack.observe(el);
addEventListener('scroll', stackSticky, { passive: true });

const DRY = 1e-6; // en dessous, un réservoir est vide

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

let session = null;
// Accès depuis la console du navigateur, pour déboguer : astra.session
window.astra = { get session() { return session; } };
let liveTimer = null;
let warnedOutdated = false;
let wakeLock = null;

// ---------------------------------------------------------------------------
// Utilitaires d'interface
// ---------------------------------------------------------------------------

function show(screen) {
  for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== `screen-${screen}`;
  window.scrollTo(0, 0);
}

/**
 * Messages en bas de l'écran, à la file : un à la fois, dans l'ordre, aucun
 * n'en efface un autre (D-110). Des messages attendent : chacun reste moins
 * longtemps. Appli cachée : rien n'est montré, le journal garde les combats.
 */
const toasts = [];
let toastTimer = null;
function toast(text, ms = 3200) {
  if (document.visibilityState === 'hidden') return;
  if (toasts.some((t) => t.text === text) || (toastTimer && $('toast').textContent === text)) return;
  toasts.push({ text, ms });
  if (toasts.length > 6) toasts.splice(Math.max(0, toasts.findIndex((t) => t.ms <= 3200)), 1); // les longs (élimination) restent
  if (!toastTimer) nextToast();
}
function nextToast() {
  const t = $('toast');
  const next = toasts.shift();
  t.hidden = !next;
  if (!next) return (toastTimer = null);
  t.textContent = next.text;
  toastTimer = setTimeout(nextToast, toasts.length ? Math.max(2000, next.ms / 2) : next.ms);
}

async function copy(text, okMessage) {
  try {
    await navigator.clipboard.writeText(text);
    toast(okMessage);
  } catch {
    toast('Copie impossible ici : appuie longuement sur le texte pour le copier.');
  }
}

async function share(text, title) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return;
    } catch (e) {
      if (e?.name === 'AbortError') return;
    }
  }
  copy(text, 'Copié. Colle-le dans ta messagerie.');
}

function playerName() {
  const v = $('name').value.trim().slice(0, 16);
  if (!v) {
    $('name').focus();
    toast("Choisis d'abord ton nom de commandant.");
    return null;
  }
  try {
    localStorage.setItem('astra.name', v);
  } catch {}
  return v;
}

async function keepAwake() {
  try {
    if ('wakeLock' in navigator && document.visibilityState === 'visible') {
      wakeLock = await navigator.wakeLock.request('screen');
    }
  } catch {}
}
document.addEventListener('visibilitychange', () => {
  if (session && document.visibilityState === 'visible' && (!wakeLock || wakeLock.released)) keepAwake();
});

// Caméra -----------------------------------------------------------------

let scanAbort = null;
async function scan() {
  $('scanner').hidden = false;
  scanAbort = new AbortController();
  try {
    return await scanQr($('scanner-video'), { signal: scanAbort.signal });
  } finally {
    $('scanner').hidden = true;
    scanAbort = null;
  }
}
$('btn-scan-cancel').onclick = () => scanAbort?.abort();

// ---------------------------------------------------------------------------
// Accueil
// ---------------------------------------------------------------------------

try {
  $('name').value = localStorage.getItem('astra.name') || '';
} catch {}

for (const el of document.querySelectorAll('[data-go]')) {
  el.onclick = () => {
    session?.end?.();
    session = null;
    show(el.dataset.go);
    showSaved();
  };
}

// Historique des parties de ce téléphone : en reprendre une, la revoir, l'oublier.
function whenText(at) {
  const when = new Date(at);
  const time = when.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (when.toDateString() === new Date().toDateString()) return time;
  return `${when.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} ${time}`;
}

function showSaved() {
  const games = listGames();
  $('saved').hidden = !games.length;
  $('btn-create').className = games.length ? 'secondary' : 'primary';
  $('games').innerHTML = games
    .map((g) => {
      const d = describeSave(g);
      const gid = esc(g.state.gid);
      return `<li class="game-row card">
        <div class="g-main">
          <span class="g-names">${d.names.map((n) => (n === d.me ? `<strong>${esc(n)}</strong>` : esc(n))).join(' · ')}</span>
          <span class="g-when mono">${whenText(d.savedAt)}</span>
        </div>
        <button class="primary icon-only" data-resume="${gid}" title="Reprendre" aria-label="Reprendre la partie">${ic('play')}</button>
        <button class="secondary icon-only" data-replay="${gid}" title="Revoir" aria-label="Revoir la partie">${ic('replay')}</button>
        <button class="ghost icon-only" data-forget="${gid}" title="Oublier" aria-label="Oublier la partie">${ic('close')}</button>
      </li>`;
    })
    .join('');
}

$('games').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-resume], [data-replay], [data-forget]');
  if (!btn) return;
  const { resume, replay, forget } = btn.dataset;
  if (forget) {
    forgetGame(forget);
    return showSaved();
  }
  const saved = selectGame(resume || replay);
  if (!saved) return showSaved();
  if (replay) return (location.href = 'replay.html');
  session = Session.resume(saved);
  session.ontoast = toast;
  session.onchange = onSessionChange;
  startGame();
  toast('Partie reprise.');
  // Les combats rattrapés à la reprise ont été notés avant que l'écran existe, ceux d'avant la
  // fermeture (appli en arrière-plan) n'ont pas été lus : le résumé montre tout ce qui n'est pas lu.
  awayFrom = saved.journal?.read || 0;
  showAbsence(Date.now() - saved.savedAt);
});

window.addEventListener('pagehide', () => session?.save?.());

$('btn-create').onclick = async () => {
  const name = playerName();
  if (!name) return;
  session = await Session.create(name);
  session.ontoast = toast;
  session.onchange = onSessionChange;
  startGame();
};

$('btn-join').onclick = () => {
  if (!playerName()) return;
  startJoin();
};

// ---------------------------------------------------------------------------
// Rejoindre (joueur)
// ---------------------------------------------------------------------------

function startJoin(prefill) {
  $('join-step-1').hidden = false;
  $('join-step-2').hidden = true;
  $('join-error').hidden = true;
  $('offer-input').value = prefill || '';
  show('join');
  if (prefill) useOffer(prefill);
}

function joinError(msg) {
  $('join-error').textContent = msg;
  $('join-error').hidden = false;
}

$('btn-scan-offer').onclick = async () => {
  try {
    useOffer(await scan());
  } catch (e) {
    if (e?.name !== 'AbortError') joinError(e.message);
  }
};
$('btn-offer-ok').onclick = () => useOffer($('offer-input').value);

let answerCode = '';
async function useOffer(text) {
  $('join-error').hidden = true;
  const name = playerName();
  if (!name) return show('home');
  if (!session || session.status === 'playing') {
    // Rejoindre une autre partie (ou les autres, si on était resté seul) :
    // on quitte la copie locale, l'identité est gardée pour revenir.
    session?.end();
    session = new Session(name);
    session.ontoast = toast;
    session.onchange = onSessionChange;
  }
  try {
    $('join-status').textContent = 'Préparation de ta réponse…';
    answerCode = await session.answer(text);
  } catch (e) {
    return joinError(e.message);
  }
  drawQr($('answer-qr'), answerCode);
  $('join-step-1').hidden = true;
  $('join-step-2').hidden = false;
  $('join-status').textContent = 'En attente de la personne qui t’invite…';
}

$('btn-copy-answer').onclick = () => copy(answerCode, 'Réponse copiée. Envoie-la à la personne qui t’invite.');
$('btn-share-answer').onclick = () => share(answerCode, 'Ma réponse Astra');

function onSessionChange() {
  const s = session;
  if (!s) return;
  if (s.status === 'waiting') {
    $('join-status').textContent = 'Connecté. Arrivée dans la partie…';
  }
  if (s.status === 'failed') {
    $('join-step-1').hidden = false;
    $('join-step-2').hidden = true;
    joinError(`${s.failure} Demande une nouvelle invitation à n’importe quel joueur et scanne-la.`);
    show('join');
  }
  if (s.status === 'refused') {
    joinError(s.refusal || 'Ta demande a été refusée.');
    $('join-status').textContent = '';
    show('join');
  }
  if (s.status === 'playing' && $('screen-game').hidden && $('screen-race').hidden) startGame();
  if (!$('screen-race').hidden) renderRaceOthers();
  if (!$('screen-game').hidden) renderState();
}

// Resté seul : la partie continue ici ; ce bouton permet de rejoindre les autres.
$('btn-rejoin').onclick = () => {
  stopGame();
  startJoin();
};

// ---------------------------------------------------------------------------
// Invitations (tout le monde peut inviter)
// ---------------------------------------------------------------------------

let offerCode = '';

async function openInviteSheet() {
  $('sheet-invite').hidden = false;
  if (!connecting) $('invite-status').textContent = '';
  $('answer-input').value = '';
  $('offer-qr').hidden = true;
  $('offer-wait').hidden = false;
  try {
    offerCode = await session.openInvite();
  } catch (e) {
    $('offer-wait').textContent = e.message;
    return;
  }
  drawQr($('offer-qr'), inviteLink(offerCode));
  $('offer-qr').hidden = false;
  $('offer-wait').hidden = true;
}

function closeInviteSheet() {
  $('sheet-invite').hidden = true;
}

// Fenêtre des joueurs : qui est en ligne, le classement, et inviter.
$('net').onclick = () => {
  $('sheet-players').hidden = false;
  renderLive();
};
$('btn-players-close').onclick = () => ($('sheet-players').hidden = true);
$('btn-invite').onclick = () => {
  $('sheet-players').hidden = true;
  openInviteSheet();
};
$('btn-invite-close').onclick = () => {
  session.cancelInvite();
  closeInviteSheet();
};
$('btn-copy-offer').onclick = () => copy(inviteLink(offerCode), 'Lien copié. Envoie-le au joueur.');
$('btn-share-offer').onclick = () => share(inviteLink(offerCode), 'Rejoins ma partie Astra');

let connecting = false;
function setInviteBusy(busy) {
  connecting = busy;
  for (const id of ['btn-scan-answer', 'btn-answer-ok']) $(id).disabled = busy;
}

async function useAnswer(text) {
  if (connecting) return;
  setInviteBusy(true);
  $('invite-status').textContent = 'Connexion en cours…';
  try {
    await session.acceptAnswer(text);
    $('invite-status').textContent = '';
    closeInviteSheet();
    toast('Joueur connecté.');
  } catch (e) {
    if (e.used || /connexion/i.test(e.message)) {
      // L'invitation est consommée : on en prépare une neuve, à faire rescanner.
      await openInviteSheet();
      $('invite-status').textContent = e.used
        ? 'Cette invitation avait déjà servi. Nouvelle invitation prête : le joueur doit rescanner ce QR code, puis te montrer sa nouvelle réponse.'
        : 'La connexion n’a pas abouti. Nouvelle invitation prête : le joueur doit rescanner ce QR code. Si ça recommence en 4G, essayez sur le même Wi-Fi ou le partage de connexion.';
    } else {
      $('invite-status').textContent = e.message;
    }
  } finally {
    setInviteBusy(false);
  }
}

$('btn-scan-answer').onclick = async () => {
  if (connecting) return;
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

let pickedRace = null;

function showRace() {
  pickedRace = RACE_KEYS[0];
  $('races').innerHTML = RACE_KEYS.map(
    (k) => `<button class="race" role="radio" aria-checked="false" data-race="${k}" style="--race:${RACES[k].color}">
      ${raceIcon(k)}<span class="race-name">${RACES[k].name}</span>
    </button>`,
  ).join('');
  updateRacePick();
  renderRaceOthers();
  show('race');
}

/** La race choisie est cochée, et seule sa fiche s'affiche. */
function updateRacePick() {
  for (const el of document.querySelectorAll('[data-race]')) el.setAttribute('aria-checked', String(el.dataset.race === pickedRace));
  const R = RACES[pickedRace];
  const res = R.resources.map((r) => `<span class="chip ${r}">${resIcon(r)}${RES_INFO[r].name}</span>`).join('');
  $('race-detail').style.setProperty('--race', R.color);
  $('race-detail').innerHTML = `<p class="race-pitch">${esc(R.pitch)}</p>
    <ul class="race-traits">${R.traits.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
    <span class="chips">${res}${R.pop ? `<span class="chip pop">${resIcon('pop', R.pop.label)}${R.pop.label}</span>` : '<span class="chip none">Sans population</span>'}</span>`;
  // Le premier arrivé ouvre la partie ; les suivants la rejoignent.
  const players = Object.values(session?.state?.players || {});
  const first = !players.some((p) => p.id !== session.me && p.rank < session.state.players[session.me]?.rank);
  $('btn-race').innerHTML = first ? `${ic('play')}Commencer la partie` : `${ic('join')}Rejoindre la partie`;
}

/** Ce qu'ont choisi les autres, pour se décider. */
function renderRaceOthers() {
  if (!session?.state) return;
  const others = Object.values(session.state.players).filter((p) => p.id !== session.me);
  $('race-others').innerHTML = others
    .map((p) => `<span class="other">${p.race ? raceIcon(p.race) : ''}${esc(p.name)}</span>`)
    .join('');
}

$('races').addEventListener('click', (e) => {
  const el = e.target.closest('[data-race]');
  if (!el) return;
  pickedRace = el.dataset.race;
  updateRacePick();
});

$('btn-race').onclick = () => {
  if (!pickedRace || !session) return;
  if (!session.chooseRace(pickedRace)) return;
  startGame();
};

// ---------------------------------------------------------------------------

function startGame() {
  if (!session.myRace) return showRace();
  show('game');
  buildStatic();
  selected = null;
  showView('map');
  // Le rafraîchissement d'abord : un premier rendu qui échouerait ne doit pas figer l'écran.
  clearInterval(liveTimer);
  liveTimer = setInterval(renderLive, 200);
  renderState();
  keepAwake();
}

function stopGame() {
  stopMap();
  clearInterval(liveTimer);
  liveTimer = null;
  wakeLock?.release?.().catch(() => {});
  wakeLock = null;
}

/** Interface construite pour cette race (les tuiles et bâtiments en dépendent). */
let builtFor = null;

function buildStatic() {
  const race = session.myRace;
  const R = RACES[race];
  builtFor = race;
  const tiles = R.resources.map(
    (r) => `<div class="tile ${r}" title="${RES_INFO[r].name}">${spark(r)}
      <span class="label">${resIcon(r)}</span>
      <span class="amount mono" data-res="${r}">0</span>
      <span class="rate mono" data-rate="${r}"></span>
      <div class="gauge"><div class="gauge-fill" data-gauge="${r}"></div></div>
    </div>`,
  );
  if (R.pop) {
    tiles.push(`<div class="tile pop" title="${R.pop.label}">${spark('pop')}<span class="label">${resIcon('pop', R.pop.label)}</span>
      <span class="amount mono" data-pop></span>
      <span class="rate mono" data-poprate></span>
      <span class="rate mono" data-popextra></span>
      <div class="gauge"><div class="gauge-fill" data-popgauge></div></div></div>`);
  } else {
    tiles.push(`<div class="tile grid" title="Réseau électrique">${spark('grid')}<span class="label">${resIcon('energy', 'Réseau')}Réseau</span>
      <span class="amount mono" data-grid></span>
      <span class="rate mono" data-gridrate></span>
      <span class="rate mono" data-gridextra></span></div>`);
  }
  $('resources').innerHTML = tiles.join('');
  $('soil').innerHTML = soilTiles('soil');
  drawSparks();

  $('buildings').innerHTML = Object.entries(R.buildings)
    .map(
      ([k, b]) => `<article class="building card" data-card="${k}">
      ${cardHead(b.name, `data-level="${k}"`)}
      <p class="cost mono" data-cost="${k}"></p>
      <button class="secondary small" data-build="${k}">${ic('up')}</button>
      <p class="b-desc">${esc(b.desc)} <button class="ghost small b-down" data-demolish="${k}">Déconstruire un niveau</button></p>
      <div class="card-bar" hidden><div class="bar-fill"></div></div>
    </article>`,
    )
    .join('');

  $('techs').innerHTML = Object.entries(TECHS[race])
    .map(
      ([k, t]) => `<article class="building card" data-tcard="${k}">
      ${cardHead(t.name, `data-tlevel="${k}"`)}
      <p class="cost mono"><span data-tcost="${k}"></span> <span class="req" data-treq="${k}" hidden></span></p>
      <button class="secondary small" data-research="${k}">${ic('up')}</button>
      <p class="b-desc">${esc(t.desc)}</p>
      <div class="card-bar" hidden><div class="bar-fill"></div></div>
    </article>`,
    )
    .join('');

  $('ships').innerHTML = SHIP_KEYS.map((k) => {
    const S = SHIPS[race][k];
    return `<article class="building card" data-scard="${k}">
      ${cardHead(S.name, `data-sdocked="${k}"`)}
      <p class="cost mono"><span data-scost="${k}"></span> <span class="req" data-sreq="${k}" hidden></span></p>
      <div class="ship-actions">
        <button class="secondary small" data-ship="${k}" data-n="1" aria-label="Construire 1 ${esc(S.name)}">×1</button>
        <button class="secondary small" data-ship="${k}" data-n="5" aria-label="Construire 5 ${esc(S.name)}">×5</button>
      </div>
      <p class="ship-stats b-desc" data-sstats="${k}"></p>
      <div class="card-bar" hidden><div class="bar-fill"></div></div>
    </article>`;
  }).join('');

  // Chantier de la fiche planète, sur la carte : une ligne par vaisseau.
  $('pi-ships').innerHTML = SHIP_KEYS.map((k) => {
    const S = SHIPS[race][k];
    return `<div class="pi-ship" data-piship="${k}">
      <div class="pi-ship-main"><span class="p-name">${esc(S.name)}</span> <span class="cost mono" data-picost="${k}"></span> <span class="hint mono" data-pinote="${k}"></span></div>
      <div class="ship-actions">
        <button class="secondary small" data-pi-ship="${k}" data-n="1" aria-label="Construire 1 ${esc(S.name)}">×1</button>
        <button class="secondary small" data-pi-ship="${k}" data-n="5" aria-label="Construire 5 ${esc(S.name)}">×5</button>
        <button class="secondary small" data-pi-ship="${k}" data-n="max" aria-label="Construire autant de ${esc(S.name)} que possible">Max</button>
      </div>
    </div>`;
  }).join('');

  $('powers-zone').hidden = race !== 'alien';
  // Les pouvoirs ont leur onglet, chez les aliens seulement.
  $('tab-power').hidden = race !== 'alien';
  if (race !== 'alien' && $('view-planet').dataset.tab === 'power') showTab('build');
  $('powers').innerHTML =
    race === 'alien'
      ? POWER_KEYS.map(
          (k) => `<article class="building power card" data-pcard="${k}">
        ${cardHead(POWERS[k].name, `data-pready="${k}"`)}
        <p class="cost mono" data-pcost="${k}"></p>
        <button class="secondary small" data-power="${k}">${ic('play')}</button>
        <p class="b-desc">${esc(POWERS[k].desc)}</p>
      </article>`,
        ).join('')
      : '';
}

/**
 * Tête d'une carte compacte : le nom (qu'on touche pour voir la description)
 * et un niveau ou un état à côté.
 */
const cardHead = (name, attr) =>
  `<div class="b-head"><button class="b-name" aria-expanded="false" title="Afficher le détail">${esc(name)}</button><span class="level mono" ${attr}></span></div>`;

// Toucher le nom d'une carte déplie ou replie sa description.
document.addEventListener('click', (e) => {
  const name = e.target.closest('.b-name');
  if (!name) return;
  const open = name.closest('.building').classList.toggle('open');
  name.setAttribute('aria-expanded', String(open));
});

/** Tuiles des gisements (minéraux et nourriture du sol), remplies par fillSoil. */
// Dans le sol, la nourriture n'est encore que de la biomasse : elle ne devient
// « nourriture » qu'une fois récoltée, dans les stocks du joueur.
const SOIL_NAMES = { food: 'Biomasse' };

function soilTiles(prefix) {
  return SOIL.map((r) => {
    const name = SOIL_NAMES[r] || RES_INFO[r].name;
    return `<div class="tile ${r}" data-${prefix}-tile="${r}">${prefix === 'soil' ? spark(`soil-${r}`) : ''}
      <span class="label">${resIcon(r, name)}${name}</span>
      <span class="amount mono" data-${prefix}-amount="${r}"></span>
      <span class="rate mono" data-${prefix}-rate="${r}"></span>
      <span class="rate mono" data-${prefix}-detail="${r}"></span>
      <div class="gauge"><div class="gauge-fill" data-${prefix}-gauge="${r}"></div></div>
    </div>`;
  }).join('');
}

/**
 * Gisements : ce qu'il reste dans le sol, et ce qu'on en tire. `soil` est
 * l'extraction en cours (null pour une planète libre).
 */
function fillSoil(prefix, nature, reserve, soil) {
  const q = (sel) => document.querySelector(sel);
  for (const r of SOIL) {
    const n = nature[r];
    const left = reserve[r];
    const empty = left < 1;
    const limited = !!soil && empty && soil[r].want > n.regen + 0.5;
    q(`[data-${prefix}-tile="${r}"]`).classList.toggle('empty', empty);
    q(`[data-${prefix}-amount="${r}"]`).innerHTML = withCap(left, n.max);
    q(`[data-${prefix}-gauge="${r}"]`).style.width = `${Math.min(100, (left / n.max) * 100)}%`;
    const rate = q(`[data-${prefix}-rate="${r}"]`);
    const detail = q(`[data-${prefix}-detail="${r}"]`);
    // Solde du gisement : ce qu'il produit de lui-même, moins ce qu'on en extrait.
    if (!soil) rate.textContent = 'Intact';
    else if (limited) rate.textContent = `Épuisé : ${fmt(n.regen * TEMPO)} / min`;
    else if (left >= n.max - 0.5 && soil[r].got <= n.regen) rate.textContent = 'Plein';
    else rate.textContent = rateText((n.regen - soil[r].got) * TEMPO);
    rate.classList.toggle('neg', limited || (!!soil && soil[r].got > n.regen + 0.5));
    detail.textContent = soil ? `−${fmt(soil[r].got * TEMPO)} +${fmt(n.regen * TEMPO)} / min` : `+${fmt(n.regen * TEMPO)} / min`;
    detail.title = soil ? `Extraction ${fmt(soil[r].got * TEMPO)} / min, régénération ${fmt(n.regen * TEMPO)} / min` : `Régénération ${fmt(n.regen * TEMPO)} / min`;
    rate.title = detail.title;
  }
}

$('powers').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-power]');
  if (btn && !btn.disabled) session.power(btn.dataset.power, openKey);
});
$('techs').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-research]');
  if (btn && !btn.disabled) session.research(btn.dataset.research, openKey);
});
$('ships').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-ship]');
  if (btn && !btn.disabled) session.buildShips(btn.dataset.ship, Number(btn.dataset.n), openKey);
});

// ---------------------------------------------------------------------------
// Historique des ressources : un mini-graphe discret dans chaque tuile
// ---------------------------------------------------------------------------
//
// Chaque téléphone relève ses propres valeurs toutes les 5 s et garde les
// 10 dernières minutes, pour la partie en cours (gardées au rechargement).

const HISTORY_KEY = 'astra.hist';
const SAMPLE_MS = 5000;
const HISTORY_MS = 10 * 60_000;
let hist = null; // { id, t: [instants], v: { clé: [valeurs] } } (pas « history » : ce nom est celui du navigateur)

const spark = (k) =>
  `<svg class="spark" data-spark="${k}" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><path class="spark-area"/><path class="spark-line"/></svg>`;

function sampleHistory(now, values, key) {
  const id = `${session.state.gid}|${session.me}|${key}`;
  if (hist?.id !== id) {
    try {
      hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || 'null');
    } catch {
      hist = null;
    }
    if (hist?.id !== id) hist = { id, t: [], v: {} };
  }
  if (hist.t.length && now - hist.t[hist.t.length - 1] < SAMPLE_MS) return;
  hist.t.push(now);
  for (const [k, v] of Object.entries(values)) (hist.v[k] ||= []).push(Math.round(v * 10) / 10);
  // On oublie ce qui a plus de 10 minutes.
  const drop = hist.t.findIndex((t) => now - t <= HISTORY_MS);
  if (drop > 0) {
    hist.t.splice(0, drop);
    for (const a of Object.values(hist.v)) a.splice(0, a.length - hist.t.length);
  }
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
  } catch {}
  drawSparks();
}

/** Courbe de chaque tuile, à l'échelle de ses propres valeurs (de la plus basse à la plus haute). */
function drawSparks() {
  if (!hist) return;
  for (const svg of document.querySelectorAll('[data-spark]')) {
    const vals = hist.v[svg.dataset.spark] || [];
    const n = Math.min(vals.length, hist.t.length);
    if (n < 2) continue;
    // Axe du temps : du plus ancien relevé au plus récent (10 min au plus).
    const t1 = hist.t[hist.t.length - 1];
    const t0 = hist.t[hist.t.length - n];
    const width = Math.max(1, t1 - t0);
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const span = hi - lo || 1;
    const pts = [];
    for (let i = vals.length - n; i < vals.length; i++) {
      const x = ((hist.t[i - vals.length + hist.t.length] - t0) / width) * 100;
      const y = hi === lo ? 15 : 28 - ((vals[i] - lo) / span) * 26;
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    const line = `M${pts.join('L')}`;
    svg.querySelector('.spark-line').setAttribute('d', line);
    svg.querySelector('.spark-area').setAttribute('d', `${line}L${pts[pts.length - 1].split(',')[0]},30L${pts[0].split(',')[0]},30Z`);
  }
}

/** « 220 / 1 000 » : la quantité et, en plus discret, la capacité maximale. */
const withCap = (v, cap) => `${fmt(v)}<span class="cap"> / ${fmt(cap)}</span>`;

/** « 118 k » au-delà de 100 000 : un nombre qui tient dans une tuile étroite. */
const compact = (v) => (v >= 1e5 ? `${fmt(Math.floor(v / 1000))} k` : fmt(v));

// Toutes les fenêtres se ferment d'un toucher sur le fond sombre ou avec Échap (comme leur croix).
for (const sheet of document.querySelectorAll('.sheet')) {
  sheet.addEventListener('click', (e) => {
    if (e.target === sheet) sheet.querySelector('.close-btn')?.click();
  });
}
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const open = [...document.querySelectorAll('.sheet')].find((s) => !s.hidden);
  open?.querySelector('.close-btn')?.click();
});

/** « 1 234 ◆ · 30 ⚡ », en HTML : chaque quantité suivie de l'icône de sa ressource. */
function costText(cost) {
  return Object.entries(cost)
    .filter(([, v]) => v > 0)
    .map(([r, v]) => `<span class="qty">${fmt(v)}${resIcon(r)}</span>`)
    .join(' · ');
}

/** « Chaud · ×1,2 ⚡ · ×1,1 ◆ · ×0,9 🍃 » : le climat et son effet sur la production, en HTML. */
function climateHtml(c, short = false) {
  const x = (v) => `×${v.toFixed(2).replace('.', ',')}`;
  const cls = c.heat >= 0.6 ? 'hot' : c.heat < 0.4 ? 'cold' : 'mild';
  const qty = ['energy', 'minerals', 'food'].map((r) => `<span class="qty">${x(c[r])}${resIcon(r)}</span>`);
  // Version courte (à côté du nom de la planète) : sans mots ni séparateurs.
  return short
    ? `<span class="climate-name ${cls}">${climateName(c.heat)}</span> ${qty.join(' ')}`
    : `<span class="climate-name ${cls}">${climateName(c.heat)}</span> · production ${qty.join(' · ')}`;
}

/** Ligne du climat dans `el` (cachée pour une planète d'avant le climat). */
function showClimate(el, climate, short = false) {
  el.hidden = !climate;
  if (climate) setHtml(el, climateHtml(climate, short));
}

/** innerHTML, réécrit seulement s'il a changé (ces lignes sont rafraîchies à chaque tic). */
function setHtml(el, html) {
  if (el.dataset.html !== html) {
    el.innerHTML = html;
    el.dataset.html = html;
  }
}

/** Solde par minute réelle, signé (un débit par heure de jeu se multiplie par TEMPO). */
function rateText(v) {
  const n = Math.round(v);
  if (n === 0) return '±0 / min';
  return `${n > 0 ? '+' : '−'}${fmt(Math.abs(n))} / min`;
}

/** Résumé d'une planète pour la liste des commandants. */
function popText(race, pop) {
  const R = RACES[race];
  if (!R.pop) return null;
  return `<span class="qty">${fmt(Math.floor(pop))}${resIcon('pop', R.pop.label)}</span>`;
}

$('buildings').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-build]');
  if (btn && !btn.disabled) {
    if (btn.dataset.mode === 'now') session.build(btn.dataset.build, openKey);
    else session.planBuild(btn.dataset.build, openKey);
  }
  const down = e.target.closest('[data-demolish]');
  if (down && !down.disabled) {
    const name = RACES[session.myRace].buildings[down.dataset.demolish].name;
    if (confirm(`Déconstruire un niveau de ${name} ? Tu récupères la moitié de son prix et sa place.`)) session.demolish(down.dataset.demolish, openKey);
  }
});

/** Rendu des parties qui changent avec l'état (joueurs, journal, demandes). */
function renderState() {
  const st = session.state;
  const me = st.players[session.me];
  if (me) {
    $('me-name').textContent = me.name;
    $('me-dot').style.background = me.color;
  }
  $('me-role').innerHTML = me?.race ? `${raceIcon(me.race)} ${RACES[me.race].name}` : 'Commandant';
  $('me-role').style.setProperty('--race', me?.race ? RACES[me.race].color : '');
  $('lost').hidden = !session.alone;


  const players = Object.values(st.players);
  $('players').innerHTML = players
    .map(
      (p) => `<div class="player card${p.online ? '' : ' offline'}" data-player="${esc(p.id)}">
        <span class="dot" style="background:${esc(p.color)}"></span>
        <div class="p-main">
          <div class="p-name">${esc(p.name)}${p.id === session.me ? ' <span class="you">toi</span>' : ''}${
            p.race ? ` <span class="tag race-tag" style="--race:${RACES[p.race].color}">${raceIcon(p.race)} ${RACES[p.race].name}</span>` : ''
          }</div>
          <div class="p-sub mono" data-psub="${esc(p.id)}"></div>
        </div>
        <div class="p-score mono" data-pscore="${esc(p.id)}"></div>
      </div>`,
    )
    .join('');

  printLog(st.log);
  renderLive();
}

/**
 * Journal partagé de la partie, copié aussi dans la console du navigateur
 * (chaque entrée une seule fois, dans l'ordre) pour déboguer. Dans le jeu,
 * c'est la fenêtre Journal qui le montre (D-110, plus haut).
 */
const printed = new Set();
function printLog(log) {
  const time = (t) => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  for (const l of [...log].sort((a, b) => a.at - b.at)) {
    const k = `${l.at}|${l.text}`;
    if (printed.has(k)) continue;
    printed.add(k);
    console.info(`[Astra ${time(l.at)}] ${l.text}`);
  }
}

// ---------------------------------------------------------------------------
// Journal en jeu (D-110) : mes combats vus de mon côté (carnet du téléphone),
// puis les lignes du journal partagé qui me nomment.
// ---------------------------------------------------------------------------

/** Absence au-delà de laquelle le retour ouvre le résumé « pendant ton absence ». */
const AWAY_MS = 2 * 60_000;
let awayFrom = 0; // numéro de la dernière entrée du carnet quand je suis parti
let hiddenAt = 0;

function when(at) {
  const d = new Date(at);
  const hm = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === new Date().toDateString() ? hm : `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} ${hm}`;
}

/** « Tes pertes : 3 · Ses pertes : 4 · Butin : 173 minéraux » (pertes adverses inconnues : ancien rapport). */
function reportDetail(e) {
  if (e.kind !== 'combat') return '';
  const n = (v) => (v == null ? '?' : v);
  const parts = [`Tes pertes : ${n(e.mine)}`, `Ses pertes : ${n(e.theirs)}`];
  if (e.loot) parts.push(`Butin : ${e.loot}`);
  if (e.pillaged) parts.push(`Pillé : ${e.pillaged}`);
  return parts.join(' · ');
}

/** Ouvre le journal ; `away` : seulement ce qui est arrivé pendant mon absence. */
function openJournal(away = null) {
  const j = session.journal || { n: 0, read: 0, list: [] };
  const read = j.read;
  const me = session.state.players[session.me];
  const fights = j.list.filter((e) => !away || e.n > away.n).sort((a, b) => b.at - a.at || b.n - a.n);
  $('journal-title').textContent = away ? 'Pendant ton absence' : 'Journal';
  $('journal-away').hidden = !away;
  if (away) $('journal-away').textContent = `Absent ${away.text}.`;
  $('journal-fights').innerHTML = fights.length
    ? fights
        .map((e) => {
          const detail = reportDetail(e);
          return `<li class="${esc(e.tone || '')}${e.n > read ? ' new' : ''}"><span class="j-time mono">${when(e.at)}</span><strong>${esc(e.text)}</strong>${detail ? `<div class="j-detail mono">${esc(detail)}</div>` : ''}</li>`;
        })
        .join('')
    : '<li class="j-empty">Aucun combat pour l’instant.</li>';
  const events = (session.state.log || [])
    .filter((l) => me && l.text.includes(me.name) && (!away || l.at >= away.since))
    .sort((a, b) => b.at - a.at)
    .slice(0, 20);
  $('journal-events').innerHTML = events.length
    ? events.map((l) => `<li><span class="j-time mono">${when(l.at)}</span>${esc(l.text)}</li>`).join('')
    : '<li class="j-empty">Rien de neuf.</li>';
  $('btn-journal-all').hidden = !away;
  $('sheet-journal').hidden = false;
  session.markRead();
}

/** Au retour (reprise ou appli revenue au premier plan) : le résumé, s'il y a du neuf. */
function showAbsence(gone) {
  const j = session?.journal;
  if (!session?.state || gone < AWAY_MS || !j || !j.list.some((e) => e.n > awayFrom)) return;
  const min = Math.round(gone / 60_000);
  const text = min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
  openJournal({ n: awayFrom, since: Date.now() - gone, text });
}

$('btn-journal').onclick = () => openJournal();
$('btn-journal-all').onclick = () => openJournal();
$('btn-journal-close').onclick = () => ($('sheet-journal').hidden = true);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    hiddenAt = Date.now();
    awayFrom = session?.journal?.n || 0;
    return;
  }
  if (!hiddenAt) return;
  const gone = Date.now() - hiddenAt;
  hiddenAt = 0;
  // Le rattrapage tourne au passage suivant (toutes les 250 ms) : on lui laisse le temps.
  setTimeout(() => showAbsence(gone), 1000);
});

function routeLabel(route) {
  return { host: 'réseau local', srflx: 'direct', prflx: 'direct', relay: 'relais' }[route] || '';
}

/** Rendu des valeurs qui bougent en continu (5 fois par seconde). */
function renderLive() {
  if (!session) return;
  const st = session.state;
  const me = st.players[session.me];
  const now = session.now();
  renderRace(now);

  {
    const online = session.peerCount;
    const rtts = [...session.links.values()].map((l) => l.rtt).filter((v) => v != null);
    const worst = rtts.length ? Math.max(...rtts) : null;
    $('net-count').textContent = online + 1; // moi compris
    $('net').classList.toggle('slow', worst != null && worst > 250);
    $('net-detail').textContent = online
      ? `${online + 1} joueurs en ligne${worst != null ? ` · ${worst} ms` : ''}`
      : 'Seul en ligne';
    $('net-detail').className = 'net' + (worst != null && worst > 250 ? ' slow' : '');
  }
  {
    const j = session.journal;
    const fresh = j ? j.n - j.read : 0;
    $('journal-count').hidden = !fresh;
    $('journal-count').textContent = fresh > 9 ? '9+' : fresh;
  }

  if (me?.planet) {
    if (builtFor !== me.race) buildStatic();
    renderPlanet(me, now);
  } else if (currentView === 'planet') showView('map');
  renderPick(me, now);
  renderFleetInfo(me, now);
  renderMapFleets(me, now);
  renderTrades(me, now);
  if (session.outdated && !warnedOutdated) {
    warnedOutdated = true;
    toast('Un autre joueur a une version plus récente du jeu : recharge l’appli.');
  }

  for (const p of Object.values(st.players)) {
    const sub = document.querySelector(`[data-psub="${p.id}"]`);
    if (!sub) continue;
    const info = session.linkInfo(p.id);
    const net = p.id === session.me ? '' : !info ? 'déconnecté' : info.rtt != null ? `${info.rtt} ms${info.route ? ' ' + routeLabel(info.route) : ''}` : '';
    const scoreEl = document.querySelector(`[data-pscore="${p.id}"]`);
    if (!p.race || !p.planet) {
      sub.textContent = `${p.race ? 'choisit sa planète…' : 'choisit sa race…'}${net ? ' · ' + net : ''}`;
      scoreEl.textContent = '—';
      continue;
    }
    if (session.deadAt(p, now) != null) {
      sub.textContent = `éliminé${net ? ' · ' + net : ''}`;
      scoreEl.textContent = `${fmt(session.scoreOf(p))} pts`;
      scoreEl.closest('.player').style.order = '1';
      continue;
    }
    const s = stateAt(p.planet, now);
    const R = RACES[p.race];
    const doing = s.queue ? `${R.buildings[s.queue.key].short} ${s.queue.level} dans ${Math.ceil((s.queue.end - now) / 1000)} s` : 'aucun chantier';
    const people = popText(p.race, s.pop);
    const nPlanets = session.planetsOf(p).length;
    const docked = session.planetsOf(p).reduce((t, x) => t + countShips(stateAt(x.planet, now).ships), 0);
    const eyes = session.eyes(now);
    const flying = (p.fleets || []).filter((f) => session.sees(p, f, now, eyes)).length; // les autres : seulement celles que je vois
    const space = [
      nPlanets > 1 ? `${nPlanets} planètes` : null,
      docked ? `${docked} vaisseau${docked > 1 ? 'x' : ''}` : null,
      flying ? `${flying} flotte${flying > 1 ? 's' : ''}` : null,
    ];
    const stock = `<span class="qty">${fmt(s.stock.minerals)}${resIcon('minerals')}</span>`;
    setHtml(sub, [stock, people, ...[doing, ...space, net].filter(Boolean).map(esc)].filter(Boolean).join(' · '));
    const pts = session.scoreOf(p);
    scoreEl.textContent = `${fmt(pts)} pts`;
    // Classement : le meilleur score en haut (ordre d'affichage, sans redessiner la liste).
    scoreEl.closest('.player').style.order = String(-Math.round(pts));
  }
}

/** Le froid : quand il part, ma planète la plus menacée, puis le vainqueur. */
function renderRace(now) {
  const el = $('race');
  const start = session.startedAt;
  el.hidden = start == null;
  if (start == null) return;
  const players = session.state.players;
  const me = players[session.me];
  const over = session.over;
  const mmss = (ms) => `${Math.floor(ms / 60_000)}:${String(Math.floor((ms % 60_000) / 1000)).padStart(2, '0')}`;
  let html;
  let hot = false;
  if (over) {
    const mine = over.winner === session.me;
    hot = !mine;
    html = `<strong>${mine ? 'Victoire !' : `${esc(players[over.winner].name)} gagne.`}</strong> <span class="hint">· partie finie ·</span> <a href="replay.html#points" class="race-link">Voir la courbe des points</a>`;
  } else if (me?.out) {
    hot = true;
    const alive = session.ranking(now).filter((r) => r.dead == null).length;
    html = `<strong>Éliminé.</strong> <span class="hint">· encore ${alive} en vie</span>`;
  } else {
    const alive = session.ranking(now).filter((r) => r.dead == null).length;
    const mine = session.livePlanets(me, now).map((pl) => session.frostOf(pl.cell));
    const first = mine.length ? Math.min(...mine) : Infinity;
    const leave = first - now;
    hot = leave < 3 * 60_000;
    const left = Object.keys(players).length > 1 ? ` · ${alive} en vie` : '';
    html = Number.isFinite(leave)
      ? `<strong>${mine.length > 1 ? 'Ta planète la plus exposée gèle' : 'Ta planète gèle'} dans <span class="mono">${mmss(Math.max(0, leave))}</span></strong> <span class="hint">· va vers le soleil${left}</span>`
      : `<strong>Le soleil s’éteint.</strong> <span class="hint">· dernier en vie gagne${left}</span>`;
  }
  el.classList.toggle('hot', hot);
  setHtml($('race-text'), html);
}

/** La planète ouverte (mère ou colonie) : ressources, population, chantiers, recherche, flottes. */
function renderPlanet(me, now) {
  const R = RACES[me.race];
  let pl = session.planetOf(me, openKey);
  if (!pl) {
    openKey = 'home';
    pl = session.planetOf(me, 'home');
  }
  if (!pl) return;
  const planet = pl.planet;
  const s = stateAt(planet, now);
  const f = s.prod;
  const soil = s.reserve ? Object.fromEntries(SOIL.map((r) => [`soil-${r}`, s.reserve[r]])) : {};
  sampleHistory(now, { ...s.stock, pop: s.pop, grid: f.effE * 100, ...soil }, openKey);
  const q = (sel) => document.querySelector(sel);

  $('planet-title').textContent = openKey === 'home' ? pl.name : `${pl.name} · colonie`;
  $('soil-zone').hidden = !planet.nature;
  showClimate($('soil-climate'), planet.climate, true);
  if (planet.nature) fillSoil('soil', planet.nature, s.reserve, f.soil);

  for (const r of R.resources) {
    const cap = f.caps[r];
    q(`[data-res="${r}"]`).innerHTML = withCap(s.stock[r], cap);
    q(`[data-res="${r}"]`).firstChild.textContent = compact(s.stock[r]); // tuile étroite : « 118 k »
    const short = r === 'energy' ? f.effE < 1 : r === 'food' ? f.effF < 1 : false;
    const rate = q(`[data-rate="${r}"]`);
    rate.textContent = short
      ? `Pénurie ${Math.round((r === 'energy' ? f.effE : f.effF) * 100)} %`
      : s.stock[r] >= cap && f.net[r] >= 0
        ? 'Plein'
        : rateText(f.net[r] * TEMPO);
    rate.classList.toggle('neg', short || f.net[r] < -0.5);
    q(`[data-gauge="${r}"]`).style.width = `${Math.min(100, (s.stock[r] / cap) * 100)}%`;
  }

  if (R.pop) {
    const cap = f.popCap;
    const later = stateAt(planet, now + 60_000).pop; // dans une minute
    const delta = later - s.pop;
    q('[data-popgauge]').style.width = `${Math.min(100, (s.pop / Math.max(cap, 1)) * 100)}%`;
    const rate = q('[data-poprate]');
    const extra = q('[data-popextra]');
    if (me.race === 'human') {
      q('[data-pop]').innerHTML = withCap(s.pop, cap);
      rate.textContent = f.effF < 1 ? 'Famine !' : rateText(delta);
      // Habitants au travail (autant que de postes, au plus) sur l'ensemble des habitants.
      const people = Math.floor(s.pop);
      const active = Math.min(people, f.jobs);
      const vacant = Math.max(0, f.jobs - people);
      extra.textContent = `${fmt(active)} actifs${vacant ? ` · ${fmt(vacant)} vides` : ''}`;
      extra.title = `${fmt(active)} habitants au travail sur ${fmt(people)}${vacant ? `, ${fmt(vacant)} postes vides` : ''}`;
      extra.classList.toggle('neg', vacant > 0);
    } else {
      q('[data-pop]').innerHTML = withCap(s.pop, cap);
      const starving = Math.min(f.effE, f.effF) < 1;
      const next = (Math.floor(s.pop) + 1 - s.pop) / 0.12 / TEMPO; // 0,12 naissance par heure de jeu (game.js) ; une heure de jeu = 1 / TEMPO minute réelle
      rate.textContent = starving
        ? 'Ils dépérissent !'
        : s.pop >= cap - 1e-6
          ? 'Plein'
          : `+1 : ${Math.ceil(next)} min`;
      extra.textContent = `≈ ${fmt(power(me.race, s.pop))} hum.`;
      extra.title = `Puissance d'environ ${fmt(power(me.race, s.pop))} humains`;
    }
    rate.classList.toggle('neg', delta < -0.01 || f.effF < 1 || (me.race === 'alien' && f.effE < 1));
  } else {
    q('[data-grid]').textContent = `${Math.round(f.effE * 100)} %`;
    q('[data-gridrate]').textContent = `+${fmt(f.in.energy * TEMPO)} −${fmt((f.out.energy / Math.max(f.effE, 1e-9)) * TEMPO)}`;
    q('[data-gridrate]').title = 'Production et consommation d’énergie, par minute';
    q('[data-gridextra]').textContent = f.effE < 1 ? 'Ralenti' : 'À plein';
    q('[data-gridrate]').classList.toggle('neg', f.effE < 1);
  }

  // Place : un niveau de bâtiment, une place (les planètes d'avant la place n'ont pas de limite).
  const used = usedPlaces(s.levels);
  const full = !!planet.places && used >= planet.places;
  $('places').textContent = planet.places ? `${used} / ${planet.places} places` : '';
  $('places').classList.toggle('full', full);
  // Fil de construction (D-105) : chantier occupé ou stock trop court, le bouton ajoute au fil.
  const plan = s.plan || [];
  const busy = !!s.queue || plan.length > 0;
  // Places une fois tout fini : chantier en cours et fil compris.
  const taken = used + (s.queue ? (s.queue.demolish ? -1 : 1) : 0) + plan.length;
  const noRoom = !!planet.places && taken >= planet.places;
  for (const k of Object.keys(R.buildings)) {
    const level = s.levels[k] || 0;
    // Niveau du prochain ajout : celui en chantier et ceux qui attendent déjà dans le fil.
    const next = level + (s.queue?.key === k ? (s.queue.demolish ? -1 : 1) : 0) + plan.filter((x) => x === k).length;
    const cost = upgradeCost(me.race, k, next);
    const ok = covers(s.stock, cost) && !full;
    const direct = !busy && ok;
    const job = s.queue?.key === k ? s.queue : null;
    q(`[data-level="${k}"]`).textContent = job ? `niv ${level} → ${job.level} · ${clock(Math.max(0, job.end - now))}` : `niv ${level}`;
    setHtml(q(`[data-cost="${k}"]`), `${costText(cost)} · ${buildDuration(me.race, s.levels, cost) / 1000} s`);
    const card = q(`[data-card="${k}"]`);
    card.classList.toggle('affordable', direct);
    card.classList.toggle('building-now', !!job);
    const btn = q(`[data-build="${k}"]`);
    btn.dataset.mode = direct ? 'now' : 'plan';
    btn.disabled = noRoom || plan.length >= PLAN_MAX || session.status !== 'playing';
    cardProgress(card, job, now);
    setHtml(btn, direct ? `${ic('up')}${next + 1}` : `${ic('plus')}${next + 1}`);
    btn.title = noRoom
      ? 'Plus de place sur cette planète'
      : plan.length >= PLAN_MAX
        ? `Fil plein (${PLAN_MAX} au plus)`
        : direct
          ? `Passer au niveau ${next + 1}`
          : `Ajouter le niveau ${next + 1} au fil : il se lancera dès que possible`;
    btn.setAttribute('aria-label', `${R.buildings[k].name} : ${btn.title.toLowerCase()}`);
    const down = q(`[data-demolish="${k}"]`);
    down.disabled = !!s.queue || level < 1 || !session.canAct;
    down.hidden = level < 1;
  }
  renderPlan(me, pl, planet, now);

  if (me.race === 'alien') {
    const trance = Math.max(0, (planet.trance || 0) - now);
    for (const k of POWER_KEYS) {
      const cost = powerCost(planet, k, s.pop);
      const wait = Math.max(0, powerReadyAt(planet, k) - now);
      const ok = covers(s.stock, cost);
      const idle = k === 'lift' && !liftGain({ ...planet, ...s }); // entrepôt plein ou sol vide : rien à gagner
      setHtml(q(`[data-pcost="${k}"]`), `${costText(cost)} · ↻ ${Math.round(POWERS[k].cooldown / 1000)} s`);
      q(`[data-pready="${k}"]`).textContent = k === 'trance' && trance ? `transe ${clock(trance)}` : wait ? clock(wait) : 'prêt';
      q(`[data-pcard="${k}"]`).classList.toggle('affordable', ok && !wait && !idle);
      const btn = q(`[data-power="${k}"]`);
      btn.disabled = !!wait || !ok || idle || session.status !== 'playing';
      setHtml(btn, ic(wait ? 'wait' : idle ? 'none' : 'play'));
      btn.title = wait ? 'En recharge' : idle ? 'Rien à arracher' : 'Déclencher';
      btn.setAttribute('aria-label', `${POWERS[k].name} : ${btn.title.toLowerCase()}`);
    }
  }

  renderResearch(me, pl, s, now);
  renderYard(me, pl, s, now);
  renderFleets(me, pl, s, now);
  renderPartners($('planet-partners'), { planet: pl.key });
}

/**
 * Fil de construction de la planète ouverte, avec l'heure estimée de début
 * et de fin de chaque bâtiment (planForecast, recalculée une fois par seconde).
 */
let planCache = { key: '', list: [] };
function renderPlan(me, pl, planet, now) {
  const el = $('plan');
  const key = [pl.key, planet.at, JSON.stringify(planet.plan || []), planet.queue?.end, planet.research?.end, planet.yard?.end, Math.floor(now / 1000)].join('|');
  if (planCache.key !== key) planCache = { key, list: planForecast(planet, now) };
  const list = planCache.list;
  el.hidden = !list.length;
  const R = RACES[me.race];
  const when = (f) => {
    if (f.start == null) return f.why || 'plus de 6 h';
    const start = f.start <= now ? 'maintenant' : `dans ${clock(f.start - now)}`;
    return `${start} → fini dans ${clock(Math.max(0, f.end - now))}`;
  };
  // La structure ne change qu'avec le fil (les boutons restent sous le doigt) ; les heures, à chaque tic.
  setHtml(
    el,
    list
      .map(
        (f, i) => `<li class="plan-item">
      <span class="plan-name">${i + 1}. ${esc(R.buildings[f.key].short || R.buildings[f.key].name)} <span class="level mono">niv ${f.level}</span></span>
      <span class="plan-when mono" title="Estimation, si la production reste la même"></span>
      <button class="ghost small" data-unplan="${i}" data-key="${f.key}" title="Retirer du fil" aria-label="Retirer ${esc(R.buildings[f.key].name)} du fil"${session.canAct ? '' : ' disabled'}>${ic('close')}</button>
    </li>`,
      )
      .join(''),
  );
  el.querySelectorAll('.plan-item').forEach((li, i) => {
    const f = list[i];
    li.classList.toggle('blocked', f.start == null);
    li.querySelector('.plan-when').textContent = `${f.start == null ? '' : '≈ '}${when(f)}`;
  });
}

$('plan').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-unplan]');
  if (btn && !btn.disabled) session.unplan(btn.dataset.key, Number(btn.dataset.unplan), openKey);
});

/** Chantier, recherche ou vaisseaux en cours : la barre de progression s'affiche sur la carte concernée. */
function cardProgress(card, job, now) {
  const bar = card.querySelector('.card-bar');
  bar.hidden = !job;
  if (!job) return;
  const left = Math.max(0, job.end - now);
  bar.firstElementChild.style.width = `${Math.min(100, (1 - left / Math.max(1, job.end - job.start)) * 100)}%`;
}

/** Arbre des technologies : sur toute planète qui a un labo, avec le niveau de ce labo. */
function renderResearch(me, pl, s, now) {
  const lab = s.levels.lab || 0;
  // Recherches lancées sur mes autres planètes : la même technologie ne peut pas y être lancée ici.
  const elsewhere = {};
  for (const x of session.planetsOf(me)) if (x.key !== pl.key && x.planet.research) elsewhere[x.planet.research.key] = x.name;
  const T = TECHS[me.race];
  const labName = RACES[me.race].buildings.lab.name;
  $('research-hint').textContent = lab ? '' : `🔒 Il faut un ${labName}.`;
  $('research-hint').hidden = !!lab;
  const q = (sel) => document.querySelector(sel);
  for (const [k, t] of Object.entries(T)) {
    const level = s.tech[k] || 0;
    const maxed = level >= t.max;
    const miss = techMissing(me.race, k, s.tech, lab);
    const cost = techCost(me.race, k, level);
    const ok = !maxed && !miss && covers(s.stock, cost);
    q(`[data-tlevel="${k}"]`).textContent = `niv ${level}/${t.max}`;
    const req = q(`[data-treq="${k}"]`);
    req.hidden = !miss || maxed;
    req.textContent = miss ? `🔒 ${miss}` : '';
    setHtml(q(`[data-tcost="${k}"]`), maxed ? 'Niveau maximum' : `${costText(cost)} · ${clock(researchDuration(cost, Math.max(1, lab)))}`);
    q(`[data-tcard="${k}"]`).classList.toggle('locked', !!miss && !maxed);
    const there = elsewhere[k];
    q(`[data-tcard="${k}"]`).classList.toggle('affordable', ok && !s.research && !there);
    q(`[data-tcard="${k}"]`).classList.toggle('building-now', s.research?.key === k);
    const btn = q(`[data-research="${k}"]`);
    btn.disabled = !ok || !!s.research || !!there || session.status !== 'playing';
    const job = s.research?.key === k ? s.research : null;
    cardProgress(q(`[data-tcard="${k}"]`), job, now);
    setHtml(btn, job ? `${ic('wait')}${clock(Math.max(0, job.end - now))}` : maxed ? ic('done') : `${ic('up')}${level + 1}`);
    btn.title = s.research?.key === k ? 'En cours' : maxed ? 'Terminé' : there ? `En recherche sur ${there}` : miss ? `Il faut : ${miss}` : !ok ? 'Ressources insuffisantes' : `Rechercher le niveau ${level + 1}`;
    btn.setAttribute('aria-label', `${t.name} : ${btn.title.toLowerCase()}`);
  }
}

/** « ⚔ 12 · ◇ 30 · ▣ 50 · » 7,0 » : attaque, coque, soute, vitesse (cases/min). */
const statText = (st) =>
  `⚔ ${fmt(st.attack)} · ◇ ${fmt(st.hull)} · ▣ ${fmt(st.cargo)} · » ${(st.speed * TEMPO).toFixed(1).replace('.', ',')}`;

/** Lot de `n` vaisseaux `k` qu'on peut lancer maintenant sur cette planète (état `s`) ? */
function canBuildShips(me, s, k, n) {
  return !!s.levels.yard && n >= 1 && shipUnlocked(me.race, k, s.tech) && !s.yard && n <= shipsAffordable(me.race, k, s.stock) && session.status === 'playing';
}

/** Chantier naval de la planète ouverte. */
function renderYard(me, pl, s, now) {
  const yard = s.levels.yard || 0;
  const S = SHIPS[me.race];
  const yardName = RACES[me.race].buildings.yard.name;
  $('yard-hint').textContent = yard ? '' : `🔒 Il faut un ${yardName}.`;
  $('yard-hint').hidden = !!yard;
  const q = (sel) => document.querySelector(sel);
  for (const k of SHIP_KEYS) {
    const unlocked = shipUnlocked(me.race, k, s.tech);
    const u = shipUnlock(me.race, k);
    const job = s.yard?.type === k ? s.yard : null;
    cardProgress(q(`[data-scard="${k}"]`), job, now);
    q(`[data-sdocked="${k}"]`).textContent = [
      s.ships[k] ? `${s.ships[k]} à quai` : '',
      job ? `+${job.count} · ${clock(Math.max(0, job.end - now))}` : '',
    ].filter(Boolean).join(' · ');
    q(`[data-sstats="${k}"]`).title = 'Attaque · coque · soute · vitesse en cases par minute';
    q(`[data-sstats="${k}"]`).textContent = statText(shipStats(me.race, k, s.tech));
    const req = q(`[data-sreq="${k}"]`);
    req.hidden = unlocked;
    req.textContent = unlocked ? '' : `🔒 ${TECHS[me.race][u.key].name} ${u.level}`;
    setHtml(q(`[data-scost="${k}"]`), `${costText(S[k].cost)} · ${clock(shipDuration(me.race, k, 1, Math.max(1, yard)))}/u`);
    q(`[data-scard="${k}"]`).classList.toggle('locked', !unlocked);
    for (const btn of document.querySelectorAll(`[data-ship="${k}"]`)) btn.disabled = !canBuildShips(me, s, k, Number(btn.dataset.n));
  }
}

/** Vaisseaux à quai et flottes. */
function renderFleets(me, pl, s, now) {
  const docked = SHIP_KEYS.filter((k) => s.ships[k]).map((k) => `${s.ships[k]} × ${SHIPS[me.race][k].name}`);
  $('docked').textContent = docked.length ? `À quai : ${docked.join(', ')}.` : 'Aucun vaisseau à quai sur cette planète.';
  $('btn-send-fleet').hidden = !docked.length;
  const html = (me.fleets || [])
    .map((f) => {
      const left = moving(f, now) ? clock(f.arrive - now) : '';
      return `<div class="player card" data-fleet="${esc(f.id)}"><div class="p-main"><div class="p-name">${esc(`${fleetName(f)} · ${fleetStatus(me.race, f, now)}`)}</div>
        <div class="p-sub mono">${shipsLine(me.race, f)} · ${fuelText(me.race, f, now)}</div></div>
        <div class="p-score mono">${left}</div></div>`;
    })
    .join('');
  if ($('fleets').dataset.html !== html) {
    $('fleets').innerHTML = html;
    $('fleets').dataset.html = html;
  }
}

/** Nom d'une case : la planète qui s'y trouve, sinon ses coordonnées. */
const cellName = (cell) => mapPlanets().find((w) => sameCell(w, cell))?.name || `[${Math.round(cell.x)}:${Math.round(cell.y)}]`;

/** « carburant 34 / 40 » */
const fuelText = (race, f, now) => `carburant ${Math.floor(fuelAt(f, race, now))} / ${fleetTank(race, f.ships)}`;

/** « vitesse 7,0 cases/min, celle du Cargo » : la flotte va au pas de son vaisseau le plus lent. */
function speedText(race, ships, tech) {
  const slow = slowestShip(race, ships, tech);
  if (!slow) return '';
  const v = (fleetSpeed(race, ships, tech) * TEMPO).toFixed(1).replace('.', ',');
  const kinds = SHIP_KEYS.filter((k) => ships[k] > 0).length;
  return `vitesse ${v} cases/min${kinds > 1 ? `, celle du plus lent : ${SHIPS[race][slow].name}` : ''}`;
}

/** « 3 × Frégate, 1 × Cargo · 200 ◆ », en HTML. */
function shipsLine(race, f) {
  const ships = SHIP_KEYS.filter((k) => f.ships[k]).map((k) => `${f.ships[k]} × ${esc(SHIPS[race][k].name)}`).join(', ');
  const cargo = f.cargo && f.cargo.minerals + f.cargo.food ? ` · ${costText(f.cargo)}` : '';
  return `${ships}${cargo}`;
}

/** « Flotte 2 » : son rang parmi mes flottes. */
function fleetName(f) {
  const i = (session.state.players[session.me]?.fleets || []).indexOf(f);
  return `Flotte ${i + 1}`;
}

/** Ce que fait une flotte : « Attaque → Kepler », « En orbite de Kepler », « Stationne en [4:7] ». */
function fleetStatus(race, f, now) {
  const where = cellName(f.to);
  if (moving(f, now) && f.stranded) return `Tombera en panne vers ${where}`;
  if (!moving(f, now) && fuelAt(f, race, now) < DRY) return `À sec vers ${where}`;
  const offer = (session.state.players[session.me]?.offers || []).find((o) => o.from.fleet === f.id);
  if (offer) return `Attend la réponse de ${session.state.players[offer.to.pid]?.name || '?'} (échange)`;
  if (f.order?.kind === 'chase') {
    const foe = session.state.players[f.order.pid];
    return `Poursuite d’une flotte ${foe ? de(foe.name) : 'ennemie'}`;
  }
  const hawk = aggressive(f) ? ' · agressive' : '';
  if (moving(f, now)) return `${f.order ? ORDERS[f.order.kind]?.name || 'Ordre' : 'Déplacement'} → ${where}${hawk}`;
  return `${mapPlanets().some((w) => sameCell(w, f.to)) ? `En orbite ${de(where)}` : `Stationne en ${where}`}${hawk}`;
}

$('fleets').addEventListener('click', (e) => {
  const id = e.target.closest('[data-fleet]')?.dataset.fleet;
  if (!id) return;
  selFleet = id;
  showView('map');
  renderFleetInfo();
});

// ---------------------------------------------------------------------------
// Décollage d'une flotte
// ---------------------------------------------------------------------------

function fleetChoice() {
  const ships = {};
  for (const el of document.querySelectorAll('[data-fship]')) ships[el.dataset.fship] = Math.max(0, Math.floor(Number(el.value) || 0));
  const cargo = {};
  for (const el of document.querySelectorAll('[data-fcargo]')) cargo[el.dataset.fcargo] = Math.max(0, Math.floor(Number(el.value) || 0));
  return { ships, cargo };
}

let fleetKey = 'home'; // planète d'où part la flotte du formulaire de décollage

function openFleetSheet(key = openKey) {
  const me = session.state.players[session.me];
  const pl = session.planetOf(me, key);
  if (!pl) return;
  fleetKey = key;
  const s = stateAt(pl.planet, session.now());
  $('fleet-ships').innerHTML = SHIP_KEYS.filter((k) => s.ships[k])
    .map((k) => `<label>${esc(SHIPS[me.race][k].name)} (${s.ships[k]})<input type="number" inputmode="numeric" min="0" max="${s.ships[k]}" value="${s.ships[k]}" data-fship="${k}"></label>`)
    .join('');
  $('fleet-cargo').innerHTML = SOIL.map(
    (r) => `<label>${RES_INFO[r].name} (${fmt(s.stock[r])})<input type="number" inputmode="numeric" min="0" value="0" data-fcargo="${r}"></label>`,
  ).join('');
  // Par défaut, le plein (ou toute l'énergie disponible, s'il en manque).
  const energy = Math.floor(s.stock.energy || 0);
  $('fleet-fuel-label').firstChild.textContent = `Énergie (${fmt(energy)})`;
  $('fleet-fuel').dataset.max = energy;
  $('fleet-fuel').value = Math.min(energy, fleetTank(me.race, s.ships));
  $('sheet-fleet').hidden = false;
  updateFleetSheet();
}

function updateFleetSheet() {
  const me = session.state.players[session.me];
  const { ships } = fleetChoice();
  const speed = speedText(me.race, ships, me.planet.tech);
  $('fleet-room').textContent = `Soutes : ${fmt(fleetCargo(me.race, ships))}${speed ? ` · ${speed[0].toUpperCase()}${speed.slice(1)}` : ''}`;
  const tank = fleetTank(me.race, ships);
  const burn = fleetBurn(me.race, ships);
  const input = $('fleet-fuel');
  const fuel = Math.min(Math.max(0, Math.floor(Number(input.value) || 0)), tank, Number(input.dataset.max) || 0);
  if (Number(input.value) !== fuel) input.value = fuel;
  $('fleet-tank').textContent = burn
    ? `Réservoirs : ${fmt(tank)} · ${String(burn).replace('.', ',')} par case · ${Math.floor(fuel / burn)} cases avec ce carburant`
    : '';
  $('btn-fleet-go').disabled = !countShips(ships);
}

$('btn-send-fleet').onclick = () => openFleetSheet(openKey);
$('btn-fleet-close').onclick = () => ($('sheet-fleet').hidden = true);
$('sheet-fleet').addEventListener('input', updateFleetSheet);
$('btn-fleet-go').onclick = () => {
  const { ships, cargo } = fleetChoice();
  const id = session.takeOff(fleetKey, ships, cargo, Math.floor(Number($('fleet-fuel').value) || 0));
  if (!id) return;
  $('sheet-fleet').hidden = true;
  // Direction la carte, flotte sélectionnée : il ne reste qu'à toucher une case.
  selFleet = id;
  selected = null;
  showView('map');
  renderPick();
  renderFleetInfo();
};

/** « 2:05 » */
function clock(ms) {
  const t = Math.ceil(ms / 1000);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Univers : la carte des planètes, vue principale de la partie
// ---------------------------------------------------------------------------

let currentView = 'map';
let openKey = 'home'; // planète ouverte : « home » ou l'identifiant d'une colonie
let mapFrame = null;
let selected = null; // planète touchée sur la carte : { x, y }
let selFleet = null; // id d'une de mes flottes, sélectionnée pour la piloter
let pending = null; // case visée par la flotte sélectionnée, en attente d'un choix : { x, y }
let prey = null; // flotte ennemie visée par la flotte sélectionnée, en attente d'un choix : { pid, id }

/** Carte (vue principale) ou bâtiments d'une de mes planètes. */
function showView(view, key = openKey) {
  currentView = view;
  openKey = key;
  $('view-universe').hidden = view !== 'map';
  $('view-planet').hidden = view !== 'planet';
  // Pas de barre du haut : le compteur de joueurs se range à droite de la première ligne de l'écran.
  (view === 'map' ? document.querySelector('.map-head .pi-head-right') : document.querySelector('.planet-head')).append($('btn-journal'), $('net'));
  window.scrollTo(0, 0);
  if (view === 'map') {
    if (!mapFrame) mapFrame = requestAnimationFrame(drawMap);
  } else stopMap();
  if (session?.state) renderLive(); // pas d'image de l'écran précédent pendant 200 ms
}

function stopMap() {
  if (mapFrame) cancelAnimationFrame(mapFrame);
  mapFrame = null;
}

$('btn-back-map').onclick = () => showView('map');

/** Onglet de l'écran planète : bâtiments, pouvoirs (aliens), recherche ou flottes. */
/** Onglet choisi par le joueur (un changement forcé peut en afficher un autre un moment). */
let chosenTab = 'build';
function showTab(tab, persist = true) {
  $('view-planet').dataset.tab = tab;
  if (persist) chosenTab = tab;
  for (const b of document.querySelectorAll('[data-tab-btn]')) {
    b.setAttribute('aria-selected', String(b.dataset.tabBtn === tab));
    b.tabIndex = b.dataset.tabBtn === tab ? 0 : -1;
  }
  if (!persist) return; // changement forcé : l'onglet choisi reste mémorisé
  try {
    localStorage.setItem('astra.tab', tab);
  } catch {}
}
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
  const saved = localStorage.getItem('astra.tab');
  if (['build', 'power', 'research', 'fleet'].includes(saved)) showTab(saved);
} catch {}
// Aide de la carte : une bulle au survol ; au doigt (pas de survol), un toucher l'ouvre ou la ferme.
$('btn-map-help').onclick = (e) => {
  const btn = e.currentTarget;
  btn.setAttribute('aria-expanded', String(btn.getAttribute('aria-expanded') !== 'true'));
};
document.addEventListener('click', (e) => {
  if (!e.target.closest('.help-wrap')) $('btn-map-help').setAttribute('aria-expanded', 'false');
});
$('btn-open-planet').onclick = (e) => {
  selected = null; // sinon la fiche se rouvrirait au retour sur la carte
  renderPick();
  showView('planet', e.currentTarget.dataset.key || 'home');
};

/**
 * Toutes les planètes à afficher : celles de l'univers, avec leur
 * propriétaire, et les planètes mères des joueurs d'avant le choix de
 * planète (placées hors de la liste).
 */
function mapPlanets() {
  const out = session.planets.map((w) => {
    const owner = session.ownerAt(w);
    // `pl` : la planète du propriétaire à cet endroit (mère ou colonie), avec sa clé.
    const pl = owner && session.planetsOf(owner).find((x) => sameCell(x.cell, w));
    return { ...w, owner: pl ? owner : null, pl: pl || null };
  });
  for (const p of Object.values(session.state.players)) {
    if (p.home && p.planet && !out.some((w) => sameCell(w, p.home))) {
      out.push({ id: `home-${p.id}`, name: `Planète ${de(p.name)}`, x: p.home.x, y: p.home.y, owner: p, nature: null, pl: session.planetOf(p, 'home') });
    }
  }
  return out;
}

/** « de Beta », « d'Alpha ». */
const de = (name) => (/^[aeiouyhàâéèêëîïôöûü]/i.test(name) ? `d’${name}` : `de ${name}`);

/** Petit bruit déterministe : les mêmes étoiles de fond sur tous les téléphones. */
function noise(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Astéroïde (un caillou irrégulier) ou comète (une tête et une queue qui
 * fuit le soleil), plus petits qu'une planète.
 */
function drawSmallBody(ctx, w, cx, cy, cell, color) {
  if (w.kind === 'comet') {
    const sun = sunFor(session.state.gid);
    const sx = (sun.x + sun.size / 2) * cell;
    const sy = (sun.y + sun.size / 2) * cell;
    const a = Math.atan2(cy - sy, cx - sx);
    const tail = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * cell * 0.8, cy + Math.sin(a) * cell * 0.8);
    tail.addColorStop(0, 'rgba(170,220,255,0.55)');
    tail.addColorStop(1, 'rgba(170,220,255,0)');
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = tail;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a + Math.PI / 2) * cell * 0.1, cy + Math.sin(a + Math.PI / 2) * cell * 0.1);
    ctx.lineTo(cx + Math.cos(a) * cell * 0.8, cy + Math.sin(a) * cell * 0.8);
    ctx.lineTo(cx + Math.cos(a - Math.PI / 2) * cell * 0.1, cy + Math.sin(a - Math.PI / 2) * cell * 0.1);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = w.owner ? color : '#cfe8ff';
    ctx.beginPath();
    ctx.arc(cx, cy, cell * 0.12, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  // Caillou : un polygone aux sommets irréguliers, le même à chaque image.
  ctx.beginPath();
  for (let k = 0; k < 7; k++) {
    const r = cell * (0.1 + 0.07 * noise(w.x * 7 + k, w.y * 3 + k));
    const t = (k / 7) * Math.PI * 2;
    ctx[k ? 'lineTo' : 'moveTo'](cx + Math.cos(t) * r, cy + Math.sin(t) * r);
  }
  ctx.closePath();
  ctx.fill();
}

/** Le froid : tout ce qui est hors du cercle autour du soleil est gelé. */
function drawFrost(ctx, sun, cell, W) {
  const start = session.startedAt;
  if (start == null) return;
  const line = frostLine(sun, start, Math.min(session.now(), session.over?.at ?? Infinity)); // la partie finie, le froid s'arrête
  if (!Number.isFinite(line)) return;
  const cx = (sun.x + sun.size / 2) * cell;
  const cy = (sun.y + sun.size / 2) * cell;
  const r = (line + sun.size / 2) * cell;
  ctx.save();
  ctx.fillStyle = 'rgba(150,200,255,0.16)';
  ctx.beginPath();
  ctx.rect(0, 0, W, W);
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill('evenodd');
  ctx.strokeStyle = 'rgba(170,215,255,0.7)';
  ctx.lineWidth = Math.max(1, cell * 0.06);
  ctx.setLineDash([cell * 0.25, cell * 0.15]);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawMap() {
  mapFrame = null;
  if (!session || currentView !== 'map') return;
  // L'image suivante est demandée tout de suite : une erreur dans celle-ci ne fige pas la carte.
  mapFrame = requestAnimationFrame(drawMap);
  const canvas = $('map');
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const css = canvas.clientWidth;
  if (canvas.width !== Math.round(css * dpr)) canvas.width = canvas.height = Math.round(css * dpr);
  const W = canvas.width;
  const cell = W / UNIVERSE.w;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, W);
  ctx.fillStyle = '#05070f';
  ctx.fillRect(0, 0, W, W);

  // Étoiles et quadrillage : du décor, très discret, pour que seuls les objets qu'on peut toucher ressortent.
  for (let y = 0; y < UNIVERSE.h; y++) {
    for (let x = 0; x < UNIVERSE.w; x++) {
      const n = noise(x, y);
      if (n > 0.72) {
        ctx.fillStyle = `rgba(220,230,255,${0.05 + (n - 0.72) * 0.6})`;
        const r = Math.max(0.5, cell * 0.025 * (n * 2));
        ctx.beginPath();
        ctx.arc((x + noise(y, x)) * cell, (y + noise(x + 7, y + 3)) * cell, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.strokeStyle = 'rgba(150,170,230,0.05)';
  ctx.lineWidth = Math.max(1, dpr * 0.5);
  ctx.beginPath();
  for (let i = 1; i < UNIVERSE.w; i++) {
    ctx.moveTo(i * cell, 0);
    ctx.lineTo(i * cell, W);
    ctx.moveTo(0, i * cell);
    ctx.lineTo(W, i * cell);
  }
  ctx.stroke();
  const sun = sunFor(session.state.gid);
  drawSun(ctx, sun, cell);
  drawFrost(ctx, sun, cell, W);

  const me = session.state.players[session.me];
  const picking = !me?.home && !me?.out;
  const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 300);

  // Portée de détection : ce que je vois, en léger halo (hors du halo, les flottes adverses sont cachées).
  if (me?.planet) {
    ctx.fillStyle = me.color || '#8d95b3';
    ctx.globalAlpha = 0.07;
    ctx.beginPath();
    for (const e of session.eyes(session.now())) {
      ctx.moveTo((e.x + 0.5 + e.r) * cell, (e.y + 0.5) * cell);
      ctx.arc((e.x + 0.5) * cell, (e.y + 0.5) * cell, e.r * cell, 0, Math.PI * 2);
    }
    ctx.fill(); // un seul tracé : les zones qui se recouvrent ne s'assombrissent pas
    ctx.globalAlpha = 1;
  }

  for (const w of mapPlanets()) {
    const cx = (w.x + 0.5) * cell;
    const cy = (w.y + 0.5) * cell;
    const o = w.owner;
    const mine = o?.id === session.me;
    // Planète libre : grise, plus lumineuse quand on cherche où s'installer. Gelée : presque effacée.
    ctx.globalAlpha = session.frostOf(w) <= session.now() ? 0.15 : o ? (o.online ? 1 : 0.45) : picking && w.kind === 'planet' ? 0.55 + 0.35 * pulse : 0.6;
    const color = o ? o.color : '#8d95b3';
    ctx.fillStyle = color;
    if (w.kind === 'asteroid' || w.kind === 'comet') {
      drawSmallBody(ctx, w, cx, cy, cell, color);
      if (sameCell(selected, w) || mine) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1.5, cell * 0.06);
        ctx.beginPath();
        ctx.arc(cx, cy, cell * 0.4, 0, Math.PI * 2);
        ctx.stroke();
      }
      continue;
    }
    ctx.beginPath();
    ctx.arc(cx, cy, cell * (o ? 0.26 : 0.2), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, cell * 0.06);
    if (!o) ctx.setLineDash([cell * 0.12, cell * 0.1]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, cell * 0.42, cell * 0.14, -0.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (mine || sameCell(selected, w)) {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = mine ? 'rgba(255,255,255,0.85)' : '#ffffff';
      ctx.lineWidth = Math.max(1.5, cell * 0.07);
      ctx.beginPath();
      ctx.arc(cx, cy, cell * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Nom du propriétaire au-dessus
    if (o) {
      ctx.globalAlpha = o.online ? 1 : 0.6;
      ctx.font = `600 ${Math.max(9 * dpr, cell * 0.36)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = mine ? '#ffffff' : 'rgba(232,235,247,0.8)';
      const label = o.name.length > 8 ? o.name.slice(0, 7) + '…' : o.name;
      ctx.fillText(label, cx, Math.max(cell * 0.4, cy - cell * 0.5));
    }
  }
  ctx.globalAlpha = 1;

  // Flottes : un petit triangle qui glisse le long de son trajet, ou qui attend en orbite.
  const now = session.now();
  for (const spot of fleetSpots(now)) {
    const { p, f, x, y } = spot;
    const cx = (x + 0.5) * cell;
    const cy = (y + 0.5) * cell;
    if (spot.moving) {
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = Math.max(1, dpr * 0.6);
      ctx.setLineDash([cell * 0.15, cell * 0.15]);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo((f.to.x + 0.5) * cell, (f.to.y + 0.5) * cell);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
    if (prey && p.id === prey.pid && f.id === prey.id) {
      ctx.strokeStyle = '#ff7a93';
      ctx.lineWidth = Math.max(1.5, cell * 0.06);
      ctx.beginPath();
      ctx.arc(cx, cy, cell * 0.3, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (p.id === session.me && f.id === selFleet) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.5, cell * 0.06);
      ctx.beginPath();
      ctx.arc(cx, cy, cell * 0.3, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (f.stranded && spot.moving) {
      // Point de panne : une croix au bout du trajet.
      const px = (f.to.x + 0.5) * cell;
      const py = (f.to.y + 0.5) * cell;
      const r = cell * 0.18;
      ctx.strokeStyle = '#ff7a93';
      ctx.lineWidth = Math.max(1, cell * 0.06);
      ctx.beginPath();
      ctx.moveTo(px - r, py - r);
      ctx.lineTo(px + r, py + r);
      ctx.moveTo(px + r, py - r);
      ctx.lineTo(px - r, py + r);
      ctx.stroke();
    }
    if (p.id === session.me) {
      // Jauge de carburant sous mes flottes.
      const k = Math.min(1, fuelAt(f, p.race, now) / Math.max(1, fleetTank(p.race, f.ships)));
      const w = cell * 0.5;
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(cx - w / 2, cy + cell * 0.24, w, Math.max(1.5, cell * 0.06));
      ctx.fillStyle = k < 0.25 ? '#ff7a93' : '#f5c96a';
      ctx.fillRect(cx - w / 2, cy + cell * 0.24, w * k, Math.max(1.5, cell * 0.06));
    }
    ctx.globalAlpha = !spot.moving && fuelAt(f, p.race, now) < DRY ? 0.5 : 1; // à sec : grisée
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(spot.ang);
    ctx.fillStyle = ['attack', 'conquer', 'chase'].includes(f.order?.kind) || f.mission === 'attack' ? '#ff7a93' : p.color;
    const k = spot.moving ? 1 : 0.8;
    ctx.beginPath();
    ctx.moveTo(cell * 0.28 * k, 0);
    ctx.lineTo(-cell * 0.18 * k, cell * 0.16 * k);
    ctx.lineTo(-cell * 0.18 * k, -cell * 0.16 * k);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  // Case visée, en attente d'un choix (se poser, coloniser, attaquer…).
  if (pending) {
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = 0.6 + 0.4 * pulse;
    ctx.lineWidth = Math.max(1, cell * 0.05);
    ctx.strokeRect(pending.x * cell + 1, pending.y * cell + 1, cell - 2, cell - 2);
    ctx.globalAlpha = 1;
  }

  $('my-coords').textContent = me?.home ? `[${me.home.x}:${me.home.y}]` : me?.out ? 'éliminé' : 'à choisir';
}

/**
 * Où dessiner chaque flotte (en cases) : sur son trajet si elle roule ;
 * à l'arrêt, posée en couronne autour du centre de sa case pour ne cacher
 * ni la planète ni les autres flottes. Le toucher utilise les mêmes places.
 * [{ p, f, x, y, ang, moving }]
 */
function fleetSpots(now) {
  const out = [];
  const parked = new Map(); // « x:y » -> nombre de flottes déjà placées sur la case
  const eyes = session.eyes(now);
  for (const p of Object.values(session.state.players)) {
    for (const f of p.fleets || []) {
      if (!session.sees(p, f, now, eyes)) continue; // hors de ma portée de détection
      if (moving(f, now)) {
        const pos = fleetPos(f, now);
        out.push({ p, f, x: pos.x, y: pos.y, ang: Math.atan2(f.to.y - f.from.y, f.to.x - f.from.x), moving: true });
        continue;
      }
      const key = `${f.to.x}:${f.to.y}`;
      const i = parked.get(key) || 0;
      parked.set(key, i + 1);
      const a = -Math.PI / 4 + i * 1.1;
      out.push({ p, f, x: f.to.x + 0.36 * Math.cos(a), y: f.to.y + 0.36 * Math.sin(a), ang: -Math.PI / 2, moving: false });
    }
  }
  return out;
}

/**
 * Toucher la carte : une de mes flottes la sélectionne ; flotte
 * sélectionnée, une case l'y envoie ; sinon ma planète ouvre ses bâtiments,
 * une autre montre ses gisements.
 */
$('map').addEventListener('click', (e) => {
  if (!session?.state) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const size = rect.width / UNIVERSE.w; // en pixels CSS (le canvas, lui, est à l'échelle de l'écran)
  const fx = (e.clientX - rect.left) / size - 0.5;
  const fy = (e.clientY - rect.top) / size - 0.5;

  // Planète et flotte les plus proches du doigt : la plus proche gagne (une
  // flotte en orbite est à côté du centre de sa planète, pas dessus).
  let best = null;
  for (const w of mapPlanets()) {
    const d = Math.hypot(w.x - fx, w.y - fy);
    if (d < 1.2 && (!best || d < best.d)) best = { w, d };
  }
  const now = session.now();
  const dist = (s) => Math.hypot(s.x - fx, s.y - fy);
  // Toucher large : une case fait ~16 px sur un téléphone. Plusieurs flottes sous le doigt : chaque toucher passe à la suivante.
  // Une flotte déjà choisie : toucher une case voisine l'y envoie, au lieu de choisir une flotte en orbite à côté.
  const tap = { x: Math.round(fx), y: Math.round(fy) };
  const hits = fleetSpots(now)
    .filter((s) => s.p.id === session.me && dist(s) < 0.7 && (!selFleet || sameCell({ x: Math.round(s.x), y: Math.round(s.y) }, tap)))
    .sort((a, b) => dist(a) - dist(b));
  if (hits.length && (!best || dist(hits[0]) < best.d)) {
    const i = hits.findIndex((s) => s.f.id === selFleet);
    selFleet = hits[(i + 1) % hits.length].f.id;
    pending = null;
    prey = null;
    selected = null;
    renderPick();
    renderFleetInfo();
    return;
  }
  if (selFleet && session.myFleet(selFleet)) {
    // Une flotte ennemie sous le doigt (plus près qu'une planète) : proposer la poursuite.
    const foe = fleetSpots(now)
      .filter((s) => s.p.id !== session.me && dist(s) < 0.7)
      .sort((a, b) => dist(a) - dist(b))[0];
    if (foe && (!best || dist(foe) < best.d)) {
      prey = { pid: foe.p.id, id: foe.f.id };
      pending = null;
      renderFleetInfo();
      return;
    }
    prey = null;
    const cell = { x: Math.round(fx), y: Math.round(fy) };
    if (cell.x < 0 || cell.y < 0 || cell.x >= UNIVERSE.w || cell.y >= UNIVERSE.h) return;
    const opts = session.ordersAt(selFleet, cell);
    if (opts.length === 1 && !opts[0].short) {
      pending = null;
      session.moveFleet(selFleet, cell, opts[0].kind);
    } else pending = cell;
    renderFleetInfo();
    return;
  }

  if (!best) {
    selected = null;
    return renderPick();
  }
  // Une de mes planètes aussi : sa fiche s'ouvre sur la carte (chantier, décollage), « Bâtiments » mène à l'écran planète.
  const { w } = best;
  selected = { x: w.x, y: w.y };
  renderPick();
});

/** Fiche de la flotte sélectionnée : son état, ses ordres, et le choix en attente sur une planète. */
function renderFleetInfo(me = session?.state?.players[session.me], now = session?.now()) {
  if (!session?.state) return;
  const f = selFleet && session.myFleet(selFleet);
  if (!f) {
    selFleet = null;
    pending = null;
    prey = null;
  }
  $('fleet-info').hidden = !f;
  if (!f) return;
  const go = moving(f, now);
  const pos = fleetPos(f, now);
  $('fi-where').textContent = `[${Math.round(pos.x)}:${Math.round(pos.y)}]`;
  setHtml($('fi-ships'), shipsLine(me.race, f));
  $('fi-name').textContent = fleetName(f);
  const speed = speedText(me.race, f.ships, me.planet.tech);
  $('fi-status').textContent = `${fleetStatus(me.race, f, now)}${go ? ` · ${clock(f.arrive - now)}` : ''}${speed ? ` · ${speed}` : ''}`;
  const here = !go && session.planetsAt(f.to)[0];
  const fuel = fuelAt(f, me.race, now);
  const tank = fleetTank(me.race, f.ships);
  const range = Math.floor(fuel / Math.max(1e-9, fleetBurn(me.race, f.ships)));
  $('fi-fuel').textContent = `${fuelText(me.race, f, now)} · ${range} case${range > 1 ? 's' : ''} d’autonomie`;
  $('fi-fuel-bar').style.width = `${Math.min(100, (fuel / Math.max(1, tank)) * 100)}%`;
  $('fi-fuel').parentElement.classList.toggle('low', fuel < tank * 0.25);
  const mine = here && here.owner.id === session.me;
  $('btn-fi-stop').hidden = !go && f.order?.kind !== 'chase';
  $('btn-fi-dock').hidden = !mine;
  $('btn-fi-return').hidden = !!mine && here.key === 'home'; // déjà chez elle
  $('btn-fi-refuel').hidden = !mine || fuel >= tank - 0.5;
  $('btn-fi-split').hidden = go || countShips(f.ships) < 2;
  const hawk = aggressive(f);
  const stance = $('btn-fi-stance');
  stance.hidden = !hawk && !armed(me.race, f.ships, me.planet?.tech);
  stance.className = `${hawk ? 'primary' : 'secondary'} small icon-only`;
  stance.setAttribute('aria-pressed', String(hawk));
  stance.title = hawk ? 'Agressive : combat toute flotte ennemie qu’elle croise. Toucher pour la rendre passive' : 'Passive : ne combat que sur ordre. Toucher pour la rendre agressive';
  renderBeside(me, f, now);
  renderPartners($('fi-partners'), go ? null : { fleet: f.id });
  const choice = pending ? session.ordersAt(selFleet, pending) : [];
  const warn = choice[0]?.short ? ' · panne en route' : '';
  const foe = prey && session.state.players[prey.pid];
  const html = foe
    ? `<button class="primary small" data-fchase>${ic('attack')}Attaquer · ${esc(foe.name)}</button>`
    : choice
        .map((o) => `<button class="${o.kind === 'move' ? 'secondary' : 'primary'} small" data-forder="${o.kind}">${esc(o.label + warn)}</button>`)
        .join('');
  $('fi-choice').hidden = !html;
  if ($('fi-choice').dataset.html !== html) {
    $('fi-choice').innerHTML = html;
    $('fi-choice').dataset.html = html;
  }
}

/** Mes flottes sous la carte, en grille : une case par flotte, pour la sélectionner sans la chercher. */
function renderMapFleets(me = session?.state?.players[session.me], now = session?.now()) {
  const box = $('map-fleets');
  const fleets = me?.fleets || [];
  box.hidden = !fleets.length;
  // Le statut change rarement, le compte à rebours chaque seconde : on ne réécrit le HTML que
  // pour le premier (redessiner sous le doigt ferait rater le toucher), le reste en place.
  const html = fleets
    .map((f) => {
      const hot = ['attack', 'conquer', 'chase'].includes(f.order?.kind);
      const dry = fuelAt(f, me.race, now) < DRY;
      const ships = SHIP_KEYS.filter((k) => f.ships[k])
        .map((k) => `<span title="${esc(SHIPS[me.race][k].name)}">${ic(k)}${f.ships[k]}</span>`)
        .join('');
      return `<button class="mf${hot ? ' hot' : ''}${dry ? ' dry' : ''}" data-fleet="${esc(f.id)}">
        <span class="mf-top"><strong>${esc(fleetName(f))}</strong><span class="mf-clock"></span></span>
        <span class="mf-ships">${ships}</span>
        <span class="mf-status">${esc(fleetStatus(me.race, f, now))}</span></button>`;
    })
    .join('');
  if (box.dataset.html !== html) {
    box.innerHTML = html;
    box.dataset.html = html;
  }
  for (const b of box.children) {
    const f = fleets.find((x) => x.id === b.dataset.fleet);
    b.setAttribute('aria-pressed', String(b.dataset.fleet === selFleet));
    b.querySelector('.mf-clock').textContent = f && moving(f, now) ? clock(f.arrive - now) : '';
  }
}

$('map-fleets').addEventListener('click', (e) => {
  const id = e.target.closest('[data-fleet]')?.dataset.fleet;
  if (!id) return;
  selFleet = selFleet === id ? null : id; // retoucher la flotte choisie la relâche
  pending = null;
  prey = null;
  renderFleetInfo();
  renderMapFleets();
});

$('fi-choice').addEventListener('click', (e) => {
  if (e.target.closest('[data-fchase]') && prey) {
    session.chaseFleet(selFleet, prey.pid, prey.id);
    prey = null;
    return renderFleetInfo();
  }
  const kind = e.target.closest('[data-forder]')?.dataset.forder;
  if (!kind || !pending) return;
  session.moveFleet(selFleet, pending, kind);
  pending = null;
  renderFleetInfo();
});
$('btn-fi-stop').onclick = () => session.stopFleet(selFleet) && renderFleetInfo();
$('btn-fi-stance').onclick = () => {
  const f = session.myFleet(selFleet);
  if (f && session.setFleetStance(selFleet, aggressive(f) ? 'passive' : 'aggressive')) {
    toast(`Flotte ${aggressive(f) ? 'agressive : elle combattra toute flotte ennemie qu’elle croise' : 'passive : elle ne combattra que sur ordre'}.`);
    renderFleetInfo();
  }
};
$('btn-fi-refuel').onclick = () => session.refuelFleet(selFleet) && renderFleetInfo();
$('btn-fi-return').onclick = () => session.returnFleet(selFleet) && renderFleetInfo();
$('btn-fi-dock').onclick = () => {
  const f = session.myFleet(selFleet);
  if (f) session.moveFleet(selFleet, f.to, 'dock');
  renderFleetInfo();
};
$('btn-fi-close').onclick = () => {
  selFleet = null;
  pending = null;
  prey = null;
  renderFleetInfo();
};

// ---------------------------------------------------------------------------
// Échanges entre joueurs
// ---------------------------------------------------------------------------

/** « 100 minéraux, 20 carburant », ou « rien ». */
function tradeText(a) {
  const parts = TRADE_RES.filter((r) => a?.[r]).map((r) => `${fmt(a[r])} ${TRADE_NAMES[r].toLowerCase()}`);
  return parts.length ? parts.join(', ') : 'rien';
}

/** Les autres joueurs sur la même case que `fromRef` : un bouton « Proposer un échange » pour chacun. */
function renderPartners(box, fromRef) {
  const list = fromRef ? session.tradePartners(fromRef) : [];
  const html = list.length
    ? `<p class="hint">Ici :</p>${list
        .map(
          (x) => `<div class="row"><span>${esc(x.name)}</span>
            <button class="secondary small" data-trade='${esc(JSON.stringify({ from: fromRef, pid: x.pid, ref: x.ref, name: x.name }))}' title="Proposer un échange" aria-label="Proposer un échange à ${esc(x.name)}">${ic('trade')}</button></div>`,
        )
        .join('')}`
    : '';
  box.hidden = !html;
  if (box.dataset.html !== html) {
    box.innerHTML = html;
    box.dataset.html = html;
  }
}

let tradeSheet = null; // { from, pid, ref, name }

function openTradeSheet(t) {
  const mine = session.tradeHoldings(session.me, t.from);
  const theirs = session.tradeHoldings(t.pid, t.ref);
  if (!mine || !theirs) return toast('Les deux parties doivent être arrêtées sur la même case.');
  tradeSheet = t;
  $('trade-title').textContent = `Échange avec ${t.name}`;
  const grid = (key, have) =>
    TRADE_RES.map((r) => `<label>${TRADE_NAMES[r]} (${fmt(have[r])})<input type="number" inputmode="numeric" min="0" value="0" data-${key}="${r}"></label>`).join('');
  $('trade-give').innerHTML = grid('tgive', mine);
  $('trade-want').innerHTML = grid('twant', theirs);
  $('sheet-trade').hidden = false;
}

const readTrade = (key) => Object.fromEntries([...document.querySelectorAll(`[data-${key}]`)].map((el) => [el.dataset[key], Math.max(0, Math.floor(Number(el.value) || 0))]));

for (const box of ['fi-partners', 'planet-partners']) {
  $(box).addEventListener('click', (e) => {
    const raw = e.target.closest('[data-trade]')?.dataset.trade;
    if (raw) openTradeSheet(JSON.parse(raw));
  });
}
$('btn-trade-close').onclick = () => ($('sheet-trade').hidden = true);
$('btn-trade-go').onclick = () => {
  if (!tradeSheet) return;
  const ok = session.proposeTrade(tradeSheet.from, { pid: tradeSheet.pid, ...tradeSheet.ref }, readTrade('tgive'), readTrade('twant'));
  if (!ok) return;
  $('sheet-trade').hidden = true;
  toast('Échange proposé : réponse sous 5 minutes.');
};

/** Sur la carte : les offres qu'on me fait (accepter / refuser) et celles que j'attends. */
function renderTrades(me, now) {
  if (!me) return;
  const incoming = session.incomingOffers().map(
    ({ from, offer }) => `<div class="card trade"><p><strong>${esc(from.name)}</strong> te propose : il donne ${esc(tradeText(offer.give))}, il demande ${esc(tradeText(offer.want))}. <span class="mono" data-left="${Number(offer.expires) || 0}"></span></p>
      <div class="fi-actions"><button class="primary small" data-accept="${esc(from.id)}:${esc(offer.id)}" title="Accepter" aria-label="Accepter">${ic('check')}</button>
      <button class="secondary small" data-refuse="${esc(from.id)}:${esc(offer.id)}" title="Refuser" aria-label="Refuser">${ic('close')}</button></div></div>`,
  );
  const mine = (me.offers || []).map((o) => {
    const to = session.state.players[o.to.pid];
    return `<div class="card trade mine"><p>Échange proposé à ${esc(to?.name || '?')} : tu donnes ${esc(tradeText(o.give))}, tu demandes ${esc(tradeText(o.want))}. <span class="mono" data-left="${Number(o.expires) || 0}"></span></p></div>`;
  });
  // HTML stable (redessiner sous le doigt ferait rater le toucher sur « Accepter ») ;
  // seuls les comptes à rebours changent.
  const html = [...incoming, ...mine].join('');
  $('trades').hidden = !html;
  if ($('trades').dataset.html !== html) {
    $('trades').innerHTML = html;
    $('trades').dataset.html = html;
  }
  for (const el of $('trades').querySelectorAll('[data-left]')) {
    const left = Number(el.dataset.left) - now;
    el.textContent = left > 0 ? clock(left) : 'expiré, en attente de réponse';
  }
}

$('trades').addEventListener('click', (e) => {
  const acc = e.target.closest('[data-accept]')?.dataset.accept;
  const ref = e.target.closest('[data-refuse]')?.dataset.refuse;
  const [pid, id] = (acc || ref || '').split(':');
  if (pid && id) session.answerTrade(pid, id, !!acc);
});

/** Mes autres flottes arrêtées sur la même case : leur donner une partie de la mienne, ou les fusionner. */
function renderBeside(me, f, now) {
  const others = session.fleetsBeside(f.id);
  const html = others
    .map(
      (g) => `<div class="row"><span>${esc(fleetName(g))} · ${countShips(g.ships)} vaisseau${countShips(g.ships) > 1 ? 'x' : ''} · ${esc(fuelText(me.race, g, now))}</span>
        <button class="secondary small" data-give="${esc(g.id)}" title="Donner" aria-label="Donner">${ic('give')}</button>
        <button class="secondary small" data-merge="${esc(g.id)}" title="Fusionner ici" aria-label="Fusionner ici">${ic('merge')}</button></div>`,
    )
    .join('');
  $('fi-beside').hidden = !others.length;
  const full = others.length ? `<p class="hint">Ici :</p>${html}` : '';
  if ($('fi-beside').dataset.html !== full) {
    $('fi-beside').innerHTML = full;
    $('fi-beside').dataset.html = full;
  }
}

$('fi-beside').addEventListener('click', (e) => {
  const give = e.target.closest('[data-give]')?.dataset.give;
  const into = e.target.closest('[data-merge]')?.dataset.merge;
  if (give) openMoveSheet('give', give);
  // « Fusionner ici » : l'autre flotte rejoint celle qui est sélectionnée.
  if (into && session.mergeFleets(into, selFleet)) renderFleetInfo();
});

let moveSheet = null; // { kind: 'give' | 'split', to }

/** Fenêtre « Donner » (vers une autre de mes flottes) ou « Scinder » (vers une nouvelle). */
function openMoveSheet(kind, to = null) {
  const me = session.state.players[session.me];
  const f = session.myFleet(selFleet);
  const target = to && session.myFleet(to);
  if (!f || (kind === 'give' && !target)) return;
  moveSheet = { kind, to };
  const now = session.now();
  $('move-title').textContent = kind === 'give' ? `${fleetName(f)} → ${fleetName(target)}` : `Scinder la ${fleetName(f).toLowerCase()}`;
  $('move-hint').textContent =
    kind === 'give'
      ? 'Ce que la flotte sélectionnée donne à l’autre. Il doit lui rester au moins un vaisseau, et les soutes et réservoirs de chacune doivent suffire.'
      : 'Ce qui part former une nouvelle flotte, au même endroit. Chacune garde au moins un vaisseau.';
  $('move-ships').innerHTML = SHIP_KEYS.filter((k) => f.ships[k])
    .map((k) => `<label>${esc(SHIPS[me.race][k].name)} (${f.ships[k]})<input type="number" inputmode="numeric" min="0" max="${f.ships[k]}" value="0" data-mship="${k}"></label>`)
    .join('');
  const fuel = Math.floor(fuelAt(f, me.race, now));
  $('move-load').innerHTML =
    SOIL.map(
      (r) => `<label>${RES_INFO[r].name} (${fmt(f.cargo?.[r] || 0)})<input type="number" inputmode="numeric" min="0" max="${f.cargo?.[r] || 0}" value="0" data-mcargo="${r}"></label>`,
    ).join('') + `<label>Carburant (${fuel})<input type="number" inputmode="numeric" min="0" max="${fuel}" value="0" data-mfuel></label>`;
  $('btn-move-go').innerHTML = kind === 'give' ? ic('give') + 'Donner' : ic('split') + 'Scinder';
  $('sheet-move').hidden = false;
}

$('btn-fi-split').onclick = () => openMoveSheet('split');
$('btn-move-close').onclick = () => ($('sheet-move').hidden = true);
$('btn-move-go').onclick = () => {
  const part = { ships: {}, cargo: {}, fuel: 0 };
  for (const el of document.querySelectorAll('[data-mship]')) part.ships[el.dataset.mship] = Math.max(0, Math.floor(Number(el.value) || 0));
  for (const el of document.querySelectorAll('[data-mcargo]')) part.cargo[el.dataset.mcargo] = Math.max(0, Math.floor(Number(el.value) || 0));
  part.fuel = Math.max(0, Math.floor(Number(document.querySelector('[data-mfuel]')?.value) || 0));
  const ok = moveSheet?.kind === 'give' ? session.transferFleet(selFleet, moveSheet.to, part) : session.splitFleet(selFleet, part);
  if (!ok) return;
  $('sheet-move').hidden = true;
  renderFleetInfo();
};

/** Bandeau de choix de la planète de départ et fiche de la planète touchée. */
function renderPick(me = session?.state?.players[session.me], now = session?.now()) {
  if (!session?.state) return;
  const picking = !me?.home && !me?.out;
  $('pick').hidden = !picking;
  const w = selected && mapPlanets().find((x) => sameCell(x, selected));
  $('sheet-planet').hidden = !w;
  if (!w) return;
  const o = w.owner;
  $('pi-name').textContent = w.name;
  $('pi-where').textContent = `[${w.x}:${w.y}]`;
  $('pi-owner').textContent = o
    ? `${o.id === session.me ? `${w.kind === 'asteroid' ? 'Ton' : 'Ta'} ${kindLabel(w.kind).toLowerCase()}` : `${kindLabel(w.kind)} ${de(o.name)}`}${o.race ? ` · ${RACES[o.race].name}` : ''}`
    : `${kindLabel(w.kind)} libre. Ses gisements se vident quand on les exploite, et se reconstituent d’eux-mêmes jusqu’à leur maximum.`;
  // Gisements : pleins pour une planète libre, calculés chez son propriétaire sinon.
  const planet = w.pl?.planet;
  const s = planet ? stateAt(planet, now) : null;
  const nature = o ? planet?.nature : w.nature;
  showClimate($('pi-climate'), o ? planet?.climate : w.climate);
  const places = o ? planet?.places : w.places;
  $('pi-size').hidden = !places;
  $('pi-size').textContent = places
    ? `${kindLabel(w.kind)} · ${planet ? `${usedPlaces(stateAt(planet, now).levels)} / ${places}` : places} places${!o && w.kind !== 'planet' ? ' · à coloniser' : ''}`
    : '';
  if (o && s) {
    const n = countShips(s.ships);
    $('pi-owner').textContent += `${w.pl.key === 'home' ? '' : ' · colonie'} · ${n ? `${n} vaisseau${n > 1 ? 'x' : ''} à quai` : 'aucun vaisseau à quai'}`;
  }
  const box = $('pi-soil');
  if (!nature) box.innerHTML = '';
  else {
    if (!box.firstChild) box.innerHTML = soilTiles('pi');
    fillSoil('pi', nature, s ? s.reserve : w.reserve, s ? s.prod.soil : null);
  }
  $('btn-claim').hidden = !picking || !!o || (w.kind && w.kind !== 'planet');
  $('btn-claim').innerHTML = `${ic('dock')}S'installer · ${esc(w.name)}`;
  $('btn-open-planet').hidden = o?.id !== session.me || !w.pl;
  $('btn-open-planet').dataset.key = w.pl?.key || 'home';
  renderPickYard(me, o?.id === session.me && w.pl ? w.pl : null, s, now);
}

/** Chantier et décollage dans la fiche d'une de mes planètes, sur la carte. */
function renderPickYard(me, pl, s, now) {
  $('pi-yard').hidden = !pl || !s;
  if (!pl || !s) return;
  const yard = s.levels.yard || 0;
  const busy = s.yard ? `En chantier : ${s.yard.count} × ${SHIPS[me.race][s.yard.type].name} · ${clock(Math.max(0, s.yard.end - now))}` : '';
  $('pi-yard-hint').textContent = !yard ? `🔒 Il faut un ${RACES[me.race].buildings.yard.name}.` : busy;
  $('pi-yard-hint').hidden = !$('pi-yard-hint').textContent;
  $('pi-ships').hidden = !yard;
  for (const k of SHIP_KEYS) {
    const row = document.querySelector(`[data-piship="${k}"]`);
    const unlocked = shipUnlocked(me.race, k, s.tech);
    row.hidden = !unlocked; // seulement ce que cette planète sait construire
    if (!unlocked) {
      for (const btn of row.querySelectorAll('[data-pi-ship]')) btn.disabled = true;
      continue;
    }
    const max = shipsAffordable(me.race, k, s.stock);
    row.classList.toggle('affordable', max >= 1);
    setHtml(document.querySelector(`[data-picost="${k}"]`), `${costText(SHIPS[me.race][k].cost)} · ${clock(shipDuration(me.race, k, 1, Math.max(1, yard)))}/u`);
    document.querySelector(`[data-pinote="${k}"]`).textContent = [s.ships[k] ? `${s.ships[k]} à quai` : '', `jusqu’à ${max}`].filter(Boolean).join(' · ');
    for (const btn of row.querySelectorAll('[data-pi-ship]')) {
      const n = btn.dataset.n === 'max' ? max : Number(btn.dataset.n);
      btn.disabled = !canBuildShips(me, s, k, n);
      if (btn.dataset.n === 'max') btn.textContent = max ? `×${max}` : 'Max';
    }
  }
  if (yard && !busy && !SHIP_KEYS.some((k) => shipUnlocked(me.race, k, s.tech))) {
    $('pi-yard-hint').textContent = 'Aucun vaisseau recherché pour l’instant : lance une recherche.';
    $('pi-yard-hint').hidden = false;
  }
  $('btn-pi-takeoff').hidden = !countShips(s.ships);
  $('btn-pi-takeoff').dataset.key = pl.key;
}

$('pi-ships').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-pi-ship]');
  const key = $('btn-open-planet').dataset.key;
  if (!btn || btn.disabled || !session?.state) return;
  const me = session.state.players[session.me];
  const pl = session.planetOf(me, key);
  if (!pl) return;
  const n = btn.dataset.n === 'max' ? shipsAffordable(me.race, btn.dataset.piShip, stateAt(pl.planet, session.now()).stock) : Number(btn.dataset.n);
  session.buildShips(btn.dataset.piShip, n, key);
});
$('btn-pi-takeoff').onclick = (e) => {
  const key = e.currentTarget.dataset.key || 'home';
  selected = null; // la fiche de la planète se ferme, le formulaire de décollage prend sa place
  renderPick();
  openFleetSheet(key);
};

/** Ferme la fiche de la planète : bouton Fermer, ou toucher le fond sombre autour. */
function closePlanetSheet() {
  selected = null;
  renderPick();
}
$('btn-planet-close').onclick = closePlanetSheet;

$('btn-claim').onclick = () => {
  const w = selected && session.planets.find((x) => sameCell(x, selected));
  if (!w || !session.claimPlanet(w.id)) return;
  selected = null;
  buildStatic();
  renderPick();
  showView('planet');
};

// ---------------------------------------------------------------------------
// Démarrage : lien d'invitation dans l'adresse ?
// ---------------------------------------------------------------------------

async function boot() {
  const hash = location.hash.slice(1);
  if (hash) {
    history.replaceState(null, '', location.pathname);
    try {
      const { kind } = await decode(hash);
      if (kind === 'o') {
        if ($('name').value.trim()) return startJoin(hash);
        $('home-note').textContent = 'Invitation reçue. Choisis ton nom, puis appuie sur « Rejoindre une partie ».';
        $('home-note').hidden = false;
        $('btn-join').onclick = () => playerName() && startJoin(hash);
        return show('home');
      }
      $('home-note').textContent =
        "Ce lien est la réponse d'un joueur : colle-la dans l'écran d'invitation de ta partie en cours, sur le téléphone qui l'a invité.";
      $('home-note').hidden = false;
    } catch (e) {
      $('home-note').textContent = e.message;
      $('home-note').hidden = false;
    }
  }
  show('home');
}

showSaved();
boot();
// Lien d'invitation ouvert alors que l'appli est déjà affichée dans cet onglet.
window.addEventListener('hashchange', () => location.hash.length > 1 && !session && boot());

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
