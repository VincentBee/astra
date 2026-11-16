/** Une de mes planètes, pour un ordre ; sinon un message. */
export function myPlanet(key) {
  const p = this.state.players[this.me];
  const found = this.planetOf(p, key);
  if (!found) this.ontoast?.('Planète introuvable.');
  return found;
}
