import { usedPlaces } from '../../../regles/game/index.js';

// ----- planètes ---------------------------------------------------------------

/** Places encore libres une fois le chantier et le fil terminés. */
export const freePlaces = (planet, st) => (Number.isFinite(planet.places) ? planet.places - usedPlaces(st.levels) - (st.queue && !st.queue.demolish ? 1 : 0) - st.plan.filter((x) => typeof x === 'string').length : Infinity);
