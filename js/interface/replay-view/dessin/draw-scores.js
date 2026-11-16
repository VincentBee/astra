import { etat } from '../etat.js';
import { ptsAt } from '../film/pts-at.js';
import { $ } from '../outils/dom.js';
import { esc } from '../outils/esc.js';
import { niceMax } from '../outils/nice-max.js';

/** Courbe des points de chaque joueur pendant toute la partie, avec un trait à l'instant affiché. */
export function drawScores() {
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
  const top = niceMax(Math.max(0, ...Object.values(etat.film.scores).flat().map((s) => s.pts)));
  const span = Math.max(1, etat.film.end - etat.film.start);
  const X = (time) => pad.l + ((time - etat.film.start) / span) * w;
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
  const colors = Object.fromEntries(etat.film.frames.map((f) => [f.pid, f.fiche.color]));
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  for (const [pid, line] of Object.entries(etat.film.scores)) {
    ctx.strokeStyle = colors[pid] || '#8d95b3';
    ctx.beginPath();
    line.forEach((s, i) => {
      if (i === 0) ctx.moveTo(X(s.t), Y(s.pts));
      else {
        ctx.lineTo(X(s.t), Y(line[i - 1].pts));
        ctx.lineTo(X(s.t), Y(s.pts));
      }
    });
    ctx.lineTo(X(etat.film.end), Y(line[line.length - 1].pts));
    ctx.stroke();
  }
  // L'instant affiché.
  ctx.strokeStyle = '#e8ebf7';
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(Math.round(X(etat.t)) + 0.5, pad.t);
  ctx.lineTo(Math.round(X(etat.t)) + 0.5, pad.t + h);
  ctx.stroke();
  ctx.globalAlpha = 1;
  // Légende : nom et points à l'instant affiché (le texte reste à la couleur du texte).
  // Dans l'ordre d'arrivée, comme la liste des joueurs : la légende ne saute pas pendant la lecture.
  const names = Object.fromEntries(etat.film.frames.map((f) => [f.pid, f.fiche.name]));
  const rank = Object.fromEntries(etat.film.frames.map((f) => [f.pid, f.fiche.rank]));
  $('rp-score-legend').innerHTML = Object.keys(etat.film.scores)
    .sort((a, b) => rank[a] - rank[b])
    .map((pid) => ({ pid, pts: ptsAt(pid, etat.t) }))
    .map(({ pid, pts }) => `<span><span class="dot" style="background:${esc(colors[pid] || '#8d95b3')}"></span> ${esc(names[pid])} <span class="mono">${pts == null ? '—' : `${pts} pts`}</span></span>`)
    .join('');
}
