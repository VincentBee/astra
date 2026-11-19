/**
 * Ce que le module de la carte en 3D (D-563) emprunte au jeu : les modules qui ont un état
 * (la session, la sélection, le zoom, le geste en cours…), et les fonctions des règles dont il
 * se sert (pour ne pas en télécharger une deuxième copie). Il est assemblé à part
 * (`dist/js/bassin-3d.js`) : s'il les importait, il aurait ses propres copies, vides. Le jeu
 * les lui donne au chargement (`installDeps`).
 */
export const deps = {};
