/** Position d'une flotte à l'instant `now` (interpolée entre départ et arrivée). */
export function fleetPos(f, now) {
  const k = Math.min(1, Math.max(0, (now - f.depart) / Math.max(1, f.arrive - f.depart)));
  return { x: f.from.x + (f.to.x - f.from.x) * k, y: f.from.y + (f.to.y - f.from.y) * k };
}
