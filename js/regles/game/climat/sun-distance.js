import { UNIVERSE } from '../carte/universe.js';

/** Distance d'une case au bord du soleil `d`, et la plus grande possible `far` (en cases). */
export function sunDistance(sun, c) {
  const mid = { x: sun.x + sun.size / 2, y: sun.y + sun.size / 2 };
  const far = Math.hypot(Math.max(mid.x, UNIVERSE.w - mid.x), Math.max(mid.y, UNIVERSE.h - mid.y)) - sun.size / 2;
  const d = Math.hypot(c.x + 0.5 - mid.x, c.y + 0.5 - mid.y) - sun.size / 2;
  return { d: Math.min(far, Math.max(0, d)), far };
}
