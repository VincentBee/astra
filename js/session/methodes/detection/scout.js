/** Passe en revue les planètes des autres : celles que je vois rejoignent mes renseignements. */
export function scout(now = this.now()) {
  const eyes = this.eyes(now);
  if (!eyes.length) return;
  for (const p of Object.values(this.state.players)) {
    if (p.id === this.me) continue;
    for (const pl of this.planetsOf(p)) this.knownOwner(pl.cell, now, eyes);
  }
  for (const k of Object.keys(this.intel || {})) {
    const [x, y] = k.split(',').map(Number);
    this.knownOwner({ x, y }, now, eyes); // perdue ou abandonnée sous mes yeux : oubliée
  }
}
