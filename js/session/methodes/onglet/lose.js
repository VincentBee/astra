/** Un autre onglet a pris la partie : tout s'arrête ici, IA comprises, et plus rien n'est sauvé. */
export function lose() {
  if (this.lost) return;
  this.lost = true;
  this.end();
  this.onlost?.(this);
}
