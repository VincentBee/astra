import { clean } from '../../fiches/clean.js';
import { pidOk } from '../../fiches/pid-ok.js';
import { Session } from '../../session.js';

/**
 * Reprend la partie sauvegardée sur ce téléphone, même des jours après :
 * le temps écoulé est rattrapé (production, chantiers terminés) et les
 * autres joueurs se reconnectent tout seuls dès qu'ils sont en ligne.
 */
export function resume(saved, hold = null) {
  const s = new Session(saved.state.players[saved.me]?.name || 'Commandant');
  s.me = saved.me;
  s.state = clean(saved.state);
  s.status = 'playing';
  s.loadClock();
  s.intel = saved.intel || {}; // brouillard (D-124) : ce que j'ai vu des planètes des autres
  s.journal = saved.journal || null; // avant le rattrapage : les combats de l'absence s'y inscrivent
  s.adopt(hold); // pris avant de lire `saved` : l'autre onglet a sauvé et s'est arrêté (D-430)
  s.botIds = Array.isArray(saved.bots) ? saved.bots.filter((pid) => pidOk(pid) && s.state.players[pid] && !Number.isFinite(s.state.players[pid].left)) : []; // IA jouées par ce téléphone (D-151), réveillées par js/bot.js
  s.refreshOnline();
  s.start();
  s.tick();
  s.save();
  return s;
}
