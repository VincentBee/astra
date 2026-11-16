/** Ferme l'invitation ouverte et abandonne celle en préparation ; renvoie le nouveau jeton. */
export function cancelInvite() {
  this.invite?.cancel();
  this.invite = null;
  this.inviteTicket = (this.inviteTicket ?? 0) + 1;
  return this.inviteTicket;
}
