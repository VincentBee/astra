import { Session } from './session.js';
import { loadGame, describeSave } from './save.js';
import { inviteLink, drawQr, decode } from './invite.js';
import { scanQr } from './scanner.js';
import {
  RACES, RACE_KEYS, RES_INFO, POWERS, POWER_KEYS, stateAt, upgradeCost, buildDuration, covers, score, power,
  powerReadyAt, powerCost, fmt, UNIVERSE, SOIL, sameCell,
} from './game.js';
import { TECHS, SHIPS, SHIP_KEYS, techCost, techMissing, researchDuration, shipUnlock, shipUnlocked, shipStats, shipDuration } from './tech.js';
import { TRADE_RES, TRADE_NAMES } from './trade.js';
import { ORDERS, countShips, fleetCargo, fleetPos, fleetTank, fleetBurn, fuelAt, moving } from './fleet.js';

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

let toastTimer;
function toast(text) {
  const t = $('toast');
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 3200);
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

// Partie sauvegardée sur ce téléphone : la reprendre, ou en créer une autre.
let confirmNew = false;
function showSaved() {
  const saved = loadGame();
  $('saved').hidden = !saved;
  $('btn-create').textContent = saved ? 'Nouvelle partie' : 'Créer une partie';
  $('btn-create').className = saved ? 'secondary' : 'primary';
  $('new-warning').hidden = true;
  confirmNew = false;
  if (!saved) return;
  const d = describeSave(saved);
  $('saved-names').textContent = d.names.join(', ');
  const when = new Date(d.savedAt);
  const sameDay = when.toDateString() === new Date().toDateString();
  const time = when.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  $('saved-when').textContent = `Tu y joues sous le nom ${d.me || '?'} · dernière activité ${
    sameDay ? `aujourd'hui à ${time}` : `le ${when.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à ${time}`
  }.`;
}

$('btn-resume').onclick = () => {
  const saved = loadGame();
  if (!saved) return showSaved();
  session = Session.resume(saved);
  session.ontoast = toast;
  session.onchange = onSessionChange;
  startGame();
  toast('Partie reprise. Les autres te retrouveront dès qu’ils ouvriront l’appli.');
};

window.addEventListener('pagehide', () => session?.save?.());

$('btn-create').onclick = async () => {
  const name = playerName();
  if (!name) return;
  if (loadGame() && !confirmNew) {
    confirmNew = true;
    $('new-warning').hidden = false;
    return;
  }
  session = await Session.create(name);
  session.ontoast = toast;
  session.onchange = onSessionChange;
  inviteAfterRace = true; // la fenêtre d'invitation s'ouvre une fois la planète choisie
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

$('btn-invite').onclick = openInviteSheet;
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

let inviteAfterRace = false;
let pickedRace = null;

function showRace() {
  pickedRace = null;
  $('races').innerHTML = RACE_KEYS.map((k) => {
    const R = RACES[k];
    const res = R.resources.map((r) => `<span class="chip ${r}">${RES_INFO[r].name}</span>`).join('');
    return `<button class="race card" role="radio" aria-checked="false" data-race="${k}" style="--race:${R.color}">
      <span class="race-top"><span class="race-icon" aria-hidden="true">${R.icon}</span><span class="race-name">${R.name}</span></span>
      <span class="race-pitch">${esc(R.pitch)}</span>
      <ul class="race-traits">${R.traits.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <span class="chips">${res}${R.pop ? `<span class="chip pop">${R.pop.label}</span>` : '<span class="chip none">Sans population</span>'}</span>
    </button>`;
  }).join('');
  updateRacePick();
  renderRaceOthers();
  show('race');
}

function updateRacePick() {
  for (const el of document.querySelectorAll('[data-race]')) el.setAttribute('aria-checked', String(el.dataset.race === pickedRace));
  const btn = $('btn-race');
  btn.disabled = !pickedRace;
  btn.textContent = pickedRace ? `Jouer les ${RACES[pickedRace].name} (définitif)` : 'Choisis une race';
}

/** Ce qu'ont choisi les autres, pour se décider. */
function renderRaceOthers() {
  if (!session?.state) return;
  const others = Object.values(session.state.players).filter((p) => p.id !== session.me);
  $('race-others').textContent = others.length
    ? 'Dans la partie : ' + others.map((p) => `${p.name} (${p.race ? RACES[p.race].name : 'en train de choisir'})`).join(', ') + '.'
    : '';
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
  renderState();
  clearInterval(liveTimer);
  liveTimer = setInterval(renderLive, 200);
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
    (r) => `<div class="tile ${r}">${spark(r)}
      <span class="label">${RES_INFO[r].name}</span>
      <span class="amount mono" data-res="${r}">0</span>
      <span class="rate mono" data-rate="${r}"></span>
      <div class="gauge"><div class="gauge-fill" data-gauge="${r}"></div></div>
    </div>`,
  );
  if (R.pop) {
    tiles.push(`<div class="tile pop">${spark('pop')}<span class="label">${R.pop.label}</span>
      <span class="amount mono" data-pop></span>
      <span class="rate mono" data-poprate></span>
      <span class="rate mono" data-popextra></span>
      <div class="gauge"><div class="gauge-fill" data-popgauge></div></div></div>`);
  } else {
    tiles.push(`<div class="tile grid">${spark('grid')}<span class="label">Réseau</span>
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
      <div class="b-head"><h4>${b.name}</h4><span class="level mono" data-level="${k}"></span></div>
      <p class="b-desc">${esc(b.desc)}</p>
      <p class="cost mono" data-cost="${k}"></p>
      <button class="secondary small" data-build="${k}">Améliorer</button>
    </article>`,
    )
    .join('');

  $('techs').innerHTML = Object.entries(TECHS[race])
    .map(
      ([k, t]) => `<article class="building card" data-tcard="${k}">
      <div class="b-head"><h4>${esc(t.name)}</h4><span class="level mono" data-tlevel="${k}"></span></div>
      <p class="b-desc">${esc(t.desc)}</p>
      <p class="req" data-treq="${k}" hidden></p>
      <p class="cost mono" data-tcost="${k}"></p>
      <button class="secondary small" data-research="${k}">Rechercher</button>
    </article>`,
    )
    .join('');

  $('ships').innerHTML = SHIP_KEYS.map((k) => {
    const S = SHIPS[race][k];
    return `<article class="building card" data-scard="${k}">
      <div class="b-head"><h4>${esc(S.name)}</h4><span class="level mono" data-sdocked="${k}"></span></div>
      <p class="ship-stats" data-sstats="${k}"></p>
      <p class="req" data-sreq="${k}" hidden></p>
      <p class="cost mono" data-scost="${k}"></p>
      <div class="ship-actions">
        <button class="secondary small" data-ship="${k}" data-n="1">×1</button>
        <button class="secondary small" data-ship="${k}" data-n="5">×5</button>
      </div>
    </article>`;
  }).join('');

  $('powers-zone').hidden = race !== 'alien';
  $('powers').innerHTML =
    race === 'alien'
      ? POWER_KEYS.map(
          (k) => `<article class="building power card" data-pcard="${k}">
        <div class="b-head"><h4>${POWERS[k].name}</h4><span class="level mono" data-pready="${k}"></span></div>
        <p class="b-desc">${esc(POWERS[k].desc)}</p>
        <p class="cost mono" data-pcost="${k}"></p>
        <button class="secondary small" data-power="${k}">Déclencher</button>
      </article>`,
        ).join('')
      : '';
}

/** Tuiles des gisements (minéraux et nourriture du sol), remplies par fillSoil. */
function soilTiles(prefix) {
  return SOIL.map(
    (r) => `<div class="tile ${r}" data-${prefix}-tile="${r}">${prefix === 'soil' ? spark(`soil-${r}`) : ''}
      <span class="label">${RES_INFO[r].name}</span>
      <span class="amount mono" data-${prefix}-amount="${r}"></span>
      <span class="rate mono" data-${prefix}-rate="${r}"></span>
      <span class="rate mono" data-${prefix}-detail="${r}"></span>
      <div class="gauge"><div class="gauge-fill" data-${prefix}-gauge="${r}"></div></div>
    </div>`,
  ).join('');
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
    else if (limited) rate.textContent = `Épuisé : limité à ${fmt(n.regen)} / min`;
    else if (left >= n.max - 0.5 && soil[r].got <= n.regen) rate.textContent = 'Plein : il se régénère plus vite qu’on n’extrait';
    else rate.textContent = rateText(n.regen - soil[r].got);
    rate.classList.toggle('neg', limited || (!!soil && soil[r].got > n.regen + 0.5));
    detail.textContent = soil ? `extraction ${fmt(soil[r].got)} · régénère ${fmt(n.regen)} / min` : `régénère ${fmt(n.regen)} / min`;
  }
}

$('powers').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-power]');
  if (btn && !btn.disabled) session.power(btn.dataset.power, openKey);
});
$('techs').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-research]');
  if (btn && !btn.disabled) session.research(btn.dataset.research);
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

/** « 1 234 min. · 30 én. » */
function costText(cost) {
  return Object.entries(cost)
    .filter(([, v]) => v > 0)
    .map(([r, v]) => `${fmt(v)} ${RES_INFO[r].short}`)
    .join(' · ');
}

/** Solde par minute réelle (= heure de jeu), signé. */
function rateText(v) {
  const n = Math.round(v);
  if (n === 0) return '±0 / min';
  return `${n > 0 ? '+' : '−'}${fmt(Math.abs(n))} / min`;
}

/** Résumé d'une planète pour la liste des commandants. */
function popText(race, pop) {
  const R = RACES[race];
  if (!R.pop) return null;
  const n = Math.floor(pop);
  return `${fmt(n)} ${R.pop.unit}${n > 1 ? 's' : ''}`;
}

$('buildings').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-build]');
  if (btn && !btn.disabled) session.build(btn.dataset.build, openKey);
});

/** Rendu des parties qui changent avec l'état (joueurs, journal, demandes). */
function renderState() {
  const st = session.state;
  const me = st.players[session.me];
  if (me) {
    $('me-name').textContent = me.name;
    $('me-dot').style.background = me.color;
  }
  $('me-role').textContent = me?.race ? `${RACES[me.race].icon} ${RACES[me.race].name}` : 'Commandant';
  $('lost').hidden = !session.alone;


  const players = Object.values(st.players);
  $('players').innerHTML = players
    .map(
      (p) => `<div class="player card${p.online ? '' : ' offline'}" data-player="${p.id}">
        <span class="dot" style="background:${esc(p.color)}"></span>
        <div class="p-main">
          <div class="p-name">${esc(p.name)}${p.id === session.me ? ' <span class="you">toi</span>' : ''}${
            p.race ? ` <span class="tag race-tag" style="--race:${RACES[p.race].color}">${RACES[p.race].icon} ${RACES[p.race].name}</span>` : ''
          }</div>
          <div class="p-sub mono" data-psub="${p.id}"></div>
        </div>
        <div class="p-score mono" data-pscore="${p.id}"></div>
      </div>`,
    )
    .join('');

  printLog(st.log);
  renderLive();
}

/**
 * Journal de la partie : il n'est pas affiché dans le jeu, on l'écrit dans
 * la console du navigateur (chaque entrée une seule fois, dans l'ordre).
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

function routeLabel(route) {
  return { host: 'réseau local', srflx: 'direct', prflx: 'direct', relay: 'relais' }[route] || '';
}

/** Rendu des valeurs qui bougent en continu (5 fois par seconde). */
function renderLive() {
  if (!session) return;
  const st = session.state;
  const me = st.players[session.me];
  const now = session.now();

  {
    const online = session.peerCount;
    const rtts = [...session.links.values()].map((l) => l.rtt).filter((v) => v != null);
    const worst = rtts.length ? Math.max(...rtts) : null;
    $('net').textContent = online
      ? `${online} joueur${online > 1 ? 's' : ''} en ligne${worst != null ? ` · ${worst} ms` : ''}`
      : 'seul en ligne';
    $('net').className = 'net' + (worst != null && worst > 250 ? ' slow' : '');
  }

  if (me?.planet) {
    if (builtFor !== me.race) buildStatic();
    renderPlanet(me, now);
  } else if (currentView === 'planet') showView('map');
  renderPick(me, now);
  renderFleetInfo(me, now);
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
    sub.textContent = [`${fmt(s.stock.minerals)} min.`, people, doing, ...space, net].filter(Boolean).join(' · ');
    scoreEl.textContent = `${score(p.race, s.levels)} pts`;
  }
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
  if (planet.nature) fillSoil('soil', planet.nature, s.reserve, f.soil);

  for (const r of R.resources) {
    const cap = f.caps[r];
    q(`[data-res="${r}"]`).innerHTML = withCap(s.stock[r], cap);
    const short = r === 'energy' ? f.effE < 1 : r === 'food' ? f.effF < 1 : false;
    const rate = q(`[data-rate="${r}"]`);
    rate.textContent = short
      ? `Pénurie · ${Math.round((r === 'energy' ? f.effE : f.effF) * 100)} % servis`
      : s.stock[r] >= cap && f.net[r] >= 0
        ? `Stock plein (${fmt(cap)})`
        : rateText(f.net[r]);
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
      extra.textContent = `${fmt(active)} actifs / ${fmt(people)} habitants${vacant ? ` · ${fmt(vacant)} postes vides` : ''}`;
      extra.classList.toggle('neg', vacant > 0);
    } else {
      q('[data-pop]').innerHTML = withCap(s.pop, cap);
      const starving = Math.min(f.effE, f.effF) < 1;
      const next = (Math.floor(s.pop) + 1 - s.pop) / 0.06; // heures de jeu = minutes réelles
      rate.textContent = starving
        ? 'Ils dépérissent !'
        : s.pop >= cap - 1e-6
          ? `Sanctuaire plein (${fmt(cap)})`
          : `Naissance dans ${Math.ceil(next)} min`;
      extra.textContent = `Puissance ≈ ${fmt(power(me.race, s.pop))} humains`;
    }
    rate.classList.toggle('neg', delta < -0.01 || f.effF < 1 || (me.race === 'alien' && f.effE < 1));
  } else {
    q('[data-grid]').textContent = `${Math.round(f.effE * 100)} %`;
    q('[data-gridrate]').textContent = `Prod. ${fmt(f.in.energy)} · conso. ${fmt(f.out.energy / Math.max(f.effE, 1e-9))}`;
    q('[data-gridextra]').textContent = f.effE < 1 ? 'Foreuses au ralenti' : 'Tout tourne à plein';
    q('[data-gridrate]').classList.toggle('neg', f.effE < 1);
  }

  for (const k of Object.keys(R.buildings)) {
    const level = s.levels[k] || 0;
    const cost = upgradeCost(me.race, k, level);
    const ok = covers(s.stock, cost);
    q(`[data-level="${k}"]`).textContent = `Niv. ${level}`;
    q(`[data-cost="${k}"]`).textContent = `${costText(cost)} · ${buildDuration(me.race, s.levels, cost) / 1000} s`;
    const card = q(`[data-card="${k}"]`);
    card.classList.toggle('affordable', ok && !s.queue);
    card.classList.toggle('building-now', s.queue?.key === k);
    const btn = q(`[data-build="${k}"]`);
    btn.disabled = !!s.queue || !ok || session.status !== 'playing';
    btn.textContent = s.queue?.key === k ? 'En chantier' : `Niveau ${level + 1}`;
  }

  if (s.queue) {
    const total = s.queue.end - s.queue.start;
    const left = Math.max(0, s.queue.end - now);
    $('queue').hidden = false;
    $('queue-label').textContent = `${R.buildings[s.queue.key].name} → niv. ${s.queue.level}`;
    $('queue-left').textContent = `${Math.ceil(left / 1000)} s`;
    $('queue-bar').style.width = `${Math.min(100, (1 - left / total) * 100)}%`;
  } else $('queue').hidden = true;

  if (me.race === 'alien') {
    const trance = Math.max(0, (planet.trance || 0) - now);
    for (const k of POWER_KEYS) {
      const cost = powerCost(planet, k, s.pop);
      const wait = Math.max(0, powerReadyAt(planet, k) - now);
      const ok = covers(s.stock, cost);
      q(`[data-pcost="${k}"]`).textContent = `${costText(cost)} · recharge ${POWERS[k].cooldown / 60000} min`;
      q(`[data-pready="${k}"]`).textContent = k === 'trance' && trance ? `En transe ${clock(trance)}` : wait ? clock(wait) : 'Prêt';
      q(`[data-pcard="${k}"]`).classList.toggle('affordable', ok && !wait);
      const btn = q(`[data-power="${k}"]`);
      btn.disabled = !!wait || !ok || session.status !== 'playing';
      btn.textContent = wait ? 'En recharge' : 'Déclencher';
    }
  }

  renderResearch(me, pl, s, now);
  renderYard(me, pl, s, now);
  renderFleets(me, pl, s, now);
  renderPartners($('planet-partners'), { planet: pl.key });
}

/** Barre de progression d'une file (chantier, recherche, chantier naval). */
function progress(prefix, job, label, now) {
  $(`${prefix}-queue`).hidden = !job;
  if (!job) return;
  const left = Math.max(0, job.end - now);
  $(`${prefix}-label`).textContent = label;
  $(`${prefix}-left`).textContent = clock(left);
  $(`${prefix}-bar`).style.width = `${Math.min(100, (1 - left / Math.max(1, job.end - job.start)) * 100)}%`;
}

/** Arbre des technologies : sur la planète mère seulement, avec un labo. */
function renderResearch(me, pl, s, now) {
  const home = pl.key === 'home';
  $('research-zone').hidden = !home;
  if (!home) return;
  const lab = s.levels.lab || 0;
  const T = TECHS[me.race];
  const labName = RACES[me.race].buildings.lab.name;
  $('research-hint').textContent = lab ? '' : `Construis un ${labName} (bâtiments ci-dessus) pour commencer la recherche.`;
  $('research-hint').hidden = !!lab;
  progress('research', s.research, s.research ? `${T[s.research.key].name} → niv. ${s.research.level}` : '', now);
  const q = (sel) => document.querySelector(sel);
  for (const [k, t] of Object.entries(T)) {
    const level = s.tech[k] || 0;
    const maxed = level >= t.max;
    const miss = techMissing(me.race, k, s.tech, lab);
    const cost = techCost(me.race, k, level);
    const ok = !maxed && !miss && covers(s.stock, cost);
    q(`[data-tlevel="${k}"]`).textContent = `Niv. ${level} / ${t.max}`;
    const req = q(`[data-treq="${k}"]`);
    req.hidden = !miss || maxed;
    req.textContent = miss ? `Il faut : ${miss}` : '';
    q(`[data-tcost="${k}"]`).textContent = maxed ? 'Niveau maximum' : `${costText(cost)} · ${clock(researchDuration(cost, Math.max(1, lab)))}`;
    q(`[data-tcard="${k}"]`).classList.toggle('locked', !!miss && !maxed);
    q(`[data-tcard="${k}"]`).classList.toggle('affordable', ok && !s.research);
    q(`[data-tcard="${k}"]`).classList.toggle('building-now', s.research?.key === k);
    const btn = q(`[data-research="${k}"]`);
    btn.disabled = !ok || !!s.research || session.status !== 'playing';
    btn.textContent = s.research?.key === k ? 'En cours' : maxed ? 'Terminé' : `Niveau ${level + 1}`;
  }
}

const statText = (st) =>
  `⚔ ${fmt(st.attack)} · ◇ ${fmt(st.hull)} · soute ${fmt(st.cargo)} · ${st.speed.toFixed(1).replace('.', ',')} cases/min`;

/** Chantier naval de la planète ouverte. */
function renderYard(me, pl, s, now) {
  const yard = s.levels.yard || 0;
  const S = SHIPS[me.race];
  const yardName = RACES[me.race].buildings.yard.name;
  $('yard-hint').textContent = yard ? '' : `Construis un ${yardName} (bâtiments ci-dessus) pour construire des vaisseaux.`;
  $('yard-hint').hidden = !!yard;
  progress('yard', s.yard, s.yard ? `${s.yard.count} × ${S[s.yard.type].name}` : '', now);
  const q = (sel) => document.querySelector(sel);
  for (const k of SHIP_KEYS) {
    const unlocked = shipUnlocked(me.race, k, s.tech);
    const u = shipUnlock(me.race, k);
    q(`[data-sdocked="${k}"]`).textContent = s.ships[k] ? `${s.ships[k]} à quai` : '';
    q(`[data-sstats="${k}"]`).textContent = statText(shipStats(me.race, k, s.tech));
    const req = q(`[data-sreq="${k}"]`);
    req.hidden = unlocked;
    req.textContent = unlocked ? '' : `Il faut : ${TECHS[me.race][u.key].name} ${u.level}`;
    q(`[data-scost="${k}"]`).textContent = `${costText(S[k].cost)} · ${clock(shipDuration(me.race, k, 1, Math.max(1, yard)))} pièce`;
    q(`[data-scard="${k}"]`).classList.toggle('locked', !unlocked);
    for (const btn of document.querySelectorAll(`[data-ship="${k}"]`)) {
      const n = Number(btn.dataset.n);
      const cost = Object.fromEntries(Object.entries(S[k].cost).map(([r, v]) => [r, v * n]));
      btn.disabled = !yard || !unlocked || !!s.yard || !covers(s.stock, cost) || session.status !== 'playing';
    }
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

/** « 3 × Frégate, 1 × Cargo · 200 min. » */
function shipsLine(race, f) {
  const ships = SHIP_KEYS.filter((k) => f.ships[k]).map((k) => `${f.ships[k]} × ${SHIPS[race][k].name}`).join(', ');
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
  if (moving(f, now)) return `${f.order ? ORDERS[f.order.kind]?.name || 'Ordre' : 'Déplacement'} → ${where}`;
  return mapPlanets().some((w) => sameCell(w, f.to)) ? `En orbite de ${where}` : `Stationne en ${where}`;
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

function openFleetSheet() {
  const me = session.state.players[session.me];
  const pl = session.planetOf(me, openKey);
  if (!pl) return;
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
  $('fleet-room').textContent = `Soutes : ${fmt(fleetCargo(me.race, ships))}`;
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

$('btn-send-fleet').onclick = openFleetSheet;
$('btn-fleet-close').onclick = () => ($('sheet-fleet').hidden = true);
$('sheet-fleet').addEventListener('input', updateFleetSheet);
$('btn-fleet-go').onclick = () => {
  const { ships, cargo } = fleetChoice();
  const id = session.takeOff(openKey, ships, cargo, Math.floor(Number($('fleet-fuel').value) || 0));
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
  window.scrollTo(0, 0);
  if (view === 'map') {
    $('map-size').textContent = `${UNIVERSE.w} × ${UNIVERSE.h}`;
    if (!mapFrame) mapFrame = requestAnimationFrame(drawMap);
  } else stopMap();
}

function stopMap() {
  if (mapFrame) cancelAnimationFrame(mapFrame);
  mapFrame = null;
}

$('btn-back-map').onclick = () => showView('map');
$('btn-open-planet').onclick = (e) => showView('planet', e.currentTarget.dataset.key || 'home');

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

function drawMap() {
  mapFrame = null;
  if (!session || currentView !== 'map') return;
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

  // Étoiles et quadrillage
  for (let y = 0; y < UNIVERSE.h; y++) {
    for (let x = 0; x < UNIVERSE.w; x++) {
      const n = noise(x, y);
      if (n > 0.72) {
        ctx.fillStyle = `rgba(220,230,255,${0.15 + (n - 0.72) * 2})`;
        const r = Math.max(0.6, cell * 0.04 * (n * 2));
        ctx.beginPath();
        ctx.arc((x + noise(y, x)) * cell, (y + noise(x + 7, y + 3)) * cell, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.strokeStyle = 'rgba(150,170,230,0.10)';
  ctx.lineWidth = Math.max(1, dpr * 0.5);
  ctx.beginPath();
  for (let i = 1; i < UNIVERSE.w; i++) {
    ctx.moveTo(i * cell, 0);
    ctx.lineTo(i * cell, W);
    ctx.moveTo(0, i * cell);
    ctx.lineTo(W, i * cell);
  }
  ctx.stroke();

  const me = session.state.players[session.me];
  const picking = !me?.home;
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
    // Planète libre : grise, plus lumineuse quand on cherche où s'installer.
    ctx.globalAlpha = o ? (o.online ? 1 : 0.45) : picking ? 0.55 + 0.35 * pulse : 0.6;
    const color = o ? o.color : '#8d95b3';
    ctx.fillStyle = color;
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
    ctx.fillStyle = ['attack', 'chase'].includes(f.order?.kind) || f.mission === 'attack' ? '#ff7a93' : p.color;
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

  $('my-coords').textContent = me?.home ? `[${me.home.x}:${me.home.y}]` : 'à choisir';

  mapFrame = requestAnimationFrame(drawMap);
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
  const hits = fleetSpots(now)
    .filter((s) => s.p.id === session.me && dist(s) < 0.7)
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
  const { w } = best;
  if (w.owner?.id === session.me && w.pl) {
    selected = null;
    renderPick();
    return showView('planet', w.pl.key);
  }
  selected = { x: w.x, y: w.y };
  renderPick();
  $('planet-info').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
  $('fi-ships').textContent = shipsLine(me.race, f);
  $('fi-name').textContent = fleetName(f);
  $('fi-status').textContent = `${fleetStatus(me.race, f, now)}${go ? ` · ${clock(f.arrive - now)}` : ''}`;
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
  $('btn-fi-refuel').hidden = !mine || fuel >= tank - 0.5;
  $('btn-fi-split').hidden = go || countShips(f.ships) < 2;
  renderBeside(me, f, now);
  renderPartners($('fi-partners'), go ? null : { fleet: f.id });
  const choice = pending ? session.ordersAt(selFleet, pending) : [];
  const warn = choice[0]?.short ? ' · panne en route' : '';
  const foe = prey && session.state.players[prey.pid];
  const html = foe
    ? `<button class="primary small" data-fchase>Poursuivre et attaquer la flotte ${esc(de(foe.name))}</button>`
    : choice
        .map((o) => `<button class="${o.kind === 'move' ? 'secondary' : 'primary'} small" data-forder="${o.kind}">${esc(o.label + warn)}</button>`)
        .join('');
  $('fi-choice').hidden = !html;
  if ($('fi-choice').dataset.html !== html) {
    $('fi-choice').innerHTML = html;
    $('fi-choice').dataset.html = html;
  }
}

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
    ? `<p class="hint">Autres joueurs ici :</p>${list
        .map(
          (x) => `<div class="row"><span>${esc(x.name)}</span>
            <button class="secondary small" data-trade='${esc(JSON.stringify({ from: fromRef, pid: x.pid, ref: x.ref, name: x.name }))}'>Proposer un échange…</button></div>`,
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
    ({ from, offer }) => `<div class="card trade"><p><strong>${esc(from.name)}</strong> te propose : il donne ${esc(tradeText(offer.give))}, il demande ${esc(tradeText(offer.want))}. <span class="mono" data-left="${offer.expires}"></span></p>
      <div class="fi-actions"><button class="primary small" data-accept="${esc(from.id)}:${esc(offer.id)}">Accepter</button>
      <button class="secondary small" data-refuse="${esc(from.id)}:${esc(offer.id)}">Refuser</button></div></div>`,
  );
  const mine = (me.offers || []).map((o) => {
    const to = session.state.players[o.to.pid];
    return `<div class="card trade mine"><p>Échange proposé à ${esc(to?.name || '?')} : tu donnes ${esc(tradeText(o.give))}, tu demandes ${esc(tradeText(o.want))}. <span class="mono" data-left="${o.expires}"></span></p></div>`;
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
        <button class="secondary small" data-give="${esc(g.id)}">Donner…</button>
        <button class="secondary small" data-merge="${esc(g.id)}">Fusionner ici</button></div>`,
    )
    .join('');
  $('fi-beside').hidden = !others.length;
  const full = others.length ? `<p class="hint">Sur la même case :</p>${html}` : '';
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
  $('btn-move-go').textContent = kind === 'give' ? 'Donner' : 'Scinder';
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
  const picking = !me?.home;
  $('pick').hidden = !picking;
  const w = selected && mapPlanets().find((x) => sameCell(x, selected));
  $('planet-info').hidden = !w;
  if (!w) return;
  const o = w.owner;
  $('pi-name').textContent = w.name;
  $('pi-where').textContent = `[${w.x}:${w.y}]`;
  $('pi-owner').textContent = o
    ? `${o.id === session.me ? 'Ta planète' : `Planète ${de(o.name)}`}${o.race ? ` · ${RACES[o.race].icon} ${RACES[o.race].name}` : ''}`
    : 'Planète libre. Ses gisements se vident quand on les exploite, et se reconstituent d’eux-mêmes jusqu’à leur maximum.';
  // Gisements : pleins pour une planète libre, calculés chez son propriétaire sinon.
  const planet = w.pl?.planet;
  const s = planet ? stateAt(planet, now) : null;
  const nature = o ? planet?.nature : w.nature;
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
  $('btn-claim').hidden = !picking || !!o;
  $('btn-claim').textContent = `S'installer sur ${w.name} (définitif)`;
  $('btn-open-planet').hidden = o?.id !== session.me || !w.pl;
  $('btn-open-planet').dataset.key = w.pl?.key || 'home';
}

$('btn-claim').onclick = () => {
  const w = selected && session.planets.find((x) => sameCell(x, selected));
  if (!w || !session.claimPlanet(w.id)) return;
  selected = null;
  buildStatic();
  renderPick();
  showView('planet');
  if (inviteAfterRace) {
    inviteAfterRace = false;
    openInviteSheet();
  }
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
