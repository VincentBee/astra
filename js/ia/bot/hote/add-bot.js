import { RACES } from '../../../regles/game/index.js';
import { freeName } from '../cerveau/free-name.js';
import { think } from '../cerveau/think.js';
import { botSession } from './bot-session.js';
import { newPid } from '../lien/new-pid.js';

/**
 * Ajoute une IA à la partie de `host` (le téléphone qui la fera jouer) : un nouveau joueur,
 * comme un invité accueilli, qui choisit sa race et se dit prêt aussitôt. Renvoie sa Session,
 * ou null si la partie est complète. `timers: false` : rien ne tourne seul ; `clock` : l'heure
 * de l'IA (tests).
 */
export function addBot(host, { race = null, name = null, timers = true, clock = null } = {}) {
  const st = host.state;
  if (!st || host.roster.length >= 8) return null;
  name ||= freeName(new Set(host.roster.map((o) => o.name)));
  const pid = newPid();
  // Personne ne revient jamais avec son secret : n'importe quelle empreinte fait l'affaire.
  host.addPlayer(pid, name, newPid().padEnd(64, '0'));
  const log = host.addLog(`${name} (IA) rejoint la partie, sur le téléphone de ${host.state.players[host.me]?.name || host.name}.`);
  host.spread(host.state.players[pid], log);
  host.botIds = [...(host.botIds || []), pid];
  const bot = botSession(host, pid, timers, clock);
  if (race && RACES[race]) bot.chooseRace(race);
  think(bot);
  think(bot);
  host.changed();
  return bot;
}
