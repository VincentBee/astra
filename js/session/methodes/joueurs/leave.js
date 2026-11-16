/**
 * Quitter la partie avant le départ (D-399 : l'hôte retire une IA du lobby). La fiche
 * reste, marquée `left` : la plus récente, elle l'emporte sur toutes les copies, et le
 * joueur n'est plus ni montré, ni compté, ni attendu au départ.
 */
export function leave() {
  if (!this.canAct || !this.beforeStart) return false;
  const p = this.state.players[this.me];
  p.left = this.now();
  delete p.ready;
  delete p.go;
  this.touch(this.addLog(`${p.name} quitte la partie.`));
  this.changed();
  return true;
}
