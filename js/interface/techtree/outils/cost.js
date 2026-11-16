import { resIcon } from '../../../game.js';
import { num } from './num.js';

export const cost = (c) =>
  Object.entries(c)
    .map(([r, v]) => `<span class="qty">${num(v)}${resIcon(r)}</span>`)
    .join(' · ');
