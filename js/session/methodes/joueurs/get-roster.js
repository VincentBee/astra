/**
 * Joueurs de la partie, sans ceux partis avant le départ (`left`, IA retirée du lobby,
 * D-399). Leur fiche reste dans `state.players` (sinon la copie d'un autre la ferait
 * revenir), mais on ne la montre ni ne la compte plus.
 */
export function getRoster() {
  return Object.values(this.state?.players || {}).filter((p) => !Number.isFinite(p.left));
}
