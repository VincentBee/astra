import { newPlanet, SOIL } from '../../../regles/game/index.js';
import { countShips, fuelAt } from '../../../regles/fleet/index.js';
import { techOf } from '../../outils/tech-of.js';
import { lootText } from '../../textes/loot-text.js';

/**
 * Ma flotte vient de prendre la planète `pl` de `enemy` : ses bâtiments
 * sont tombés avec sa défense, elle devient ma colonie (à rebâtir pour ma
 * race), avec ce qui reste de la flotte, sa cargaison et le butin. Son téléphone la retirera de sa fiche en
 * lisant mon rapport.
 */
export function capture(p, f, w, pl, enemy, res, take, now) {
  const colony = newPlanet(p.race, f.arrive, w);
  colony.stock = { minerals: 0, food: 0 };
  for (const r of SOIL) colony.stock[r] = (f.cargo?.[r] || 0) + (take[r] || 0);
  colony.stock.energy = Math.floor(fuelAt(f, p.race, now));
  colony.tech = { ...techOf(p) };
  colony.claimAt = f.arrive;
  colony.captured = true; // prise au combat, sans colonisateur : evacuate n'en rendra pas (D-200)
  colony.ships = { ...res.attLeft };
  p.colonies = { ...(p.colonies || {}), [w.id]: colony };
  const docked = { ...(p.docked || {}) };
  for (const id of [f.id, ...(f.absorbed || [])]) docked[id] = w.id;
  p.docked = Object.fromEntries(Object.entries(docked).slice(-60));
  p.fleets = p.fleets.filter((x) => x.id !== f.id);
  this.addLog(`${p.name} prend ${pl.name} à ${enemy.name} !`);
  this.ontoast?.(`${pl.name} est à toi !`);
  this.note(p, {
    at: f.arrive, kind: 'combat', who: enemy.name, planet: pl.name, capture: true, mine: countShips(res.attLost), theirs: countShips(res.defLost), loot: lootText(take),
    rep: res.report, side: 'a', tone: 'good', text: `Tu prends ${pl.name} à ${enemy.name}.`,
  });
  return true;
}
