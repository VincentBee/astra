/** Le remplissage en mots, pour les lecteurs d'écran : jamais de chiffre exact. */
export const fillWord = (k) => (k <= 0.02 ? 'vide' : k < 0.25 ? 'presque vide' : k < 0.75 ? 'à moitié' : k < 0.98 ? 'presque plein' : 'plein');
