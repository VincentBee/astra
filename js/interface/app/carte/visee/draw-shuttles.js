import { etat } from '../../etat.js';

/**
 * Mes navettes (D-556) : un trait pointillé entre leurs deux planètes, plus marqué pour la
 * flotte sélectionnée, avec une pointe vers la planète où elles livrent.
 */
export function drawShuttles(ctx, cell, now) {
  const p = etat.session.state.players[etat.session.me];
  const seen = new Set();
  for (const f of p?.fleets || []) {
    const o = f.order;
    if (o?.kind !== 'shuttle') continue;
    const key = `${o.a.x}:${o.a.y}>${o.b.x}:${o.b.y}`;
    const sel = f.id === etat.selFleet;
    if (seen.has(key) && !sel) continue;
    seen.add(key);
    const ax = (o.a.x + 0.5) * cell;
    const ay = (o.a.y + 0.5) * cell;
    const bx = (o.b.x + 0.5) * cell;
    const by = (o.b.y + 0.5) * cell;
    const ang = Math.atan2(by - ay, bx - ax);
    ctx.save();
    ctx.strokeStyle = '#6ad1f5';
    ctx.fillStyle = '#6ad1f5';
    ctx.globalAlpha = sel ? 0.8 : 0.4;
    ctx.lineWidth = Math.max(1, cell * (sel ? 0.06 : 0.04));
    ctx.setLineDash([cell * 0.18, cell * 0.14]);
    ctx.lineDashOffset = -((now / 120) % (cell * 0.32)); // le pointillé avance vers B
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.setLineDash([]);
    const tx = bx - Math.cos(ang) * cell * 0.45;
    const ty = by - Math.sin(ang) * cell * 0.45;
    const r = cell * 0.16;
    ctx.beginPath();
    ctx.moveTo(tx + Math.cos(ang) * r, ty + Math.sin(ang) * r);
    ctx.lineTo(tx + Math.cos(ang + 2.4) * r, ty + Math.sin(ang + 2.4) * r);
    ctx.lineTo(tx + Math.cos(ang - 2.4) * r, ty + Math.sin(ang - 2.4) * r);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
