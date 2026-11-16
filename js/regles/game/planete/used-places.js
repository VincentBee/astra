/** Places occupées : un niveau de bâtiment, une place. */
export const usedPlaces = (levels) => Object.values(levels || {}).reduce((t, n) => t + (Number(n) || 0), 0);
