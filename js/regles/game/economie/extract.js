/**
 * Ce qu'on tire vraiment du sol, par heure de jeu : tout ce que demandent les
 * bâtiments tant que le gisement n'est pas vide ; une fois vide, pas plus que
 * ce que la planète produit d'elle-même.
 */
export function extract(res, want, nature, reserve, h) {
  if (!nature?.[res]) return want; // planète d'avant les gisements : sans limite
  const avail = reserve[res] / h + nature[res].regen;
  // Jamais négatif (#76) : une réserve abîmée ne vide pas l'entrepôt.
  return Math.max(0, Math.min(want, avail));
}
