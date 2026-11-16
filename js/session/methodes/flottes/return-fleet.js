/** Renvoie une de mes flottes se poser sur sa planète de départ (ou la planète mère). */
export function returnFleet(id) {
  const p = this.state.players[this.me];
  const f = this.myFleet(id);
  const back = f && (this.planetOf(p, f.origin) || this.planetOf(p, 'home'));
  if (!back) return this.refuse('Aucune planète où rentrer.');
  return this.moveFleet(id, back.cell, 'dock');
}
