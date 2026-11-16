import { fmt } from '../../../regles/game/index.js';

/** « 220 / 1 000 » : la quantité et, en plus discret, la capacité maximale. */
export const withCap = (v, cap) => `${fmt(v)}<span class="cap"> / ${fmt(cap)}</span>`;
