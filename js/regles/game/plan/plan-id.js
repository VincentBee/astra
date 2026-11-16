/** Identifiant d'un élément du fil, pour le retirer sans se tromper (le nom du bâtiment pour un bâtiment). */
export function planId(item) {
  if (typeof item === 'string') return item;
  return item?.tech ? `tech:${item.tech}` : `ship:${item?.ship}:${item?.n}`;
}
