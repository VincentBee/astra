/** Pertes de chaque camp sur tout le combat (défense comprise). */
export function totalLost(rep, who) {
  const key = who === 'a' ? 'aLost' : 'dLost';
  const out = {};
  for (const r of rep.rounds) for (const [k, v] of Object.entries(r[key] || {})) out[k] = (out[k] || 0) + v;
  return out;
}
