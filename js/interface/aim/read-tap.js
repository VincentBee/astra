import { contenders } from './contenders.js';
import { underFinger } from './under-finger.js';

/**
 * Que veut dire ce toucher ? `items` : objets de la carte, chacun avec `type` :
 * 'planet', 'mine' (une de mes flottes, avec `id`) ou 'foe' (flotte adverse).
 * `sel` : id de ma flotte sélectionnée (ou null). `drag` : on lâche une flotte qu'on traînait
 * (mes flottes ne sont alors pas des cibles : on vise un endroit).
 * Renvoie { kind: 'empty' } (rien sous le doigt), { kind: 'one', it } ou { kind: 'many', list }.
 * - sans flotte sélectionnée, les flottes adverses ne comptent pas (rien à leur faire) ;
 * - ma flotte sélectionnée ne compte que seule et nettement la plus proche (la relâcher) :
 *   au milieu d'autres objets, c'est eux qu'on vise (elle est souvent en orbite de sa cible).
 */
export function readTap(items, at, px, sel = null, drag = false) {
  const pool = items.filter((it) => (it.type === 'foe' ? !!sel : it.type === 'mine' ? !drag : true));
  const top = contenders(underFinger(pool, at, px), px).map((h) => h.it);
  if (!top.length) return { kind: 'empty' };
  if (top.length === 1) return { kind: 'one', it: top[0] };
  const list = top.filter((it) => !(it.type === 'mine' && it.id === sel));
  return list.length === 1 ? { kind: 'one', it: list[0] } : { kind: 'many', list };
}
