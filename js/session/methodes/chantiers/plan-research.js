import { stateAt, PLAN_MAX, planAhead } from '../../../regles/game/index.js';
import { TECHS, techMissing } from '../../../regles/tech/index.js';
import { maxTech } from '../../outils/max-tech.js';
import { techOf } from '../../outils/tech-of.js';

/**
 * Ajoute une recherche au fil (D-158) : elle se lancera toute seule, labo
 * libre, dès que le stock couvrira son prix. Le labo, le niveau et les
 * prérequis comptent ce qui est déjà au fil (« labo 2, puis telle
 * recherche » se met au fil d'un coup).
 */
export function planResearch(key, where = 'home') {
  if (!this.canAct) return;
  const p = this.state.players[this.me];
  if (!p?.planet) return this.ontoast?.('Choisis d’abord ta race.');
  const pl = this.myPlanet(where);
  if (!pl) return;
  const T = TECHS[p.race];
  if (!Object.hasOwn(T, key)) return this.ontoast?.('Technologie inconnue.');
  this.settlePlan(p, pl);
  // La copie des technologies d'une colonie peut avoir un passage de retard : on part des plus hautes.
  if (pl.key !== 'home') pl.planet.tech = maxTech(pl.planet.tech, techOf(p));
  // Pas la même technologie sur deux planètes à la fois : ni en recherche, ni au fil ailleurs.
  const other = this.planetsOf(p).find((x) => x.key !== pl.key && (x.planet.research?.key === key || (x.planet.plan || []).some((it) => it?.tech === key)));
  if (other) return this.ontoast?.(`Cette technologie est déjà en recherche ou au fil sur ${other.name}.`);
  const plan = pl.planet.plan || [];
  if (plan.length >= PLAN_MAX) return this.ontoast?.(`Le fil est plein (${PLAN_MAX} au plus).`);
  const ahead = planAhead(stateAt(pl.planet, pl.planet.at));
  const lab = ahead.levels.lab || 0;
  if (!lab) return this.ontoast?.('Il faut un labo (ou en mettre un au fil).');
  const level = ahead.tech[key] || 0;
  if (level >= T[key].max) return this.ontoast?.('Niveau maximum atteint (fil compris).');
  const miss = techMissing(p.race, key, ahead.tech, lab);
  if (miss) return this.ontoast?.(`Il faut d’abord : ${miss}.`);
  pl.planet.plan = [...plan, { tech: key }];
  this.touch(this.addLog(`${p.name} ajoute la recherche ${T[key].name} niv. ${level + 1} au fil de ${pl.name}.`));
  this.changed();
}
