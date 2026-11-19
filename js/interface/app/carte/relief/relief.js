/**
 * Carte en 3D (D-563), en option : `on` = cochée dans les Réglages ; `mod` = le module 3D une fois
 * téléchargé (js/interface/app/carte/bassin/, assemblé à part) ; `loading` = son chargement en
 * cours ; `failed` = le dernier essai a raté (pas de réseau) ; `tries` = nombre d'essais.
 */
export const relief = { on: false, mod: null, loading: null, failed: false, tries: 0 };
