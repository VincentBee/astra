/** Résumé lisible d'une partie sauvegardée (écran d'accueil). */
export function describeSave(save) {
  const players = Object.values(save.state.players).filter((p) => !Number.isFinite(p.left)); // sans les IA retirées du lobby (D-399)
  return {
    names: players.sort((a, b) => a.rank - b.rank).map((p) => p.name),
    me: save.state.players[save.me]?.name,
    savedAt: save.savedAt,
  };
}
