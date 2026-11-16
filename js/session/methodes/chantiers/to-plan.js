/** Renvoie l'ordre vers le fil (`planBuild`, `planResearch`, `planShips`), noté au journal sous ce nom. */
export function toPlan(kind, ...args) {
  if (this.entry) this.entry.k = kind;
  return this[kind](...args);
}
