import { newPlanet, RACES } from '../../../game.js';

/**
 * Choix de race. Il devient définitif quand la partie part (ou dès qu'on a une planète) ;
 * avant, on peut en changer (D-400 : l'hôte change la race d'une IA dans le lobby ;
 * l'écran du joueur, lui, ne propose le choix qu'une fois).
 */
export function chooseRace(race) {
  if (!this.canAct || !RACES[race]) return false;
  const p = this.state.players[this.me];
  if (!p) return false;
  const was = p.race;
  if (was && (this.startedAt != null || p.home || Number.isFinite(p.since))) {
    this.ontoast?.(`Tu as déjà choisi : ${RACES[p.race].name}. Ce choix est définitif.`);
    return false;
  }
  if (was === race) return false;
  p.race = race;
  // Joueur d'avant le choix de planète : il garde la sienne.
  if (p.home) p.planet = newPlanet(race, this.now());
  this.touch(this.addLog(was ? `${p.name} passe dans le camp des ${RACES[race].name}.` : `${p.name} rejoint le camp des ${RACES[race].name}.`));
  this.changed();
  return true;
}
