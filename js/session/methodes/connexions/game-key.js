/** Clé de la partie (les parties d'avant le rendez-vous n'en ont pas). */
export function gameKey() {
  return this.state.key || `k-${this.state.gid}`;
}
