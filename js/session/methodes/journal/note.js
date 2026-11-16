import { JOURNAL_MAX } from '../../constantes/journal-max.js';

/**
 * Mon carnet : les combats et les planètes perdues qui me concernent, vus de
 * mon côté (pertes des deux côtés, `loot` que j'ai pris, `pillaged` qu'on m'a pris). Gardé sur ce téléphone seulement,
 * avec la sauvegarde ; il ne part pas sur le réseau. `n` numérote les
 * entrées : celles au-delà de `read` sont neuves (résumé « pendant ton
 * absence »). `at` : l'heure du combat, qui peut être dans le passé (D-109).
 */
export function note(p, entry) {
  if (p.id !== this.me) return;
  const j = (this.journal ||= { n: 0, read: 0, list: [] });
  j.n += 1;
  j.list = [...j.list, { n: j.n, ...entry }].slice(-JOURNAL_MAX);
  this.onnote?.(j.list.at(-1));
}
