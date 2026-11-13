// Écran « Fin de partie » (D-143) : le classement final, calculé sans DOM pour être testé.

const MEDALS = ['gold', 'silver', 'bronze'];

/**
 * Tableau de fin d'une partie finie, ou null si elle ne l'est pas.
 * { rows: [{ id, place, name, race, color, pts, dead, winner, status, me, medal }] }
 * Le gagnant (`over.winner`) d'abord, comme le bandeau, puis l'ordre de `ranking` à l'heure de
 * la fin (D-460) ; `pts` : points d'avant la chute pour un joueur tombé (`best`), sinon ses
 * points. Médailles or, argent, bronze aux trois premiers, seulement s'il y a un vainqueur :
 * seul et éliminé, personne n'en a (D-142). `status` : le texte sous le nom, « gagne » pour le
 * gagnant, même tombé en dernier quand le froid a tout pris (D-461).
 */
export function finalBoard(session) {
  const over = session.over;
  if (!over) return null;
  const players = session.state.players;
  const ranked = session.ranking(over.at);
  const won = ranked.filter((r) => r.id === over.winner);
  const rows = [...won, ...ranked.filter((r) => r.id !== over.winner)].map((r, i) => {
    const p = players[r.id];
    const dead = r.dead != null;
    const winner = r.id === over.winner;
    return {
      id: r.id,
      place: i + 1,
      name: p.name,
      race: p.race,
      color: p.color,
      pts: Math.round(r.best),
      dead,
      winner,
      status: winner ? (dead ? 'tombé en dernier · gagne' : 'en vie · gagne') : dead ? 'éliminé' : 'en vie',
      me: r.id === session.me,
      medal: over.winner != null ? MEDALS[i] || null : null,
    };
  });
  return { rows }; // qui gagne : le bandeau `#race` le dit aussi (D-145)
}
