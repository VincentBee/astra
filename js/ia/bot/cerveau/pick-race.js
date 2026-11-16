import { RACES } from '../../../game.js';

/** Race la moins prise par les autres (au hasard entre les ex æquo). */
export function pickRace(s) {
  const taken = s.roster.filter((o) => o.id !== s.me).map((o) => o.race);
  const keys = Object.keys(RACES);
  const fewest = Math.min(...keys.map((k) => taken.filter((r) => r === k).length));
  const pool = keys.filter((k) => taken.filter((r) => r === k).length === fewest);
  return pool[Math.floor(Math.random() * pool.length)];
}
