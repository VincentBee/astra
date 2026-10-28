// Écran du replay : la partie sauvegardée sur ce téléphone, rejouée depuis
// les journaux d'ordres (js/replay.js), à regarder comme un film.
// Rien n'est écrit : la sauvegarde et la partie en cours ne bougent pas.

import { loadGame } from './save.js';
import { replay, replayable } from './replay.js';
import { RACES, raceIcon, UNIVERSE, planetsFor, stateAt, score, sameCell, sunFor } from './game.js';
import { drawSun } from './sky.js';
import { fleetPos, moving, countShips } from './fleet.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const MIN = 60_000;
// Rien ne bouge sur la carte : on saute au prochain événement plutôt que d'attendre.
const QUIET_S = 2;

let film = null; // { frames, log, at: [index de la fiche de chaque joueur, par image], start, end }
let t = 0;
let playing = false;
let last = 0;

function note(text) {
  $('rp-note').textContent = text;
  $('rp-note').hidden = !text;
}

function load() {
  const saved = loadGame();
  if (!saved) return note('Aucune partie sur ce téléphone.');
  const st = saved.state;
  $('rp-title').textContent = Object.values(st.players)
    .sort((a, b) => a.rank - b.rank)
    .map((p) => p.name)
    .join(', ');
  const ok = replayable(st);
  if (ok.stale) return note('Cette copie de la partie n’est pas encore à jour : rouvre la partie pour te synchroniser avec les autres, puis réessaie.');
  if (!ok.ok) {
    return note(
      `Cette partie ne se rejoue pas depuis le début : il manque le début du journal de ${ok.missing.join(', ')} (partie commencée avant le journal, ou plus de 1 500 ordres).`,
    );
  }
  note('Calcul du replay…');
  // Laisse le message s'afficher avant le calcul.
  setTimeout(() => {
    let r;
    try {
      r = replay(st);
    } catch (e) {
      return note(`Le replay de cette partie a échoué : ${e.message}`);
    }
    const frames = r.frames;
    // Pour chaque image, où trouver la dernière fiche de chaque joueur : le défilement reste rapide.
    const at = [];
    const cur = {};
    frames.forEach((f, i) => {
      cur[f.pid] = i;
      at.push({ ...cur });
    });
    film = { frames, log: r.log, at, start: frames[0].t, end: Math.max(frames[frames.length - 1].t, saved.savedAt || 0), gid: st.gid };
    const off = Object.values(st.players).filter((p) => r.faithful[p.id] === false);
    note(off.length ? `Replay approché : la fin ne retombe pas tout à fait sur la vraie partie pour ${off.map((p) => p.name).join(', ')}.` : '');
    $('rp-main').hidden = false;
    seek(film.start);
  }, 30);
}

/** Dernière image à l'instant `time` (recherche dichotomique), -1 avant la première. */
function frameAt(time) {
  let lo = 0;
  let hi = film.frames.length - 1;
  if (film.frames[0].t > time) return -1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (film.frames[mid].t <= time) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

function playersAt(i) {
  if (i < 0) return [];
  return Object.values(film.at[i]).map((j) => film.frames[j].fiche);
}

function clockText(time) {
  return new Date(time).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function elapsedText(ms) {
  const m = Math.floor(ms / MIN);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  return `+${d ? `${d} j ` : ''}${h} h ${String(m % 60).padStart(2, '0')}`;
}

function seek(time) {
  t = Math.min(film.end, Math.max(film.start, time));
  render();
}

function render() {
  const i = frameAt(t);
  const players = playersAt(i);
  $('rp-clock').textContent = clockText(t);
  $('rp-elapsed').textContent = elapsedText(t - film.start);
  $('rp-time').value = String(Math.round(((t - film.start) / Math.max(1, film.end - film.start)) * 1000));
  $('rp-play').textContent = playing ? '❚❚' : '▶';
  $('rp-play').setAttribute('aria-label', playing ? 'Pause' : 'Lecture');
  drawMap(players);
  renderPlayers(players);
  renderLog();
}

function drawMap(players) {
  const canvas = $('rp-map');
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const css = canvas.clientWidth;
  if (canvas.width !== Math.round(css * dpr)) canvas.width = canvas.height = Math.round(css * dpr);
  const W = canvas.width;
  const cell = W / UNIVERSE.w;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#05070f';
  ctx.fillRect(0, 0, W, W);
  ctx.strokeStyle = 'rgba(150,170,230,0.10)';
  ctx.lineWidth = Math.max(1, dpr * 0.5);
  ctx.beginPath();
  for (let k = 1; k < UNIVERSE.w; k++) {
    ctx.moveTo(k * cell, 0);
    ctx.lineTo(k * cell, W);
    ctx.moveTo(0, k * cell);
    ctx.lineTo(W, k * cell);
  }
  ctx.stroke();
  drawSun(ctx, sunFor(film.gid), cell);

  // Planètes : grises si libres, à la couleur de leur propriétaire sinon.
  const owner = (w) => players.find((p) => sameCell(p.home, w) || p.colonies?.[w.id]);
  ctx.font = `${Math.round(cell * 0.32)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  for (const w of planetsFor(film.gid)) {
    const o = owner(w);
    const cx = (w.x + 0.5) * cell;
    const cy = (w.y + 0.5) * cell;
    ctx.globalAlpha = o ? 1 : 0.5;
    ctx.fillStyle = o ? o.color : '#8d95b3';
    ctx.beginPath();
    ctx.arc(cx, cy, cell * (w.kind && w.kind !== 'planet' ? 0.12 : o ? 0.26 : 0.18), 0, Math.PI * 2); // petits corps : plus petits
    ctx.fill();
    if (o && sameCell(o.home, w)) {
      ctx.strokeStyle = o.color;
      ctx.lineWidth = Math.max(1, cell * 0.06);
      ctx.beginPath();
      ctx.ellipse(cx, cy, cell * 0.42, cell * 0.14, -0.35, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (o) {
      ctx.fillStyle = '#e8ebf7';
      ctx.fillText(w.name, cx, cy + cell * 0.75);
    }
  }
  ctx.globalAlpha = 1;

  // Flottes : un losange à leur position du moment, un trait vers leur destination.
  for (const p of players) {
    for (const f of p.fleets || []) {
      const pos = fleetPos(f, t);
      const flying = moving(f, t);
      // Arrêtée, elle est souvent sur une planète de sa couleur : on la décale pour la voir.
      const x = (pos.x + (flying ? 0.5 : 0.8)) * cell;
      const y = (pos.y + (flying ? 0.5 : 0.2)) * cell;
      if (flying) {
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = 0.5;
        ctx.setLineDash([cell * 0.15, cell * 0.12]);
        ctx.lineWidth = Math.max(1, cell * 0.04);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo((f.to.x + 0.5) * cell, (f.to.y + 0.5) * cell);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
      const r = cell * 0.2;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = '#05070f';
      ctx.lineWidth = Math.max(1, cell * 0.04);
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
}

function renderPlayers(players) {
  $('rp-players').innerHTML = players
    .sort((a, b) => a.rank - b.rank)
    .map((p) => {
      const R = RACES[p.race];
      const planets = (p.planet ? 1 : 0) + Object.keys(p.colonies || {}).length;
      const docked = countShips(p.planet?.ships || {}) + Object.values(p.colonies || {}).reduce((n, c) => n + countShips(c.ships || {}), 0);
      const flying = (p.fleets || []).reduce((n, f) => n + countShips(f.ships), 0);
      const s = p.planet ? stateAt(p.planet, Math.max(t, p.planet.at)) : null;
      const sub = p.planet
        ? `${planets} planète${planets > 1 ? 's' : ''} · ${docked + flying} vaisseaux (${flying} en vol) · ${Math.floor(s.stock.minerals)} minéraux`
        : p.race
          ? 'choisit sa planète'
          : 'choisit sa race';
      return `<div class="player card">
        <span class="dot" style="background:${esc(p.color)}"></span>
        <div class="p-main">
          <div class="p-name">${esc(p.name)}${R ? ` <span class="tag race-tag" style="--race:${R.color}">${raceIcon(p.race)} ${R.name}</span>` : ''}</div>
          <div class="p-sub mono">${esc(sub)}</div>
        </div>
        <div class="p-score mono">${s ? `${score(p.race, s.levels)} pts` : ''}</div>
      </div>`;
    })
    .join('');
}

let shownLog = -1;
function renderLog() {
  // Les entrées jusqu'à l'instant affiché, la plus récente en haut.
  let n = 0;
  while (n < film.log.length && film.log[n].at <= t) n++;
  if (n === shownLog) return;
  shownLog = n;
  const colors = Object.fromEntries(film.frames.map((f) => [f.pid, f.fiche.color]));
  const time = (at) => new Date(at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  $('rp-log').innerHTML =
    film.log
      .slice(Math.max(0, n - 40), n)
      .reverse()
      .map((l) => `<li><span class="mono hint">${time(l.at)}</span> <span class="dot" style="background:${esc(colors[l.pid] || '#8d95b3')}"></span> ${esc(l.text)}</li>`)
      .join('') || '<li class="hint">Rien encore.</li>';
}

/** Une image par rafraîchissement d'écran pendant la lecture. */
function step(now) {
  if (!playing) return;
  const speed = Number($('rp-speed').value);
  const dt = Math.min(1, (now - last) / 1000);
  last = now;
  let next = t + dt * speed * 1000;
  // Carte immobile et prochain événement loin : on y saute.
  const i = frameAt(t);
  const anyMoving = playersAt(i).some((p) => (p.fleets || []).some((f) => moving(f, t)));
  const upcoming = film.frames[i + 1]?.t;
  if (!anyMoving && upcoming && upcoming - t > QUIET_S * speed * 1000) next = upcoming - 0.3 * speed * 1000;
  seek(next);
  if (t >= film.end) {
    playing = false;
    render();
    return;
  }
  requestAnimationFrame(step);
}

$('rp-play').onclick = () => {
  if (!film) return;
  if (!playing && t >= film.end) t = film.start;
  playing = !playing;
  last = performance.now();
  render();
  if (playing) requestAnimationFrame(step);
};

$('rp-time').oninput = (e) => {
  playing = false;
  seek(film.start + (Number(e.target.value) / 1000) * (film.end - film.start));
};

$('rp-prev').onclick = () => {
  playing = false;
  const i = frameAt(t - 1);
  seek(i >= 0 ? film.frames[i].t : film.start);
};

$('rp-next').onclick = () => {
  playing = false;
  const i = frameAt(t);
  seek(film.frames[i + 1]?.t ?? film.end);
};

window.addEventListener('resize', () => film && render());

load();
