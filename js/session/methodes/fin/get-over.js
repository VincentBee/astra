import { isObj } from '../../fiches/is-obj.js';

/** Fin de la partie, ou null : { at, winner }, la plus ancienne qu'un joueur a vue. */
export function getOver() {
  const players = this.state?.players || {};
  // winner null : partie seule perdue, personne ne gagne (D-142).
  const seen = Object.values(players).map((p) => p.over).filter((o) => isObj(o) && Number.isFinite(o.at) && (o.winner === null || Object.hasOwn(players, o.winner)));
  if (!seen.length) return null;
  const first = seen.sort((a, b) => a.at - b.at || ((a.winner ?? '') < (b.winner ?? '') ? -1 : 1))[0];
  // Partie seule finie avant D-142 : la fiche dit « gagné », mais seul, on ne finit qu'en ayant tout perdu.
  const racers = Object.values(players).filter((p) => this.inRace(p)).length;
  return first.winner !== null && racers <= 1 ? { ...first, winner: null } : first;
}
