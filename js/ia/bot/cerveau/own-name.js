import { freeName } from './free-name.js';

/**
 * Nom que doit porter `p` pour que deux joueurs n'aient jamais le même (D-480) : dans l'ordre
 * d'arrivée (puis l'identifiant), chacun garde son nom s'il est encore libre, sinon prend le
 * premier nom d'IA libre. Tous les téléphones qui voient les mêmes joueurs font les mêmes choix :
 * deux IA homonymes ne prennent pas, ensemble, le même nouveau nom.
 */
export function ownName(s, p) {
  const all = [...s.roster].sort((a, b) => a.rank - b.rank || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const taken = new Set(); // noms déjà attribués aux joueurs arrivés avant
  const held = new Set(all.map((o) => o.name)); // noms portés en ce moment : un nouveau nom n'en prend aucun
  for (const o of all) {
    const name = taken.has(o.name) ? freeName(new Set([...held, ...taken])) : o.name;
    taken.add(name);
    if (o.id === p.id) return name;
  }
  return p.name;
}
