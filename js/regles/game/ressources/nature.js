/**
 * Gisements possibles, par ressource du sol : un maximum et une production
 * de base (par minute réelle = heure de jeu), tirés entre deux bornes. Une
 * planète riche a un gros gisement ; une planète vivace se régénère vite.
 */
export const NATURE = {
  minerals: { max: [60000, 200000], regen: [150, 450] },
  food: { max: [15000, 60000], regen: [80, 250] },
};
