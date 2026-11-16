/** Planètes encore en vie d'un joueur : ni gelées, ni prises. */
export function livePlanets(p, now = this.now()) {
  if (p?.out) return [];
  return this.planetsOf(p).filter((pl) => this.frostOf(pl.cell) > now && this.ownerAt(pl.cell)?.id === p.id);
}
