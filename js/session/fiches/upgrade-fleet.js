/**
 * Flotte d'avant le pilotage libre (un trajet à mission, qui disparaissait à
 * l'arrivée) : sa mission devient l'ordre qui l'attend à l'arrivée.
 */
export function upgradeFleet(f) {
  if (!f.mission) return;
  const t = f.target || {};
  f.order =
    f.mission === 'colonize' ? { kind: 'colonize', world: t.world }
    : f.mission === 'attack' ? { kind: 'attack', pid: t.pid, key: t.key }
    : { kind: 'dock', key: t.key || f.origin };
  delete f.mission;
  delete f.target;
}
