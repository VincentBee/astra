import { settle, startResearch } from '../../../game.js';
import { TECHS } from '../../../tech.js';
import { maxTech } from '../../outils/max-tech.js';
import { techOf } from '../../outils/tech-of.js';

/**
 * Recherche : sur n'importe laquelle de mes planètes qui a un labo, avec le niveau de ce labo.
 * Une recherche à la fois par planète, et pas la même technologie sur deux planètes à la fois.
 */
export function research(key, where = 'home') {
  if (!this.canAct) return;
  const p = this.state.players[this.me];
  if (!p?.planet) return;
  const pl = this.myPlanet(where);
  if (!pl) return;
  if (this.queuedBehind(pl)) return this.toPlan('planResearch', key, where);
  const other = this.planetsOf(p).find((x) => x.key !== pl.key && x.planet.research?.key === key);
  if (other) return this.ontoast?.(`Cette technologie est déjà en recherche sur ${other.name}.`);
  // La copie des technologies d'une colonie peut avoir un passage de retard : on part des plus hautes.
  if (pl.key !== 'home' && Object.entries(p.planet.tech || {}).some(([k, n]) => n > (pl.planet.tech?.[k] || 0))) {
    settle(pl.planet, this.now());
    pl.planet.tech = maxTech(pl.planet.tech, techOf(p));
  }
  const err = startResearch(pl.planet, key, this.now());
  if (err) return this.ontoast?.(err);
  this.touch(this.addLog(`${p.name} lance la recherche ${TECHS[p.race][key].name} niv. ${pl.planet.research.level} sur ${pl.name}.`));
  this.changed();
}
