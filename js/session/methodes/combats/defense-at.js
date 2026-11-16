import { stateAt, sameCell } from '../../../regles/game/index.js';

/**
 * Planète d'un autre joueur telle que je la vois à `at`, moins mes
 * combats que son téléphone n'a pas encore lus : sa fiche ne montre ces
 * pertes et ces pillages qu'après, et les ignorer ferait piller le même
 * stock et tuer les mêmes vaisseaux plusieurs fois.
 */
export function defenseAt(p, enemy, pl, at) {
  const def = stateAt(pl.planet, at);
  const ships = { ...def.ships };
  const stock = { ...def.stock };
  // Les combats des autres joueurs contre elle, que je vois et qu'elle n'a pas encore lus, aussi.
  const reports = Object.values(this.state.players).flatMap((o) => (o.id === enemy.id ? [] : o.effects || []));
  for (const e of reports) {
    if (e.to !== enemy.id || enemy.applied?.includes(e.id)) continue;
    if (e.cell ? !sameCell(e.cell, pl.cell) : e.key !== pl.key) continue; // par case (D-360), par clé pour un ancien rapport
    for (const [k, n] of Object.entries(e.ships || {})) ships[k] = Math.max(0, (ships[k] || 0) - n);
    for (const [r, v] of Object.entries(e.take || {})) stock[r] = Math.max(0, (stock[r] || 0) - v);
  }
  return { ...def, ships, stock };
}
