/**
 * Heure à laquelle un autre joueur a détruit la flotte `f` de `owner` (un rapport de combat qui
 * lui enlève tous ses vaisseaux, pas encore lu par `owner`), Infinity sinon. Calculable par
 * tous, même si `owner` est hors ligne et ne lira jamais ce rapport (D-163).
 */
export function fleetKillAt(owner, f, now) {
  if (!owner || !f) return Infinity;
  const ids = [f.id, ...(f.absorbed || [])];
  let t = Infinity;
  for (const o of Object.values(this.state.players)) {
    if (o.id === owner.id) continue;
    for (const e of o.effects || []) {
      if (e.to !== owner.id || !ids.includes(e.fleet) || !(e.at <= now) || e.at >= t || owner.applied?.includes(e.id)) continue;
      if (Object.entries(f.ships || {}).every(([k, n]) => !(n > 0) || (e.ships?.[k] || 0) >= n)) t = e.at;
    }
  }
  return t;
}
