import { Session } from './session.js';
import { loadGame, describeSave } from './save.js';
import { inviteLink, drawQr, decode } from './invite.js';
import { scanQr } from './scanner.js';
import {
  RACES, RACE_KEYS, RES_INFO, POWERS, POWER_KEYS, STORAGE, stateAt, upgradeCost, buildDuration, covers, score, power,
  powerReadyAt, powerCost, fmt, UNIVERSE, MOVE_COOLDOWN, DIRS, distance,
} from './game.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

let session = null;
// Accès depuis la console du navigateur, pour déboguer : astra.session
window.astra = { get session() { return session; } };
let liveTimer = null;
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
  inviteAfterRace = true; // la fenêtre d'invitation s'ouvre une fois la race choisie
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
  if (inviteAfterRace) {
    inviteAfterRace = false;
    openInviteSheet();
  }
};

// ---------------------------------------------------------------------------

function startGame() {
  if (!session.myRace) return showRace();
  show('game');
  buildStatic();
  showTab('planet');
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
    (r) => `<div class="tile ${r}">
      <span class="label">${RES_INFO[r].name}</span>
      <span class="amount mono" data-res="${r}">0</span>
      <span class="rate mono" data-rate="${r}"></span>
      <div class="gauge"><div class="gauge-fill" data-gauge="${r}"></div></div>
    </div>`,
  );
  if (R.pop) {
    tiles.push(`<div class="tile pop"><span class="label">${R.pop.label}</span>
      <span class="amount mono" data-pop></span>
      <span class="rate mono" data-poprate></span>
      <span class="rate mono" data-popextra></span>
      <div class="gauge"><div class="gauge-fill" data-popgauge></div></div></div>`);
  } else {
    tiles.push(`<div class="tile grid"><span class="label">Réseau</span>
      <span class="amount mono" data-grid></span>
      <span class="rate mono" data-gridrate></span>
      <span class="rate mono" data-gridextra></span></div>`);
  }
  $('resources').innerHTML = tiles.join('');

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

$('powers').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-power]');
  if (btn && !btn.disabled) session.power(btn.dataset.power);
});

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
  if (btn && !btn.disabled) session.build(btn.dataset.build);
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

  const time = (t) => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  $('log').innerHTML = st.log
    .slice()
    .reverse()
    .map((l) => `<li><span class="mono">${time(l.at)}</span> ${esc(l.text)}</li>`)
    .join('');

  renderLive();
}

function routeLabel(route) {
  return { host: 'réseau local', srflx: 'direct', prflx: 'direct', relay: 'relais' }[route] || '';
}

/** Rendu des valeurs qui bougent en continu (5 fois par seconde). */
function renderLive() {
  if (!session) return;
  if (currentTab === 'universe') renderPositions();
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
  }

  for (const p of Object.values(st.players)) {
    const sub = document.querySelector(`[data-psub="${p.id}"]`);
    if (!sub) continue;
    const info = session.linkInfo(p.id);
    const net = p.id === session.me ? '' : !info ? 'déconnecté' : info.rtt != null ? `${info.rtt} ms${info.route ? ' ' + routeLabel(info.route) : ''}` : '';
    const scoreEl = document.querySelector(`[data-pscore="${p.id}"]`);
    if (!p.race || !p.planet) {
      sub.textContent = `choisit sa race…${net ? ' · ' + net : ''}`;
      scoreEl.textContent = '—';
      continue;
    }
    const s = stateAt(p.planet, now);
    const R = RACES[p.race];
    const doing = s.queue ? `${R.buildings[s.queue.key].short} ${s.queue.level} dans ${Math.ceil((s.queue.end - now) / 1000)} s` : 'aucun chantier';
    const people = popText(p.race, s.pop);
    sub.textContent = [`${fmt(s.stock.minerals)} min.`, people, doing, net].filter(Boolean).join(' · ');
    scoreEl.textContent = `${score(p.race, s.levels)} pts`;
  }
}

/** Ma planète : ressources, population, chantier, bâtiments, pouvoirs. */
function renderPlanet(me, now) {
  const R = RACES[me.race];
  const s = stateAt(me.planet, now);
  const f = s.prod;
  const q = (sel) => document.querySelector(sel);

  for (const r of R.resources) {
    const cap = r === 'energy' ? f.energyCap : STORAGE;
    q(`[data-res="${r}"]`).textContent = fmt(s.stock[r]);
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
    const later = stateAt(me.planet, now + 60_000).pop; // dans une minute
    const delta = later - s.pop;
    q('[data-popgauge]').style.width = `${Math.min(100, (s.pop / Math.max(cap, 1)) * 100)}%`;
    const rate = q('[data-poprate]');
    const extra = q('[data-popextra]');
    if (me.race === 'human') {
      q('[data-pop]').textContent = fmt(s.pop);
      rate.textContent = f.effF < 1 ? 'Famine !' : `${rateText(delta)} · max ${fmt(cap)}`;
      extra.textContent = f.work < 1 ? `Ouvriers ${Math.round(f.work * 100)} % des postes` : 'Tous les postes pourvus';
    } else {
      q('[data-pop]').textContent = fmt(s.pop);
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
    for (const k of POWER_KEYS) {
      const cost = powerCost(me.planet, k, s.pop);
      const wait = Math.max(0, powerReadyAt(me.planet, k) - now);
      const needsQueue = k === 'rush' && !s.queue;
      const ok = covers(s.stock, cost);
      q(`[data-pcost="${k}"]`).textContent = `${costText(cost)} · recharge ${POWERS[k].cooldown / 60000} min`;
      q(`[data-pready="${k}"]`).textContent = wait ? clock(wait) : 'Prêt';
      q(`[data-pcard="${k}"]`).classList.toggle('affordable', ok && !wait && !needsQueue);
      const btn = q(`[data-power="${k}"]`);
      btn.disabled = !!wait || !ok || needsQueue || session.status !== 'playing';
      btn.textContent = wait ? 'En recharge' : needsQueue ? 'Aucun chantier' : 'Déclencher';
    }
  }
}

/** « 2:05 » */
function clock(ms) {
  const t = Math.ceil(ms / 1000);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Univers : grille 2D, déplacements aux flèches
// ---------------------------------------------------------------------------

let currentTab = 'planet';
let mapFrame = null;
const shown = new Map(); // id -> position affichée (glisse vers la position réelle)

function showTab(tab) {
  currentTab = tab;
  $('view-planet').hidden = tab !== 'planet';
  $('view-universe').hidden = tab !== 'universe';
  for (const b of document.querySelectorAll('[data-tab]')) b.setAttribute('aria-selected', String(b.dataset.tab === tab));
  if (tab === 'universe') {
    $('map-size').textContent = `${UNIVERSE.w} × ${UNIVERSE.h}`;
    shown.clear();
    renderPositions();
    if (!mapFrame) mapFrame = requestAnimationFrame(drawMap);
  } else stopMap();
}

function stopMap() {
  if (mapFrame) cancelAnimationFrame(mapFrame);
  mapFrame = null;
  stopRepeat();
}

for (const b of document.querySelectorAll('[data-tab]')) b.onclick = () => showTab(b.dataset.tab);

/** Positions de tout le monde. */
function positions() {
  const out = [];
  for (const p of Object.values(session.state.players)) {
    if (!p.pos) continue;
    const pos = p.id === session.me ? session.myPos() || p.pos : p.pos;
    out.push({ p, pos });
  }
  return out;
}

/** Petit bruit déterministe : les mêmes étoiles de fond sur tous les téléphones. */
function noise(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function drawMap() {
  mapFrame = null;
  if (!session || currentTab !== 'universe') return;
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

  const list = positions();

  // Planètes mères
  for (const { p } of list) {
    if (!p.home) continue;
    const cx = (p.home.x + 0.5) * cell;
    const cy = (p.home.y + 0.5) * cell;
    ctx.globalAlpha = p.online ? 1 : 0.4;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(cx, cy, cell * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = p.color;
    ctx.lineWidth = Math.max(1, cell * 0.06);
    ctx.beginPath();
    ctx.ellipse(cx, cy, cell * 0.42, cell * 0.14, -0.35, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Vaisseaux (ils glissent vers leur case)
  for (const { p, pos } of list) {
    const prev = shown.get(p.id) || { x: pos.x, y: pos.y };
    const k = 0.35;
    const cur = { x: prev.x + (pos.x - prev.x) * k, y: prev.y + (pos.y - prev.y) * k };
    if (Math.abs(cur.x - pos.x) < 0.01) cur.x = pos.x;
    if (Math.abs(cur.y - pos.y) < 0.01) cur.y = pos.y;
    shown.set(p.id, cur);
    const cx = (cur.x + 0.5) * cell;
    const cy = (cur.y + 0.5) * cell;
    const mine = p.id === session.me;
    ctx.globalAlpha = p.online ? 1 : 0.35;
    if (mine) {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = Math.max(1.5, cell * 0.07);
      ctx.beginPath();
      ctx.arc(cx, cy, cell * 0.46, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = p.color;
    ctx.strokeStyle = '#05070f';
    ctx.lineWidth = Math.max(1, cell * 0.05);
    ctx.beginPath();
    ctx.moveTo(cx, cy - cell * 0.3);
    ctx.lineTo(cx + cell * 0.24, cy + cell * 0.24);
    ctx.lineTo(cx - cell * 0.24, cy + cell * 0.24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Nom au-dessus
    ctx.font = `600 ${Math.max(9 * dpr, cell * 0.38)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = mine ? '#ffffff' : 'rgba(232,235,247,0.8)';
    const label = p.name.length > 8 ? p.name.slice(0, 7) + '…' : p.name;
    ctx.fillText(label, cx, Math.max(cell * 0.4, cy - cell * 0.45));
  }
  ctx.globalAlpha = 1;

  const me = session.myPos();
  $('my-coords').textContent = me ? `[${me.x}:${me.y}]` : '';
  const home = session.state.players[session.me]?.home;
  $('home-dist').textContent = me && home ? `⌂ ${distance(me, home)}` : '⌂';

  mapFrame = requestAnimationFrame(drawMap);
}

function renderPositions() {
  const me = session.myPos();
  const rows = positions()
    .map(({ p, pos }) => ({ p, pos, d: me ? distance(me, pos) : null }))
    .sort((a, b) => (a.p.id === session.me ? -1 : b.p.id === session.me ? 1 : (a.d ?? 0) - (b.d ?? 0)));
  $('positions').innerHTML = rows
    .map(({ p, pos, d }) => {
      const atHome = p.home && pos.x === p.home.x && pos.y === p.home.y;
      const where = p.id === session.me ? 'toi' : `${d} pas de toi`;
      return `<div class="player card${p.online ? '' : ' offline'}">
        <span class="dot" style="background:${esc(p.color)}"></span>
        <div class="p-main"><div class="p-name">${esc(p.name)}</div>
        <div class="p-sub mono">${where}${atHome ? ' · sur sa planète' : ''}</div></div>
        <div class="p-score mono">[${pos.x}:${pos.y}]</div></div>`;
    })
    .join('');
}

// Commandes : un pas immédiat à l'appui, puis un pas toutes les MOVE_COOLDOWN ms tant qu'on maintient.
let repeatTimer = null;
let pressedBtn = null;
function stopRepeat() {
  clearInterval(repeatTimer);
  repeatTimer = null;
  pressedBtn?.classList.remove('pressed');
  pressedBtn = null;
}
function moveOnce(dir) {
  if (session && DIRS[dir]) session.move(dir);
}
for (const btn of document.querySelectorAll('[data-dir]')) {
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    stopRepeat();
    pressedBtn = btn;
    btn.classList.add('pressed');
    moveOnce(btn.dataset.dir);
    repeatTimer = setInterval(() => moveOnce(btn.dataset.dir), MOVE_COOLDOWN + 10);
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) btn.addEventListener(ev, stopRepeat);
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
}
const KEY_DIRS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
document.addEventListener('keydown', (e) => {
  const dir = KEY_DIRS[e.key];
  if (!dir || currentTab !== 'universe' || $('screen-game').hidden || !$('sheet-invite').hidden) return;
  if (/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName)) return;
  e.preventDefault();
  moveOnce(dir);
});
window.addEventListener('blur', stopRepeat);

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
