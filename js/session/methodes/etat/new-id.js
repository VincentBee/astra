import { rid } from '../../outils/rid.js';

/**
 * Identifiant neuf (flotte, offre, rapport de combat). Noté avec l'ordre
 * en cours : un ordre suivant peut le viser, le rejeu doit retrouver le même.
 */
export function newId(n) {
  const id = this.replayIds?.length ? this.replayIds.shift() : rid(n);
  if (this.entry) (this.entry.ids ||= []).push(id);
  return id;
}
