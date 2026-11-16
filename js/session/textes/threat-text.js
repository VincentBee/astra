import { de } from './de.js';

/**
 * Texte du bandeau d'alerte (D-133), en clair : `main` décrit la menace en tête de
 * `threats()`, `more` compte les autres. null s'il n'y a rien. Le jeu et les
 * scénarios de test l'affichent tel quel.
 */
export function threatText(list) {
  if (!list?.length) return null;
  const [t] = list;
  const who = `${t.n} vaisseau${t.n > 1 ? 'x' : ''} ${de(t.p.name)}`;
  const cells = Math.max(1, Math.round(t.dist));
  const main =
    t.eta == null ? `${who} en vue, à ${cells} case${cells > 1 ? 's' : ''} ${de(t.target.name)}`
    : t.eta > 0 ? `${who} sur ${t.target.name} dans ${Math.ceil(t.eta / 1000)} s`
    : `${who} en orbite ${de(t.target.name)}`;
  const more = list.length > 1 ? `+${list.length - 1} autre${list.length > 2 ? 's' : ''}` : '';
  return { main, more };
}
