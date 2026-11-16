/**
 * Comportement en voyage, à part de l'ordre : une flotte passive ne se bat que
 * si on lui en donne l'ordre ; une flotte agressive combat toute flotte ennemie
 * visible qu'elle touche (CONTACT), en route ou à l'arrêt, puis reprend son
 * trajet. Sans champ `stance` (flottes d'avant), une flotte est passive.
 */
export const STANCES = {
  passive: { name: 'Passive', hint: 'ne combat que sur ordre' },
  aggressive: { name: 'Agressive', hint: 'combat toute flotte ennemie qu’elle croise' },
};
