import { lv } from '../outils/lv.js';
import { storageCap } from '../ressources/storage-cap.js';
import { storeShort } from './store-short.js';

/** Ce qui ne rentre pas dans l'entrepôt `levels` (fil compris), ou null (#50, D-441). */
export const tooBig = (race, levels, cost) => (Object.values(cost).every((v) => v <= storageCap(lv(levels, 'store'))) ? null : storeShort(race, cost));
