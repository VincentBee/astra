import { countShips, together } from '../../../../fleet.js';
import { etat } from '../../etat.js';
import { fleetName } from '../../flotte/fleet-name.js';
import { renderFleetInfo } from '../../flotte/pilotage/render-fleet-info.js';
import { de } from '../de.js';
import { cellOf } from './cell-of.js';
import { inUniverse } from './in-universe.js';
import { selectFleet } from './select-fleet.js';
import { showPlanet } from './show-planet.js';

/**
 * Ce qu'on peut faire de l'objet `it` (ou de la case vide sous `at`) : la liste d'un menu.
 * `fid` : ma flotte qui recevra l'ordre ; sans elle, choisir l'objet (flotte ou fiche).
 */
export function actionsFor(fid, it, at) {
  if (it?.type === 'mine' && it.id !== fid) {
    const g = it.spot.f;
    const pick = { icon: 'fleet', label: `${fid ? 'Choisir · ' : ''}${fleetName(g)} · ${countShips(g.ships)} vaisseau${countShips(g.ships) > 1 ? 'x' : ''}`, run: () => selectFleet(it.id) };
    const f = fid && etat.session.myFleet(fid);
    if (!f) return [pick];
    // Une autre de mes flottes, flotte choisie (D-159) : fusionner d'abord, ou la choisir à la place.
    const now = etat.session.now();
    if (together(f, g, now)) return [{ icon: 'merge', primary: true, label: `Fusionner avec ${fleetName(g)}`, run: () => etat.session.mergeFleets(g.id, fid) && renderFleetInfo() }, pick];
    const short = !!etat.session.ordersAt(fid, g.to)[0]?.short;
    return [{ icon: 'merge', primary: true, short, label: `Rejoindre ${fleetName(g)} et fusionner${short ? ' · panne en route' : ''}`, run: () => etat.session.joinFleet(fid, g.id) && renderFleetInfo() }, pick];
  }
  if (!fid) return it?.type === 'planet' ? [{ icon: 'planet', label: `${it.w.name} · fiche`, run: () => showPlanet(it.w) }] : [];
  if (it?.type === 'mine') return [];
  if (it?.type === 'foe') {
    const { p, f } = it.spot;
    return [{ icon: 'attack', primary: true, label: `Attaquer la flotte ${de(p.name)} · ${countShips(f.ships)} vaisseau${countShips(f.ships) > 1 ? 'x' : ''}`, run: () => etat.session.chaseFleet(fid, p.id, f.id) && renderFleetInfo() }];
  }
  const cell = cellOf(it, at);
  if (!inUniverse(cell)) return [];
  const opts = etat.session.ordersAt(fid, cell);
  const warn = opts[0]?.short ? ' · panne en route' : '';
  const out = opts.map((o) => ({
    icon: { dock: 'dock', attack: 'attack', conquer: 'attack', colonize: 'planet' }[o.kind] || 'fleet',
    primary: o.kind !== 'move',
    kind: o.kind,
    short: o.short,
    label: o.label + warn,
    run: () => etat.session.moveFleet(fid, cell, o.kind) && renderFleetInfo(),
  }));
  if (out.length && !out.some((o) => o.primary)) out[0].primary = true;
  return out;
}
