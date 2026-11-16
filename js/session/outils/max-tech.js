/** Les plus hauts niveaux de deux listes de technologies. */
export function maxTech(a, b) {
  const out = { ...(a || {}) };
  for (const [k, n] of Object.entries(b || {})) if ((Number(n) || 0) > (Number(out[k]) || 0)) out[k] = n;
  return out;
}
