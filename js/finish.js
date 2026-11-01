// Écran « Fin de partie » (D-143) : le classement final, calculé sans DOM pour être testé.

const MEDALS = ['gold', 'silver', 'bronze'];

/**
 * Tableau de fin d'une partie finie, ou null si elle ne l'est pas.
 * { rows: [{ id, place, name, race, color, pts, dead, me, medal }] }
 * Ordre de `ranking` à l'heure de la fin ; `pts` : points d'avant la chute pour un joueur
 * tombé (`best`), sinon ses points. Médailles or, argent, bronze aux trois premiers, seulement
 * s'il y a un vainqueur : seul et éliminé, personne n'en a (D-142).
 */
export function finalBoard(session) {
  const over = session.over;
  if (!over) return null;
  const players = session.state.players;
  const rows = session.ranking(over.at).map((r, i) => {
    const p = players[r.id];
    return {
      id: r.id,
      place: i + 1,
      name: p.name,
      race: p.race,
      color: p.color,
      pts: Math.round(r.best),
      dead: r.dead != null,
      me: r.id === session.me,
      medal: over.winner != null ? MEDALS[i] || null : null,
    };
  });
  return { rows }; // qui gagne : le bandeau `#race` le dit déjà (D-145)
}
