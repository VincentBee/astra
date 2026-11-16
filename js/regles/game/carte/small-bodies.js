/**
 * Petits corps, en plus des planètes : on ne s'y installe pas au départ,
 * mais on peut les coloniser. Leurs gisements sont une fraction de ceux
 * d'une planète : l'astéroïde est surtout de la roche, la comète surtout de
 * la glace (de quoi faire de la nourriture).
 */
export const SMALL_BODIES = {
  asteroid: { label: 'Astéroïde', count: 4, places: [7, 10], share: { minerals: 0.35, food: 0.1 }, names: ['Cérès', 'Vesta', 'Pallas', 'Junon', 'Hygie', 'Éros'] },
  comet: { label: 'Comète', count: 3, places: [6, 8], share: { minerals: 0.2, food: 0.35 }, names: ['Halley', 'Encke', 'Tempel', 'Hale-Bopp', 'Swift'] },
};
