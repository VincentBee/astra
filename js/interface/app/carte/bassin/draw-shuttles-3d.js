import { deps } from './deps.js';

/**
 * Mes navettes (D-556) : un trait pointillé entre leurs deux planètes, plus marqué pour la
 * flotte sélectionnée, avec une pointe vers la planète où elles livrent. Sur le plan du jeu (D-559).
 */
export function drawShuttles3d(ctx, view, now) {
  const { etat } = deps;
  const p = etat.session.state.players[etat.session.me];
  const seen = new Set();
  for (const f of p?.fleets || []) {
    const o = f.order;
    if (o?.kind !== 'shuttle') continue;
    const key = `${o.a.x}:${o.a.y}>${o.b.x}:${o.b.y}`;
    const sel = f.id === etat.selFleet;
    if (seen.has(key) && !sel) continue;
    seen.add(key);
    const a = view.pt(o.a.x + 0.5, o.a.y + 0.5, 0);
    const b = view.pt(o.b.x + 0.5, o.b.y + 0.5, 0);
    const s = (a.s + b.s) / 2;
    const ang = Math.atan2(o.b.y - o.a.y, o.b.x - o.a.x); // sur le plan, en cases
    ctx.save();
    ctx.strokeStyle = '#6ad1f5';
    ctx.fillStyle = '#6ad1f5';
    ctx.globalAlpha = sel ? 0.8 : 0.4;
    ctx.lineWidth = Math.max(1, s * (sel ? 0.06 : 0.04));
    ctx.setLineDash([s * 0.18, s * 0.14]);
    ctx.lineDashOffset = -((now / 120) % (s * 0.32)); // le pointillé avance vers B
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
    const tu = o.b.x + 0.5 - Math.cos(ang) * 0.45;
    const tv = o.b.y + 0.5 - Math.sin(ang) * 0.45;
    const r = 0.16;
    const q = (t) => view.pt(tu + Math.cos(t) * r, tv + Math.sin(t) * r, 0);
    const p0 = q(ang);
    const p1 = q(ang + 2.4);
    const p2 = q(ang - 2.4);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
