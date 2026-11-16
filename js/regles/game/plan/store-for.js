import { storageCap } from '../ressources/storage-cap.js';

/** Niveau d'entrepôt qu'il faut pour stocker le prix `cost` en entier (#50, D-440). */
export function storeFor(cost) {
  const top = Math.max(0, ...Object.values(cost));
  let n = 0;
  while (storageCap(n) < top) n++;
  return n;
}
