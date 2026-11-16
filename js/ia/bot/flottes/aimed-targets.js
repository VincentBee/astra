/** Mes flottes de conquête en route, par cible (« pid:clé »). */
export function aimedTargets(p) {
  const aimed = new Map();
  for (const f of p.fleets || []) if (f.order?.kind === 'conquer') aimed.set(`${f.order.pid}:${f.order.key}`, f);
  return aimed;
}
