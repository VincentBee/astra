/** Mêmes niveaux de technologies, quel que soit l'ordre des clés. */
export function sameTech(a, b) {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  return [...keys].every((k) => (Number(a?.[k]) || 0) === (Number(b?.[k]) || 0));
}
