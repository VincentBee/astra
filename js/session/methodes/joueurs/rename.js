/**
 * Changer de nom, avant le départ seulement (D-400 : l'hôte renomme une IA dans le lobby).
 * Un nom vide est refusé : on garde l'ancien. 16 caractères au plus, comme à l'arrivée.
 */
export function rename(name) {
  if (!this.canAct || !this.beforeStart) return false;
  const p = this.state.players[this.me];
  const next = String(name ?? '').trim().slice(0, 16);
  if (!next || next === p.name) return false;
  const old = p.name;
  p.name = next;
  this.name = next;
  this.touch(this.addLog(`${old} s’appelle maintenant ${next}.`));
  this.changed();
  return true;
}
