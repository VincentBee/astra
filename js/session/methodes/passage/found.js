import { newPlanet, SOIL } from '../../../regles/game/index.js';
import { de } from '../../textes/de.js';

/**
 * Mon colonisateur arrive et je n'ai pas encore de planète : il fonde ma planète mère, avec les
 * bâtiments et le stock de départ de ma race (comme l'installation d'avant). Le colonisateur
 * est consommé, les autres vaisseaux s'y posent, la cargaison rejoint le stock ; le carburant
 * restant est perdu (même départ pour tous, quelle que soit la longueur du trajet).
 */
export function found(p, f, order) {
  const w = this.planets.find((x) => x.id === order.world);
  if (!w || !f.ships.colony || this.takenBefore(w, f.arrive)) {
    this.addLog(`${w?.name || 'La planète'} est déjà prise : la flotte ${de(p.name)} reste en orbite.`);
    this.ontoast?.(`${w?.name || 'La planète'} est déjà prise : choisis-en une autre.`);
    return true;
  }
  if (w.kind && w.kind !== 'planet') {
    this.addLog(`${w.name} est trop petit pour une planète mère : la flotte ${de(p.name)} reste en orbite.`);
    return true;
  }
  if (this.frostOf(w) <= f.arrive) {
    this.addLog(`${w.name} est gelée : la flotte ${de(p.name)} reste en orbite.`);
    return true;
  }
  const planet = newPlanet(p.race, f.arrive, w);
  const ships = { ...f.ships, colony: f.ships.colony - 1 };
  if (!ships.colony) delete ships.colony;
  planet.ships = ships;
  for (const r of SOIL) planet.stock[r] = (planet.stock[r] || 0) + (f.cargo?.[r] || 0);
  p.home = { x: w.x, y: w.y };
  p.claimAt = f.arrive;
  p.since ??= f.arrive;
  p.planet = planet;
  const docked = { ...(p.docked || {}) };
  for (const id of [f.id, ...(f.absorbed || [])]) docked[id] = w.id; // l'identifiant de la planète, pas « home » (D-360)
  p.docked = Object.fromEntries(Object.entries(docked).slice(-60));
  p.fleets = p.fleets.filter((x) => x.id !== f.id);
  this.addLog(`${p.name} fonde sa planète mère sur ${w.name}.`);
  this.ontoast?.(`Planète mère fondée sur ${w.name} !`);
  return true;
}
