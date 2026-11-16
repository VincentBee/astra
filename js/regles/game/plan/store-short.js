import { RACES } from '../races/races.js';
import { storeFor } from './store-for.js';

/** « Entrepôt trop petit : il faut Entrepôt niv 1 » (#50, D-440). */
export const storeShort = (race, cost) => `Entrepôt trop petit : il faut ${RACES[race].buildings.store.short} niv ${storeFor(cost)}`;
