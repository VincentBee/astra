/** `a` l'emporte sur `b` dans un duel d'horloges : le créateur, sinon le premier arrivé. */
export function outranks(a, b) {
  if (this.isCreator(a)) return true;
  if (this.isCreator(b)) return false;
  const [pa, pb] = [this.state.players[a], this.state.players[b]];
  return (pa?.rank ?? Infinity) < (pb?.rank ?? Infinity) || ((pa?.rank ?? Infinity) === (pb?.rank ?? Infinity) && a < b);
}
