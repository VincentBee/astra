/** « Tes pertes : 3 · Ses pertes : 4 · Butin : 173 minéraux » (pertes adverses inconnues : ancien rapport). */
export function reportDetail(e) {
  if (e.kind !== 'combat') return '';
  const n = (v) => (v == null ? '?' : v);
  const parts = [`Tes pertes : ${n(e.mine)}`, `Ses pertes : ${n(e.theirs)}`];
  if (e.loot) parts.push(`Butin : ${e.loot}`);
  if (e.pillaged) parts.push(`Pillé : ${e.pillaged}`);
  return parts.join(' · ');
}
