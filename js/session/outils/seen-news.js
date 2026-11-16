/**
 * Ce que je sais des autres a changé depuis ma dernière entrée : { s: { pid:
 * nombre d'entrées de son journal dans ma copie } }, ou rien. Le rejeu redonne
 * ainsi à chacun, à chaque ordre, les fiches des autres telles qu'il les
 * voyait (même partie coupée en deux, même horloges décalées).
 */
export function seenNews(state, me) {
  const mine = state.players[me];
  if (!mine) return {};
  const before = {};
  for (const o of mine.orders || []) if (o.s) Object.assign(before, o.s);
  const s = {};
  for (const p of Object.values(state.players)) {
    const n = p.orders?.length || 0;
    if (p.id !== me && before[p.id] !== n) s[p.id] = n;
  }
  return Object.keys(s).length ? { s } : {};
}
