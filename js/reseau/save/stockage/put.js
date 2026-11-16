import { isFull } from './is-full.js';

/** Écrit sans lever : `true`, `'full'` si la mémoire est pleine, `false` pour un autre refus (stockage bloqué). */
export const put = (k, v) => {
  try {
    localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    return true;
  } catch (e) {
    return isFull(e) ? 'full' : false;
  }
};
