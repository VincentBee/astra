/** Les flottes d'un joueur, avec sa flotte de départ s'il n'a pas encore pu la faire apparaître. */
export function fleetsOf(p) {
  const g = this.ghostFleet(p);
  return g ? [...(p.fleets || []), g] : p?.fleets || [];
}
