import { createInvite } from '../../../peer.js';

/**
 * Prépare une invitation et renvoie son code, ou null si elle a été abandonnée pendant sa
 * préparation (#70) : chaque appel prend un jeton numéroté ; si cancelInvite ou un autre
 * openInvite passe pendant l'attente, le jeton change et l'invitation obtenue est fermée
 * au lieu d'être rangée. Ouvrir une invitation ferme la précédente.
 */
export async function openInvite() {
  const ticket = this.cancelInvite();
  let invite;
  try {
    invite = await createInvite();
  } catch (e) {
    if (ticket !== this.inviteTicket) return null;
    throw e;
  }
  if (ticket !== this.inviteTicket) {
    invite.cancel();
    return null;
  }
  this.invite = invite;
  return invite.code;
}
