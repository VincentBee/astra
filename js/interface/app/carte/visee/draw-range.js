import { fleetBurn, fleetPos, fuelAt } from '../../../../regles/fleet/index.js';
import { UNIVERSE } from '../../../../regles/game/index.js';
import { etat } from '../../etat.js';
import { gesture } from '../zoom/gesture.js';

/** Autonomie de ma flotte sélectionnée : le losange des cases qu'elle atteint avec son carburant (distance en |dx| + |dy|). */
export function drawRange(ctx, cell, now) {
  const id = gesture.aim?.started ? gesture.aim.id : etat.selFleet;
  const p = etat.session.state.players[etat.session.me];
  const f = id && etat.session.myFleet(id);
  if (!f) return;
  const r = fuelAt(f, p.race, now) / Math.max(1e-9, fleetBurn(p.race, f.ships));
  if (!(r > 0.3) || r > UNIVERSE.w * 2) return;
  const pos = fleetPos(f, now);
  const cx = (pos.x + 0.5) * cell;
  const cy = (pos.y + 0.5) * cell;
  ctx.save();
  ctx.strokeStyle = '#f5c96a';
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = Math.max(1, cell * 0.04);
  ctx.setLineDash([cell * 0.2, cell * 0.15]);
  ctx.beginPath();
  ctx.moveTo(cx + r * cell, cy);
  ctx.lineTo(cx, cy + r * cell);
  ctx.lineTo(cx - r * cell, cy);
  ctx.lineTo(cx, cy - r * cell);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}
