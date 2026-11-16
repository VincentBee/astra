import { saveGame } from '../../../reseau/save/index.js';

export function save() {
  if (this.lost) return; // un autre onglet joue cette partie (D-430) : il a la bonne copie
  if (this.state && this.me && this.status === 'playing') this.storeClock();
  if (this.state && this.me && this.status === 'playing') saveGame(this.me, this.state, this.journal, this.intel, this.botIds?.length ? this.botIds : null);
}
