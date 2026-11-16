/** La case `c` est-elle dans le soleil ? */
export const inSun = (sun, c) => c.x >= sun.x && c.x < sun.x + sun.size && c.y >= sun.y && c.y < sun.y + sun.size;
