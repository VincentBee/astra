/** Le froid prend mes planètes qu'il a atteintes, la plus lointaine d'abord. */
export function freeze(p, now) {
  let any = false;
  for (;;) {
    const pl = this.planetsOf(p)
      .map((x) => ({ ...x, at: this.frostOf(x.cell) }))
      .filter((x) => x.at <= now)
      .sort((a, b) => a.at - b.at)[0];
    if (!pl) return any;
    this.losePlanet(p, pl.key, pl.at, 'gelée');
    any = true;
  }
}
