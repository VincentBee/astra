import { UNIVERSE } from '../../../../regles/game/carte/universe.js';
import { deps } from './deps.js';
import { quadPath } from './quad-path.js';

/** Autonomie de ma flotte sélectionnée : le losange des cases qu'elle atteint avec son carburant (distance en |dx| + |dy|), sur le plan du jeu. */
export function drawRange3d(ctx, view, now) {
  const { etat, gesture, fleetBurn, fleetPos, fuelAt } = deps;
  const id = gesture.aim?.started ? gesture.aim.id : etat.selFleet;
  const p = etat.session.state.players[etat.session.me];
  const f = id && etat.session.myFleet(id);
  if (!f) return;
  const r = fuelAt(f, p.race, now) / Math.max(1e-9, fleetBurn(p.race, f.ships));
  if (!(r > 0.3) || r > UNIVERSE.w * 2) return;
  const pos = fleetPos(f, now);
  const u = pos.x + 0.5;
  const v = pos.y + 0.5;
  const s = view.pt(u, v, 0).s;
  ctx.save();
  ctx.strokeStyle = '#f5c96a';
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = Math.max(1, s * 0.04);
  ctx.setLineDash([s * 0.2, s * 0.15]);
  ctx.beginPath();
  quadPath(ctx, view, [[u + r, v, 0], [u, v + r, 0], [u - r, v, 0], [u, v - r, 0]]);
  ctx.stroke();
  ctx.restore();
}
