import { stateAt, PLAN_MAX, planAhead } from '../../../game.js';
import { SHIPS, shipUnlocked } from '../../../tech.js';
import { maxTech } from '../../outils/max-tech.js';
import { techOf } from '../../outils/tech-of.js';

/** Ajoute un lot de vaisseaux au fil (D-158) : chantier naval libre et stock suffisant, il part tout seul. */
export function planShips(type, count, where = 'home') {
  if (!this.canAct) return;
  const p = this.state.players[this.me];
  if (!p?.planet) return this.ontoast?.('Choisis d’abord ta race.');
  const pl = this.myPlanet(where);
  if (!pl) return;
  const S = SHIPS[p.race];
  if (!Object.hasOwn(S, type)) return this.ontoast?.('Vaisseau inconnu.');
  if (!(Number.isInteger(count) && count >= 1 && count <= 50)) return this.ontoast?.('Entre 1 et 50 vaisseaux par lot.');
  this.settlePlan(p, pl);
  if (pl.key !== 'home') pl.planet.tech = maxTech(pl.planet.tech, techOf(p));
  const plan = pl.planet.plan || [];
  if (plan.length >= PLAN_MAX) return this.ontoast?.(`Le fil est plein (${PLAN_MAX} au plus).`);
  const ahead = planAhead(stateAt(pl.planet, pl.planet.at));
  if (!ahead.levels.yard) return this.ontoast?.('Il faut un chantier naval (ou en mettre un au fil).');
  if (!shipUnlocked(p.race, type, ahead.tech)) return this.ontoast?.('Ce vaisseau n’est pas encore recherché (fil compris).');
  pl.planet.plan = [...plan, { ship: type, n: count }];
  this.touch(this.addLog(`${p.name} ajoute ${count} × ${S[type].name} au fil de ${pl.name}.`));
  this.changed();
}
