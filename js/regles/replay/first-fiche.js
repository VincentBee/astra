/** Fiche de départ d'un joueur, telle qu'à son arrivée dans la partie. */
export function firstFiche(p) {
  return { id: p.id, name: p.name, rank: p.rank, color: p.color, secretHash: p.secretHash, race: null, planet: null, home: null, actAt: p.rank };
}
