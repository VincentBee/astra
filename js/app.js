import { HostSession } from './host.js';
import { PlayerSession } from './client.js';
import { inviteLink, drawQr, decode } from './invite.js';
import { scanQr } from './scanner.js';
import { BUILDINGS, BUILDING_KEYS, STORAGE, stateAt, upgradeCost, buildDuration, covers, score, fmt } from './game.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

let session = null;
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
  };
}

$('btn-create').onclick = () => {
  const name = playerName();
  if (!name) return;
  session = new HostSession(name);
  session.ontoast = toast;
  startGame();
  openInviteSheet();
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
  if (!session || session.role !== 'player') {
    session = new PlayerSession(name);
    session.ontoast = toast;
    session.onchange = onPlayerChange;
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
  $('join-status').textContent = 'En attente du maître du jeu…';
}

$('btn-copy-answer').onclick = () => copy(answerCode, 'Réponse copiée. Envoie-la au maître du jeu.');
$('btn-share-answer').onclick = () => share(answerCode, 'Ma réponse Astra');

function onPlayerChange() {
  const s = session;
  if (s.status === 'waiting') $('join-status').textContent = 'Connecté. Le maître du jeu doit valider ton arrivée…';
  if (s.status === 'refused') {
    joinError(s.refusal || 'Le maître du jeu a refusé ta demande.');
    $('join-status').textContent = '';
    show('join');
  }
  if (s.status === 'playing' && $('screen-game').hidden) startGame();
  if (s.status === 'lost') $('lost').hidden = false;
  if (s.status === 'ended') {
    stopGame();
    show('home');
    $('home-note').textContent = 'Le maître du jeu a terminé la partie.';
    $('home-note').hidden = false;
  }
  if (!$('screen-game').hidden) renderState();
}

$('btn-rejoin').onclick = () => {
  $('lost').hidden = true;
  stopGame();
  startJoin();
};

// ---------------------------------------------------------------------------
// Invitations (MJ)
// ---------------------------------------------------------------------------

let offerCode = '';

async function openInviteSheet() {
  $('sheet-invite').hidden = false;
  $('invite-status').textContent = '';
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

async function useAnswer(text) {
  $('invite-status').textContent = 'Connexion en cours…';
  try {
    await session.acceptAnswer(text);
    $('invite-status').textContent = '';
    closeInviteSheet();
    toast('Joueur connecté. Valide son arrivée en haut de l’écran.');
  } catch (e) {
    $('invite-status').textContent = e.message;
  }
}

$('btn-scan-answer').onclick = async () => {
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

function startGame() {
  show('game');
  $('lost').hidden = true;
  $('btn-invite').hidden = session.role !== 'mj';
  if (session.role === 'mj') session.onchange = (kind) => kind === 'state' && renderState();
  buildStatic();
  renderState();
  clearInterval(liveTimer);
  liveTimer = setInterval(renderLive, 200);
  keepAwake();
  window.onbeforeunload = session.role === 'mj' ? () => 'La partie s’arrêtera pour tout le monde.' : null;
}

function stopGame() {
  clearInterval(liveTimer);
  liveTimer = null;
  wakeLock?.release?.().catch(() => {});
  wakeLock = null;
  window.onbeforeunload = null;
}

const RES = [
  { key: 'metal', label: 'Métal' },
  { key: 'crystal', label: 'Cristal' },
  { key: 'deuterium', label: 'Deutérium' },
];

function buildStatic() {
  $('resources').innerHTML =
    RES.map(
      (r) => `<div class="tile ${r.key}">
        <span class="label">${r.label}</span>
        <span class="amount mono" data-res="${r.key}">0</span>
        <span class="rate mono" data-rate="${r.key}"></span>
        <div class="gauge"><div class="gauge-fill" data-gauge="${r.key}"></div></div>
      </div>`,
    ).join('') +
    `<div class="tile energy"><span class="label">Énergie</span>
      <span class="amount mono" data-energy></span><span class="rate mono" data-eff></span></div>`;

  $('buildings').innerHTML = BUILDING_KEYS.map(
    (k) => `<article class="building card" data-card="${k}">
      <div class="b-head"><h4>${BUILDINGS[k].name}</h4><span class="level mono" data-level="${k}"></span></div>
      <p class="cost mono" data-cost="${k}"></p>
      <button class="secondary small" data-build="${k}">Améliorer</button>
    </article>`,
  ).join('');
}

$('buildings').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-build]');
  if (btn && !btn.disabled) session.build(btn.dataset.build);
});

$('requests').addEventListener('click', (e) => {
  const b = e.target.closest('[data-approve],[data-refuse]');
  if (!b) return;
  if (b.dataset.approve) session.approve(b.dataset.approve);
  else session.refuse(b.dataset.refuse);
});

/** Rendu des parties qui changent avec l'état (joueurs, journal, demandes). */
function renderState() {
  const st = session.state;
  const me = st.players[session.me];
  if (me) {
    $('me-name').textContent = me.name;
    $('me-dot').style.background = me.color;
  }
  $('me-role').textContent = session.role === 'mj' ? 'Maître du jeu' : 'Commandant';

  if (session.role === 'mj') {
    $('requests').innerHTML = session.pending
      .map(
        (r) => `<div class="banner">
          <p><strong>${esc(r.name)}</strong> ${r.back ? 'veut revenir' : 'veut rejoindre'}.</p>
          <div class="row"><button class="primary small" data-approve="${r.id}">Accepter</button>
          <button class="ghost small" data-refuse="${r.id}">Refuser</button></div></div>`,
      )
      .join('');
  }

  const players = Object.values(st.players);
  $('players').innerHTML = players
    .map(
      (p) => `<div class="player card${p.online ? '' : ' offline'}" data-player="${p.id}">
        <span class="dot" style="background:${esc(p.color)}"></span>
        <div class="p-main">
          <div class="p-name">${esc(p.name)}${p.id === session.me ? ' <span class="you">toi</span>' : ''}${p.mj ? ' <span class="tag">MJ</span>' : ''}</div>
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
  const st = session.state;
  const me = st.players[session.me];
  const now = session.now();

  if (session.role === 'player') {
    const rtt = session.clock.rtt;
    $('net').textContent = rtt == null ? 'synchro…' : `${rtt} ms${session.route ? ' · ' + routeLabel(session.route) : ''}`;
    $('net').className = 'net' + (rtt != null && rtt > 250 ? ' slow' : '');
  } else {
    const online = Object.values(st.players).filter((p) => !p.mj && p.online).length;
    $('net').textContent = `${online} joueur${online > 1 ? 's' : ''} connecté${online > 1 ? 's' : ''}`;
    $('net').className = 'net';
  }

  if (me) {
    const s = stateAt(me.planet, now);
    for (const r of RES) {
      document.querySelector(`[data-res="${r.key}"]`).textContent = fmt(s.stock[r.key]);
      const full = s.stock[r.key] >= STORAGE;
      document.querySelector(`[data-rate="${r.key}"]`).textContent = full ? 'Entrepôt plein' : `+${fmt(s.prod.perHour[r.key])} / min`;
      document.querySelector(`[data-gauge="${r.key}"]`).style.width = `${Math.min(100, (s.stock[r.key] / STORAGE) * 100)}%`;
    }
    document.querySelector('[data-energy]').textContent = `${fmt(s.prod.energyProduced)} / ${fmt(s.prod.energyNeeded)}`;
    document.querySelector('[data-eff]').textContent = `Rendement ${Math.round(s.prod.efficiency * 100)} %`;

    for (const k of BUILDING_KEYS) {
      const level = s.levels[k];
      const cost = upgradeCost(k, level);
      const ok = covers(s.stock, cost);
      document.querySelector(`[data-level="${k}"]`).textContent = `Niv. ${level}`;
      const parts = [['métal', cost.metal], ['cristal', cost.crystal], ['deut.', cost.deuterium]]
        .filter(([, v]) => v > 0)
        .map(([n, v]) => `${fmt(v)} ${n}`);
      document.querySelector(`[data-cost="${k}"]`).textContent = `${parts.join(' · ')} · ${buildDuration(cost) / 1000} s`;
      const card = document.querySelector(`[data-card="${k}"]`);
      card.classList.toggle('affordable', ok && !s.queue);
      card.classList.toggle('building-now', s.queue?.key === k);
      const btn = document.querySelector(`[data-build="${k}"]`);
      btn.disabled = !!s.queue || !ok || (session.role === 'player' && session.status !== 'playing');
      btn.textContent = s.queue?.key === k ? 'En chantier' : `Niveau ${level + 1}`;
    }

    if (s.queue) {
      const total = s.queue.end - s.queue.start;
      const left = Math.max(0, s.queue.end - now);
      $('queue').hidden = false;
      $('queue-label').textContent = `${BUILDINGS[s.queue.key].name} → niv. ${s.queue.level}`;
      $('queue-left').textContent = `${Math.ceil(left / 1000)} s`;
      $('queue-bar').style.width = `${Math.min(100, (1 - left / total) * 100)}%`;
    } else $('queue').hidden = true;
  }

  for (const p of Object.values(st.players)) {
    const sub = document.querySelector(`[data-psub="${p.id}"]`);
    if (!sub) continue;
    const s = stateAt(p.planet, now);
    const doing = s.queue ? `${BUILDINGS[s.queue.key].short} ${s.queue.level} dans ${Math.ceil((s.queue.end - now) / 1000)} s` : 'aucun chantier';
    const net = !p.online ? 'déconnecté' : p.mj ? 'hôte' : p.rtt != null ? `${p.rtt} ms${p.route ? ' ' + routeLabel(p.route) : ''}` : '';
    sub.textContent = `${fmt(s.stock.metal)} métal · ${doing}${net ? ' · ' + net : ''}`;
    document.querySelector(`[data-pscore="${p.id}"]`).textContent = `${score(s.levels)} pts`;
  }
}

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
        "Ce lien est la réponse d'un joueur : colle-la dans l'écran d'invitation de ta partie en cours, dans l'onglet où tu es maître du jeu.";
      $('home-note').hidden = false;
    } catch (e) {
      $('home-note').textContent = e.message;
      $('home-note').hidden = false;
    }
  }
  show('home');
}

boot();
// Lien d'invitation ouvert alors que l'appli est déjà affichée dans cet onglet.
window.addEventListener('hashchange', () => location.hash.length > 1 && !session && boot());

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
