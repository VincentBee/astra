/** Dans la course sans planète, et plus aucun colonisateur (détruit, donné) : éliminé. */
export function noColonizer(p, now) {
  if (!Number.isFinite(p.ready) || !Number.isFinite(p.since) || p.home || p.out != null) return false;
  if ((p.fleets || []).some((f) => f.ships?.colony > 0)) return false;
  this.addLog(`${p.name} n’a plus de colonisateur pour fonder sa planète : ${p.name} est éliminé.`);
  this.eliminate(p, now, this.scoreOf(p));
  this.ontoast?.('Plus de colonisateur pour fonder ta planète : tu es éliminé.', 8000);
  this.note(p, { at: now, kind: 'planet', tone: 'bad', text: 'Plus de colonisateur pour fonder ta planète : tu es éliminé.' });
  return true;
}
