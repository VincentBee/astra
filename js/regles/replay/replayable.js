/**
 * Un journal se rejoue depuis le début s'il commence au choix de la race
 * (sinon : ordres d'avant le journal, ou trop anciens et effacés).
 */
export function replayable(state) {
  const players = Object.values(state?.players || {});
  const missing = players.filter((p) => p.race && p.orders?.[0]?.k !== 'chooseRace');
  // Copie pas encore à jour : un joueur dit connaître des entrées du journal d'un autre que
  // cette copie n'a pas encore reçues (les fiches voyagent une par une).
  const stale = players.some((p) =>
    (p.orders || []).some((o) => Object.entries(o.s || {}).some(([pid, n]) => n > (state.players[pid]?.orders?.length ?? Infinity))),
  );
  return { ok: !!state?.players && missing.length === 0 && !stale, missing: missing.map((p) => p.name), stale };
}
