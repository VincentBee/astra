import { shipStats } from '../../../tech.js';

/** La flotte a-t-elle au moins un vaisseau armé ? */
export const armed = (race, ships, tech) => Object.entries(ships || {}).some(([k, n]) => n > 0 && shipStats(race, k, tech).attack > 0);
