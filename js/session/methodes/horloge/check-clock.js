/**
 * Consensus (D-166) : si tous les joueurs humains en ligne avec moi, qui ont mesuré mon heure,
 * me disent qu'elle a changé, je me resynchronise. À deux, le créateur de la partie l'emporte
 * (sinon le plus ancien joueur) : il ne se corrige pas sur la parole de l'autre.
 */
export function checkClock() {
  const voters = [...this.links.values()].filter((l) => l.pid && !l.closed && !l.local && !l.noClock && (l.skews?.length || 0) >= 3);
  if (!voters.length || !voters.every((l) => this.clockVotes[l.pid])) return false;
  if (voters.length === 1 && this.outranks(this.me, voters[0].pid)) return false;
  return this.resyncClock(voters.map((l) => this.clockVotes[l.pid]));
}
