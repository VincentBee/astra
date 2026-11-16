import { amounts, put, outcome } from '../../../regles/trade/index.js';
import { de } from '../../textes/de.js';

/**
 * Mes offres : l'autre a répondu (ou l'offre a expiré) → je reçois ce que
 * j'ai demandé, ou mon séquestre me revient. Renvoie true si ma fiche a changé.
 */
export function settleOffers(p, now) {
  let any = false;
  for (const o of [...(p.offers || [])]) {
    const other = this.state.players[o.to.pid];
    const answer = other?.answers?.find((a) => a.offer === o.id && a.pid === this.me) || null;
    const end = outcome(o, answer, now, other?.actAt || 0);
    if (!end) continue;
    any = true;
    p.offers = p.offers.filter((x) => x.id !== o.id);
    // Ma partie : la flotte (ou celle qui l'a absorbée), sinon la planète où elle s'est posée.
    let mine = this.tradeSide(p, o.from, now) || (o.from.fleet && this.tradeSide(p, { planet: p.docked?.[o.from.fleet] }, now));
    if (!mine && o.from.fleet) {
      const f = this.fleetOf(p, o.from.fleet);
      if (f) mine = { side: { fleet: f } };
    }
    // Flotte détruite : le séquestre est perdu avec elle, mais ce que l'autre a payé arrive chez moi.
    if (!mine && end === 'accepted') mine = this.tradeSide(p, { planet: 'home' }, now);
    if (!mine) {
      // Planète (ou flotte) perdue pendant l'attente : rien ne peut revenir, on le dit (D-360).
      const who = other?.name || 'l’autre joueur';
      const gone = o.from.planet ? this.planets.find((x) => x.id === o.from.planet)?.name : null;
      this.addLog(`Échange avec ${who} sans suite : séquestre ${de(p.name)} perdu avec ${gone || (o.from.fleet ? 'sa flotte' : 'sa planète')}.`);
      this.ontoast?.(`Échange avec ${who} sans suite : ta part est perdue avec ${gone || (o.from.fleet ? 'ta flotte' : 'ta planète')}.`);
      continue;
    }
    put(mine.side, p.race, end === 'accepted' ? amounts(o.want) : amounts(o.give), now);
    // Rendu faute de nouvelles : sa réponse peut encore arriver, datée d'avant l'expiration.
    if (end === 'returned' && !answer) p.dropped = [...(p.dropped || []), { id: o.id, pid: o.to.pid, give: o.give, want: o.want, expires: o.expires, at: now }].slice(-20);
    const who = other?.name || 'l’autre joueur';
    this.addLog(end === 'accepted' ? `Échange conclu entre ${p.name} et ${who}.` : `Échange avec ${who} sans suite : ${p.name} récupère sa part.`);
    this.ontoast?.(end === 'accepted' ? `${who} a accepté ton échange.` : answer ? `${who} a refusé ton échange.` : `Ton échange avec ${who} a expiré.`);
  }
  if (this.settleDropped(p, now)) any = true;
  return any;
}
