/**
 * L'IA `pid` que ce téléphone fait jouer, si l'hôte peut encore la modifier : seulement avant
 * le départ (D-399, D-400). Sinon null.
 */
export function editableBot(host, pid) {
  const bot = host.bots?.get(pid);
  if (!bot || host.startedAt != null || !host.state?.players[pid] || Number.isFinite(host.state.players[pid].left)) return null;
  return bot;
}
