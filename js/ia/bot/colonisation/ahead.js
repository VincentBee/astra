/**
 * Le rival `r` arrive-t-il avant moi (`arrive`, joueur `me`) ? À la même milliseconde, le plus
 * petit identifiant passe : deux IA symétriques ne s'écartent pas toutes les deux (D-490).
 */
export const ahead = (r, arrive, me) => !!r && (r.arrive < arrive || (r.arrive === arrive && r.pid < me));
