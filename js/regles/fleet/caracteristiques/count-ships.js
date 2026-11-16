export const countShips = (ships) => Object.values(ships || {}).reduce((a, b) => a + (b || 0), 0);
