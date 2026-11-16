import { Rendezvous } from '../../../rendezvous.js';

/** Rejoint le salon de la partie, ou en change si on a changé de partie. */
export function meet() {
  if (!this.state || !this.me || this.status !== 'playing') return;
  const r = this.rdv;
  if (r && r.gid === this.state.gid && r.me === this.me && r.key === this.gameKey) return;
  r?.leave();
  this.rdv = new Rendezvous({
    gid: this.state.gid,
    key: this.gameKey,
    me: this.me,
    onLink: (link, pid) => this.onRoomLink(link, pid),
  });
  this.rdv.join();
}
