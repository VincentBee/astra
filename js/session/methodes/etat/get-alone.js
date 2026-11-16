/** Seul en ligne alors que la partie compte d'autres joueurs. */
export function getAlone() {
  return !!this.state && this.links.size === 0 && Object.keys(this.state.players).length > 1;
}
