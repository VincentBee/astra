import { fmt, TEMPO } from '../../../game.js';

/** « ⚔ 12 · ◇ 30 · ▣ 50 · » 7,0 » : attaque, coque, soute, vitesse (cases/min). */
export const statText = (st) =>
  `⚔ ${fmt(st.attack)} · ◇ ${fmt(st.hull)} · ▣ ${fmt(st.cargo)} · » ${(st.speed * TEMPO).toFixed(1).replace('.', ',')}`;
