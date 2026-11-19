import { readTap } from '../../../aim/index.js';
import { etat } from '../../etat.js';
import { actionsFor } from '../selection/actions-for.js';
import { cellOf } from '../selection/cell-of.js';
import { fleetSpots } from '../selection/fleet-spots.js';
import { mapItems } from '../selection/map-items.js';
import { cellCss } from '../zoom/cell-css.js';
import { gesture } from '../zoom/gesture.js';

/** La cible visée par la flotte qu'on traîne : { fid, from, t, at, cell, label, short } ou null. */
export function aimRead(now) {
  const a = gesture.aim;
  if (!a?.started || !a.at || !etat.session.myFleet(a.id)) return null;
  const from = fleetSpots(now).find((s) => s.p.id === etat.session.me && s.f.id === a.id);
  if (!from) return null;
  const t = readTap(mapItems(now), a.at, cellCss(a.at), a.id, true);
  const it = t.kind === 'one' ? t.it : null;
  const items = t.kind === 'many' ? [] : actionsFor(a.id, it, a.at);
  const back = Math.hypot(from.x - a.at.x, from.y - a.at.y) < 0.5 && !it;
  const label = back ? 'Lâche ailleurs pour l’envoyer' : t.kind === 'many' ? 'Lâche pour choisir' : items.length > 1 && it?.type !== 'foe' ? `${it?.type === 'planet' ? it.w.name : `[${Math.round(a.at.x)}:${Math.round(a.at.y)}]`} · lâche pour choisir l’ordre` : items[0]?.label || 'Hors de la carte';
  return { fid: a.id, from, t, it, at: a.at, cell: it?.type === 'foe' ? null : cellOf(it, a.at), label, short: !!items[0]?.short, foe: it?.type === 'foe' ? { pid: it.spot.p.id, id: it.id } : null };
}
