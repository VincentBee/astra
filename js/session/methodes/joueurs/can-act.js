/** On peut jouer : partie en cours, pas finie, et je ne suis pas éliminé. */
export function canAct() {
  const p = this.state?.players[this.me];
  return this.status === 'playing' && !this.over && !p?.out && !Number.isFinite(p?.left);
}
