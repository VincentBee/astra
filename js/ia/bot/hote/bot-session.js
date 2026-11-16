import { Session } from '../../../session.js';
import { think } from '../cerveau/think.js';
import { copy } from '../donnees/copy.js';
import { THINK_MS } from '../donnees/think-ms.js';
import { localPair } from '../lien/local-pair.js';

/**
 * Session de l'IA `pid`, sur une copie de la partie de l'hôte, reliée à lui. Elle ne sauve
 * rien (l'hôte sauve toute la partie, fiche de l'IA comprise) et n'appelle personne.
 */
export function botSession(host, pid, timers, clock) {
  const p = host.state.players[pid];
  const bot = new Session(p.name);
  Object.assign(bot, {
    me: pid,
    state: copy(host.snapshot()),
    status: 'playing',
    isBot: true,
    save() {},
    scheduleSave() {},
    meet() {},
    async dial() {},
    start() {},
  });
  bot.state.log = [...host.state.log];
  // Même téléphone : l'heure commune de l'hôte (D-165).
  Object.assign(bot, { clock: () => host.clock(), clockSynced: true });
  // Horloge de test : l'heure reste figée pendant un ordre, comme Session.now.
  if (clock) bot.now = () => bot.entry?.t ?? clock();
  const [h, b] = localPair();
  host.attach(h, pid);
  bot.attach(b, host.me);
  bot.end = () => {
    bot.timers.forEach(clearInterval);
    bot.timers = [];
    bot.status = 'idle';
    b.close();
  };
  if (timers) {
    let n = 0;
    const every = Math.max(1, Math.round(THINK_MS / 1000));
    bot.timers.push(
      setInterval(() => {
        if (bot.status !== 'playing') return;
        bot.tick();
        bot.checkStart();
        if (++n % every === 0) think(bot);
      }, 1000),
    );
  }
  (host.bots ||= new Map()).set(pid, bot);
  return bot;
}
