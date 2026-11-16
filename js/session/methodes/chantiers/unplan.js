import { planId } from '../../../game.js';
import { planName } from '../../textes/plan-name.js';

/**
 * Retire l'élément `index` du fil, s'il s'agit bien de `id` (planId : le
 * nom du bâtiment, « tech:… » ou « ship:…:n ») : le fil a pu avancer entre
 * l'affichage et le toucher.
 */
export function unplan(id, index, where = 'home') {
  if (!this.canAct) return;
  const p = this.state.players[this.me];
  const pl = this.myPlanet(where);
  if (!pl) return;
  this.settlePlan(p, pl);
  const plan = pl.planet.plan || [];
  if (!Number.isInteger(index) || index < 0 || index >= plan.length || planId(plan[index]) !== id) return this.ontoast?.('Le fil a changé : déjà lancé ou retiré.');
  const [item] = plan.splice(index, 1);
  pl.planet.plan = [...plan];
  this.touch(this.addLog(`${p.name} retire ${planName(p.race, item)} du fil de ${pl.name}.`));
  this.changed();
}
