import { RACES, SOIL } from '../../../../regles/game/index.js';

/** Les ressources du sol que ma race utilise (les machines n'ont pas de nourriture). */
export const shuttleRes = (race) => SOIL.filter((r) => RACES[race].resources.includes(r));
