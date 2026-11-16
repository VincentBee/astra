// Les modules du jeu sont chargés d'abord, dans le même ordre qu'avant ; puis les ordres
// sont notés pour le rejeu (enveloppe posée sur les méthodes du prototype).
import '../peer.js';
import '../rendezvous.js';
import '../save.js';
import '../invite.js';
import '../tablock.js';
import '../game.js';
import '../tech.js';
import '../report.js';
import '../fleet.js';
import '../trade.js';
import { Session } from './session.js';
import { ORDER_KINDS } from './constantes/order-kinds.js';
import { seenNews } from './outils/seen-news.js';

/**
 * Ce qui change ma fiche, noté pour le rejeu : mes ordres, et les passages
 * (`tick`) qui ont fait avancer quelque chose (voir touch). Le reste de la partie vient des fiches des
 * autres, qui ont chacune leur journal.
 */
for (const k of [...ORDER_KINDS, 'tick']) {
  const act = Session.prototype[k];
  Session.prototype[k] = function (...a) {
    if (this.entry || !this.state) return act.apply(this, a); // un ordre dans un ordre : déjà noté
    while (a.length && a[a.length - 1] === undefined) a.pop();
    this.entry = { t: this.now(), k, ...(a.length ? { a: JSON.parse(JSON.stringify(a)) } : {}), ...seenNews(this.state, this.me) };
    this.entryKept = false;
    try {
      return act.apply(this, a);
    } finally {
      // Un ordre refusé a pu faire avancer l'heure d'une planète (calculs
      // arrondis autrement) : on le garde aussi, et ma fiche change d'heure
      // pour que les autres l'adoptent (à heure égale, chacun garde la sienne).
      const p = this.state.players[this.me];
      if (!this.entryKept && k !== 'tick' && p) {
        this.touch();
        this.scheduleSave();
      }
      this.entry = null;
    }
  };
}
