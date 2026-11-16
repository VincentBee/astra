import { etat } from '../../etat.js';
import { mapPlanets } from '../map-planets.js';
import { fleetSpots } from './fleet-spots.js';

/** Tout ce qu'on peut toucher sur la carte, en cases : planètes, mes flottes, flottes adverses vues. */
export function mapItems(now = etat.session.now()) {
  const out = mapPlanets().map((w) => ({ type: 'planet', w, x: w.x, y: w.y }));
  for (const spot of fleetSpots(now)) {
    out.push({ type: spot.p.id === etat.session.me ? 'mine' : 'foe', id: spot.f.id, spot, x: spot.x, y: spot.y });
  }
  return out;
}
