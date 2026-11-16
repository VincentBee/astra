import { stateAt, PLAN_MAX, planAhead, tooBig, upgradeCost, RACES, sameCell, usedPlaces } from '../../../regles/game/index.js';

/**
 * Ajoute un bâtiment au fil de construction de la planète (D-105) : il se
 * lancera tout seul, chantier libre, dès que le stock couvrira son prix.
 */
export function planBuild(key, where = 'home') {
  if (!this.canAct) return;
  const p = this.state.players[this.me];
  if (!p?.planet) return this.ontoast?.('Choisis d’abord ta race.');
  const pl = this.myPlanet(where);
  if (!pl) return;
  const R = RACES[p.race];
  if (!Object.hasOwn(R.buildings, key)) return this.ontoast?.('Bâtiment inconnu.');
  const w = this.planets.find((x) => sameCell(x, pl.cell));
  if (w?.places) pl.planet.places = Number.isFinite(pl.planet.places) ? w.places : Math.max(w.places, usedPlaces(pl.planet.levels));
  // On compte à partir de maintenant : sinon le fil partirait de l'heure du dernier calcul.
  this.settlePlan(p, pl);
  const plan = pl.planet.plan || [];
  if (plan.length >= PLAN_MAX) return this.ontoast?.(`Le fil est plein (${PLAN_MAX} au plus).`);
  // Places : celles déjà prises, le chantier en cours et ce qui attend déjà dans le fil.
  const q = pl.planet.queue;
  const taken = usedPlaces(pl.planet.levels) + (q ? (q.demolish ? -1 : 1) : 0) + plan.filter((x) => typeof x === 'string').length;
  if (Number.isFinite(pl.planet.places) && taken >= pl.planet.places) return this.ontoast?.(`Plus de place : les ${pl.planet.places} places de cette planète seront prises.`);
  // Prix plus grand que l'entrepôt, même une fois le fil fini : il ne partirait jamais et
  // bloquerait les bâtiments mis après lui (#50, D-441). L'entrepôt au fil ou en chantier compte.
  // Au rejeu, un vieux journal garde son sens (comme D-420).
  const ahead = planAhead(stateAt(pl.planet, pl.planet.at)).levels;
  const big = !this.replaying && tooBig(p.race, ahead, upgradeCost(p.race, key, ahead[key] || 0));
  if (big) return this.ontoast?.(`${big} (fil compris).`);
  pl.planet.plan = [...plan, key];
  this.touch(this.addLog(`${p.name} ajoute ${R.buildings[key].name} au fil de ${pl.name}.`));
  this.changed();
}
