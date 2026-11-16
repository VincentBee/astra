/** Ma race, ou null tant que je ne l'ai pas choisie. */
export function getMyRace() {
  return this.state?.players[this.me]?.race || null;
}
