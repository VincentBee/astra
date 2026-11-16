// Chargement de Trystero. Un échec n'est pas gardé (#86, D-510) : on oublie la
// promesse ratée, et l'essai suivant change d'adresse (`?r=1`, `?r=2`…), car
// Chromium garde l'échec d'un import() pour la même adresse.

// État partagé du module (règle 5 : un binding importé ne se réassigne pas).
// Remplace `let lib`, `let failures`, qui étaient des variables du fichier d'origine.
export const etat = { lib: null, failures: 0 };
