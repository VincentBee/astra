/**
 * Niveaux et technologies une fois fini tout ce qui est lancé ou au fil
 * (état `s` de stateAt) : c'est sur eux qu'on ajoute au fil (« labo, puis
 * telle recherche » se met au fil d'un coup).
 */
export function planAhead(s) {
  const levels = { ...s.levels };
  const tech = { ...(s.tech || {}) };
  if (s.queue) levels[s.queue.key] = s.queue.level;
  if (s.research) tech[s.research.key] = s.research.level;
  for (const it of s.plan || []) {
    if (typeof it === 'string') levels[it] = (levels[it] || 0) + 1;
    else if (it.tech) tech[it.tech] = (tech[it.tech] || 0) + 1;
  }
  return { levels, tech };
}
