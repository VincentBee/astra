import { Session } from './session.js';
import { inviteLink, drawQr, decode } from './invite.js';
import { scanQr } from './scanner.js';
import { BUILDINGS, BUILDING_KEYS, STORAGE, stateAt, upgradeCost, buildDuration, covers, score, fmt, UNIVERSE, MOVE_COOLDOWN, DIRS, distance } from './game.js';

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
  };
}

$('btn-create').onclick = async () => {
  const name = playerName();
  if (!name) return;
  session = await Session.create(name);
  session.ontoast = toast;
  session.onchange = onSessionChange;
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
  $('join-status').textContent = 'En attente du maître du jeu…';
}

$('btn-copy-answer').onclick = () => copy(answerCode, 'Réponse copiée. Envoie-la au maître du jeu.');
$('btn-share-answer').onclick = () => share(answerCode, 'Ma réponse Astra');

function onSessionChange() {
  const s = session;
  if (!s) return;
  if (s.status === 'waiting') {
    $('join-status').textContent = s.helloAcked
      ? 'Connecté. Le maître du jeu doit valider ton arrivée…'
      : 'Connecté. Envoi de ta demande au maître du jeu…';
  }
  if (s.status === 'failed') {
    $('join-step-1').hidden = false;
    $('join-step-2').hidden = true;
    joinError(`${s.failure} Demande au maître du jeu une nouvelle invitation et scanne-la.`);
    show('join');
  }
  if (s.status === 'refused') {
    joinError(s.refusal || 'Le maître du jeu a refusé ta demande.');
    $('join-status').textContent = '';
    show('join');
  }
  if (s.status === 'playing' && $('screen-game').hidden) startGame();
  if (!s.isLeader && !$('sheet-invite').hidden) {
    s.cancelInvite();
    closeInviteSheet();
  }
  if (!$('screen-game').hidden) renderState();
}

// Resté seul : la partie continue ici ; ce bouton permet de rejoindre les autres.
$('btn-rejoin').onclick = () => {
  stopGame();
  startJoin();
};

// ---------------------------------------------------------------------------
// Invitations (MJ)
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
    toast('Joueur connecté. Valide son arrivée en haut de l’écran.');
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

function startGame() {
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
  $('me-role').textContent = session.isLeader ? 'Maître du jeu' : 'Commandant';
  $('btn-invite').hidden = !session.isLeader;
  $('lost').hidden = !session.alone;
  $('requests').innerHTML = '';

  if (session.isLeader) {
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
          <div class="p-name">${esc(p.name)}${p.id === session.me ? ' <span class="you">toi</span>' : ''}${p.id === st.leader ? ' <span class="tag">MJ</span>' : ''}</div>
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

  if (!session.isLeader) {
    const rtt = session.clock.rtt;
    $('net').textContent = rtt == null ? 'synchro…' : `${rtt} ms${session.route ? ' · ' + routeLabel(session.route) : ''}`;
    $('net').className = 'net' + (rtt != null && rtt > 250 ? ' slow' : '');
  } else {
    const online = Object.values(st.players).filter((p) => p.id !== st.leader && p.online).length;
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
      btn.disabled = !!s.queue || !ok || (!session.isLeader && session.status !== 'playing');
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
    const net = !p.online ? 'déconnecté' : p.id === st.leader ? 'MJ' : p.rtt != null ? `${p.rtt} ms${p.route ? ' ' + routeLabel(p.route) : ''}` : '';
    sub.textContent = `${fmt(s.stock.metal)} métal · ${doing}${net ? ' · ' + net : ''}`;
    document.querySelector(`[data-pscore="${p.id}"]`).textContent = `${score(s.levels)} pts`;
  }
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

/** Positions de tout le monde ; la mienne inclut les pas pas encore confirmés. */
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
