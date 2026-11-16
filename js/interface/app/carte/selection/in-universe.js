import { UNIVERSE } from '../../../../regles/game/index.js';

export const inUniverse = (c) => c.x >= 0 && c.y >= 0 && c.x < UNIVERSE.w && c.y < UNIVERSE.h;
