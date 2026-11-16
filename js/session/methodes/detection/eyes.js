import { sightRange } from '../../../tech.js';
import { fleetPos } from '../../../fleet.js';
import { techOf } from '../../outils/tech-of.js';

/**
 * Ce que je vois : un disque autour de chacune de mes planètes et de mes
 * flottes, plus grand avec la technologie de détection. [{ x, y, r }]
 * La carte cache ce qui est hors de ces disques ; c'est un filtre
 * d'affichage, pas un secret : la copie de la partie, elle, contient tout.
 */
export function eyes(now) {
  const me = this.state.players[this.me];
  if (!me?.race) return [];
  const tech = techOf(me);
  const out = this.planetsOf(me).map((pl) => ({ x: pl.cell.x, y: pl.cell.y, r: sightRange(me.race, tech, 'planet') }));
  for (const f of me.fleets || []) out.push({ ...fleetPos(f, now), r: sightRange(me.race, tech, 'fleet') });
  return out;
}
