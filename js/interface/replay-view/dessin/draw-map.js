import { UNIVERSE, planetsFor, sameCell, sunFor } from '../../../game.js';
import { drawSun } from '../../sky/index.js';
import { fleetPos, moving } from '../../../fleet.js';
import { etat } from '../etat.js';
import { $ } from '../outils/dom.js';

export function drawMap(players) {
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
  drawSun(ctx, sunFor(etat.film.gid), cell);

  // Planètes : grises si libres, à la couleur de leur propriétaire sinon.
  const owner = (w) => players.find((p) => sameCell(p.home, w) || p.colonies?.[w.id]);
  ctx.font = `${Math.round(cell * 0.32)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  for (const w of planetsFor(etat.film.gid)) {
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
      const pos = fleetPos(f, etat.t);
      const flying = moving(f, etat.t);
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
