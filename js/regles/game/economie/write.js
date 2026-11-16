/** Écrit dans la planète l'état `s` (stateAt) à l'heure `now`. */
export function write(planet, s, now) {
  planet.stock = s.stock;
  planet.pop = s.pop;
  planet.at = now;
  planet.levels = s.levels;
  planet.queue = s.queue;
  if (planet.plan || s.plan.length) planet.plan = s.plan;
  planet.research = s.research;
  planet.yard = s.yard;
  planet.tech = s.tech;
  planet.ships = s.ships;
  if (s.reserve) planet.reserve = s.reserve;
}
