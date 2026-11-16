/** Tout mon carnet est lu (jusqu'à `n`, ou jusqu'au bout). */
export function markRead(n) {
  const j = this.journal;
  if (!j || j.read >= (n ?? j.n)) return;
  j.read = Math.min(n ?? j.n, j.n);
  this.save();
}
