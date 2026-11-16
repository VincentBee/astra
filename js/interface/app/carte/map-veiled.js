import { etat } from '../etat.js';

/** Avant le départ (D-240, D-241) : pas de carte du tout, rien ne s'y voit ni ne s'y touche. */
export const mapVeiled = () => etat.session?.startedAt == null;
