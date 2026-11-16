import { usedPlaces } from './used-places.js';

/** Places libres pour ces niveaux (les planètes d'avant la place n'ont pas de limite). */
export const freePlaces = (places, levels) => (Number.isFinite(places) ? places - usedPlaces(levels) : Infinity);
