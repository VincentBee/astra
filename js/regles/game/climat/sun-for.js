import { UNIVERSE } from '../carte/universe.js';
import { seeded } from '../outils/seeded.js';

/**
 * Soleil de la partie `gid` : un carré de 2 × 2 à 4 × 4 cases au milieu de
 * la carte, de taille tirée au hasard (le même sur tous les téléphones).
 * Sur une carte de côté pair, le 3 × 3 est décalé d'une demi-case.
 */
export function sunFor(gid) {
  const size = 2 + Math.floor(seeded(`${gid}/soleil`)() * 3);
  return { x: Math.floor((UNIVERSE.w - size) / 2), y: Math.floor((UNIVERSE.h - size) / 2), size };
}
