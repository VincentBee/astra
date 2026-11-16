import { botSession } from './bot-session.js';

/** Reprise d'une partie : les IA que ce téléphone faisait jouer se remettent à jouer. */
export function wakeBots(host, { timers = true, clock = null } = {}) {
  const out = [];
  for (const pid of host.botIds || []) {
    if (!host.state?.players[pid] || host.bots?.has(pid)) continue;
    const bot = botSession(host, pid, timers, clock);
    bot.tick();
    out.push(bot);
  }
  return out;
}
