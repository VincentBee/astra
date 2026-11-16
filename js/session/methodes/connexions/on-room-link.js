/** Un joueur de la partie retrouvé au rendez-vous : on échange nos copies. */
export function onRoomLink(link, pid) {
  if (this.status !== 'playing' || !this.state) return link.close();
  this.attach(link, pid);
  link.send({ type: 'sync', state: this.snapshot() });
  this.changed();
}
