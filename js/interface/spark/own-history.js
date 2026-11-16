import { emptyHistory } from './empty-history.js';

/** Garde l'historique s'il est bien celui de cette partie et de ce joueur, et au bon format ; sinon un vide. */
export function ownHistory(hist, id) {
  return hist?.id === id && hist.p && typeof hist.p === 'object' ? hist : emptyHistory(id);
}
