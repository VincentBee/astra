/** Le créateur de la partie : le premier arrivé (`rank`), à égalité le plus petit identifiant. */
export function isCreator(pid) {
  const first = Object.values(this.state?.players || {}).sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity) || (a.id < b.id ? -1 : 1))[0];
  return !!first && first.id === pid;
}
