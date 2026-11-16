/** Gèle un objet et tout ce qu'il contient (une entrée du journal des ordres). */
export function deepFreeze(x) {
  if (!x || typeof x !== 'object' || Object.isFrozen(x)) return x;
  for (const v of Object.values(x)) deepFreeze(v);
  return Object.freeze(x);
}
