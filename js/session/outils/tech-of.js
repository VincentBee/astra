/** Technologies d'un joueur : celles de sa planète mère (aucune tant qu'il n'en a pas). */
export const techOf = (p) => p?.planet?.tech || {};
