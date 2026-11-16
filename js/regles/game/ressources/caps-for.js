import { lv } from '../outils/lv.js';
import { storageCap } from './storage-cap.js';

/** Plafond identique pour les trois ressources, fixé par l'entrepôt de la race. */
export const capsFor = (levels) => {
  const c = storageCap(lv(levels, 'store'));
  return { minerals: c, food: c, energy: c };
};
