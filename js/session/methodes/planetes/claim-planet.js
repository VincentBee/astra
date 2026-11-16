import { newPlanet } from '../../../regles/game/index.js';

/** M'installer sur une planète libre : une fois la race choisie, au début de la partie. */
export function claimPlanet(id) {
  if (!this.canAct) return false;
  const p = this.state.players[this.me];
  const w = this.planets.find((x) => x.id === id);
  if (!p?.race || !w) return false;
  if (p.home) {
    this.ontoast?.('Tu as déjà une planète.');
    return false;
  }
  // Depuis le départ commun, la planète mère se fonde avec le colonisateur de départ.
  if (Number.isFinite(p.ready)) return this.refuse('Envoie ton colonisateur sur une planète libre : il y fondera ta planète mère.');
  if (p.out) {
    this.ontoast?.('Tu as perdu toutes tes planètes : tu es éliminé.');
    return false;
  }
  if (this.frostOf(w) <= this.now()) {
    this.ontoast?.(`${w.name} est gelée.`);
    return false;
  }
  if (w.kind && w.kind !== 'planet') {
    this.ontoast?.(`${w.name} est trop petit pour une planète mère : on peut seulement le coloniser.`);
    return false;
  }
  const owner = this.ownerAt(w);
  if (owner) {
    this.ontoast?.(`${w.name} appartient déjà à ${owner.name}.`);
    return false;
  }
  const now = this.now();
  p.home = { x: w.x, y: w.y };
  p.claimAt = now;
  p.since ??= now; // entrée dans la course (les parties d'avant la course n'en ont pas)
  p.planet ||= newPlanet(p.race, now, w);
  this.touch(this.addLog(`${p.name} s'installe sur ${w.name}.`));
  this.changed();
  return true;
}
