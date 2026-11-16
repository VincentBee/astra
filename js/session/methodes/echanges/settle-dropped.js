import { amounts, holdings, take, put, GRACE_MS } from '../../../regles/trade/index.js';

/**
 * Offres que j'ai reprises sans réponse (l'autre ne donnait plus de
 * nouvelles) : s'il avait accepté à temps, je lui dois ce qu'il a payé et
 * il a déjà reçu ma part. Je reprends donc ce que j'ai récupéré (ce qu'il
 * en reste sur ma planète mère) et je reçois ce que j'avais demandé.
 */
export function settleDropped(p, now) {
  let any = false;
  for (const d of [...(p.dropped || [])]) {
    const other = this.state.players[d.pid];
    const answer = other?.answers?.find((a) => a.offer === d.id && a.pid === this.me);
    const silent = !answer && (!other || (other.actAt || 0) > d.at + GRACE_MS || now > d.at + 7 * 86_400_000);
    if (!answer && !silent) continue;
    p.dropped = p.dropped.filter((x) => x !== d);
    any = true;
    if (!answer?.ok || answer.at > d.expires) continue;
    const home = this.tradeSide(p, { planet: 'home' }, now);
    if (!home) continue;
    const have = holdings(home.side, p.race, now);
    const give = Object.fromEntries(Object.entries(amounts(d.give)).map(([r, v]) => [r, Math.min(v, have[r] || 0)]));
    take(home.side, p.race, give, now);
    put(home.side, p.race, amounts(d.want), now);
    this.addLog(`Échange conclu en retard entre ${p.name} et ${other.name}.`);
  }
  return any;
}
