import { fleetName } from '../../flotte/fleet-name.js';
import { openMenu } from '../menu/open-menu.js';
import { actionsFor } from './actions-for.js';
import { cellOf } from './cell-of.js';
import { showPlanet } from './show-planet.js';

/**
 * Donne un ordre à ma flotte `fid` vers ce qui est sous le doigt (lecture `t` de readTap) :
 * un seul ordre sans risque part tout de suite ; sinon un menu s'ouvre au doigt.
 */
export function orderAt(fid, t, at) {
  const list = t.kind === 'many' ? t.list : [t.kind === 'one' ? t.it : null];
  const items = list.flatMap((it) => actionsFor(fid, it, at));
  const target = t.kind === 'one' ? t.it : null;
  const cell = target?.type === 'foe' ? null : cellOf(target, at);
  // Un seul ordre, sans panne en route, vers une planète ou une case vide : pas de question.
  if (t.kind !== 'many' && target?.type !== 'foe' && items.length === 1 && !items[0].short) {
    items[0].run();
    return;
  }
  const planet = list.find((it) => it?.type === 'planet');
  if (planet && t.kind === 'one') items.push({ icon: 'planet', ghost: true, label: `Fiche de ${planet.w.name}`, run: () => showPlanet(planet.w) });
  const title = t.kind === 'many' ? 'Que viser ?' : planet ? `${planet.w.name} [${planet.w.x}:${planet.w.y}]` : target?.type === 'foe' ? 'Flotte ennemie' : target?.type === 'mine' ? fleetName(target.spot.f) : `Case [${cell.x}:${cell.y}]`;
  openMenu(at, items, { title, cell: t.kind === 'many' ? null : cell, fleet: fid, foe: target?.type === 'foe' ? { pid: target.spot.p.id, id: target.id } : null });
}
