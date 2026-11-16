import { usedPlaces } from './used-places.js';

/** Places encore libres (Infinity pour une planète d'avant la place). */
export const placesLeft = (planet) => (Number.isFinite(planet.places) ? planet.places - usedPlaces(planet.levels) : Infinity);
