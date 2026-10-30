// Écran du replay : la partie sauvegardée sur ce téléphone, rejouée depuis
// les journaux d'ordres (js/replay.js), à regarder comme un film.
// Rien n'est écrit : la sauvegarde et la partie en cours ne bougent pas.

import { loadGame } from './save.js';
import { replay, replayable, scoreSeries } from './replay.js';
import { RACES, raceIcon, UNIVERSE, planetsFor, stateAt, sameCell, sunFor } from './game.js';
import { drawSun } from './sky.js';
import { fleetPos, moving, countShips } from './fleet.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const MIN = 60_000;
// Rien ne bouge sur la carte : on saute au prochain événement plutôt que d'attendre.
const QUIET_S = 2;

let film = null; // { frames, log, at: [index de la fiche de chaque joueur, par image], start, end, scores }
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
    film = { frames, log: r.log, at, start: frames[0].t, end: Math.max(frames[frames.length - 1].t, saved.savedAt || 0), gid: st.gid, scores: scoreSeries(frames, st.gid) };
    const off = Object.values(st.players).filter((p) => r.faithful[p.id] === false);
    note(off.length ? `Replay approché : la fin ne retombe pas tout à fait sur la vraie partie pour ${off.map((p) => p.name).join(', ')}.` : '');
    $('rp-main').hidden = false;
    seek(film.start);
    // Venu du bandeau « partie finie » : la courbe des points, à la fin de la partie.
    if (location.hash === '#points') {
      seek(film.end);
      $('points').scrollIntoView();
    }
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
  drawScores();
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

/** Points d'un joueur à l'instant `time` (sa courbe est en escalier), null avant son arrivée. */
function ptsAt(pid, time) {
  let v = null;
  for (const s of film.scores[pid] || []) {
    if (s.t > time) break;
    v = s.pts;
  }
  return v;
}

/** Graduation ronde au-dessus de `v` : 1, 2 ou 5 × 10ⁿ. */
function niceMax(v) {
  if (v <= 0) return 10;
  const m = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 5, 10].map((k) => k * m).find((x) => x >= v);
}

/** Courbe des points de chaque joueur pendant toute la partie, avec un trait à l'instant affiché. */
function drawScores() {
  const canvas = $('rp-score');
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  const pad = { l: 44, r: 8, t: 8, b: 8 };
  const w = cssW - pad.l - pad.r;
  const h = cssH - pad.t - pad.b;
  const top = niceMax(Math.max(0, ...Object.values(film.scores).flat().map((s) => s.pts)));
  const span = Math.max(1, film.end - film.start);
  const X = (time) => pad.l + ((time - film.start) / span) * w;
  const Y = (pts) => pad.t + h - (pts / top) * h;
  // Grille discrète : 0, la moitié, le haut.
  ctx.font = '11px ui-monospace, monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const v of [0, top / 2, top]) {
    ctx.strokeStyle = 'rgba(150,170,230,0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, Math.round(Y(v)) + 0.5);
    ctx.lineTo(pad.l + w, Math.round(Y(v)) + 0.5);
    ctx.stroke();
    ctx.fillStyle = '#8d95b3';
    ctx.fillText(String(v), pad.l - 6, Y(v));
  }
  // Une courbe en escalier par joueur, à sa couleur, jusqu'à la fin de la partie.
  const colors = Object.fromEntries(film.frames.map((f) => [f.pid, f.fiche.color]));
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  for (const [pid, line] of Object.entries(film.scores)) {
    ctx.strokeStyle = colors[pid] || '#8d95b3';
    ctx.beginPath();
    line.forEach((s, i) => {
      if (i === 0) ctx.moveTo(X(s.t), Y(s.pts));
      else {
        ctx.lineTo(X(s.t), Y(line[i - 1].pts));
        ctx.lineTo(X(s.t), Y(s.pts));
      }
    });
    ctx.lineTo(X(film.end), Y(line[line.length - 1].pts));
    ctx.stroke();
  }
  // L'instant affiché.
  ctx.strokeStyle = '#e8ebf7';
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(Math.round(X(t)) + 0.5, pad.t);
  ctx.lineTo(Math.round(X(t)) + 0.5, pad.t + h);
  ctx.stroke();
  ctx.globalAlpha = 1;
  // Légende : nom et points à l'instant affiché (le texte reste à la couleur du texte).
  // Dans l'ordre d'arrivée, comme la liste des joueurs : la légende ne saute pas pendant la lecture.
  const names = Object.fromEntries(film.frames.map((f) => [f.pid, f.fiche.name]));
  const rank = Object.fromEntries(film.frames.map((f) => [f.pid, f.fiche.rank]));
  $('rp-score-legend').innerHTML = Object.keys(film.scores)
    .sort((a, b) => rank[a] - rank[b])
    .map((pid) => ({ pid, pts: ptsAt(pid, t) }))
    .map(({ pid, pts }) => `<span><span class="dot" style="background:${esc(colors[pid] || '#8d95b3')}"></span> ${esc(names[pid])} <span class="mono">${pts == null ? '—' : `${pts} pts`}</span></span>`)
    .join('');
}

function renderPlayers(players) {
  $('rp-players').innerHTML = players
    .sort((a, b) => a.rank - b.rank)
    .map((p) => {
      const R = RACES[p.race];
      const planets = (p.planet && p.home ? 1 : 0) + Object.keys(p.colonies || {}).length;
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
        <div class="p-score mono">${p.race ? `${ptsAt(p.id, t) ?? 0} pts` : ''}</div>
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

// Toucher la courbe : aller à ce moment de la partie.
$('rp-score').onpointerdown = $('rp-score').onpointermove = (e) => {
  if (!film || (e.type === 'pointermove' && !e.buttons)) return;
  const r = e.currentTarget.getBoundingClientRect();
  const x = (e.clientX - r.left - 44) / Math.max(1, r.width - 52);
  playing = false;
  seek(film.start + Math.min(1, Math.max(0, x)) * (film.end - film.start));
};

window.addEventListener('resize', () => film && render());

load();
