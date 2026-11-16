import { GRACE_MS } from './grace-ms.js';
import { ABANDON_MS } from './abandon-ms.js';

/**
 * Sort d'une offre que je dois régler, vue de chez moi : `answer` est la
 * réponse de l'autre joueur (ou null), `theirActAt` l'heure de la dernière
 * modification de sa fiche. 'accepted' : je reçois ce que j'ai demandé ;
 * 'returned' : mon séquestre me revient ; null : j'attends.
 */
export function outcome(offer, answer, now, theirActAt = 0) {
  if (answer) return answer.ok && answer.at <= offer.expires ? 'accepted' : 'returned';
  // Sa fiche a bougé bien après l'expiration sans réponse : il n'acceptera plus.
  if (theirActAt > offer.expires + GRACE_MS) return 'returned';
  return now > offer.expires + ABANDON_MS ? 'returned' : null;
}
