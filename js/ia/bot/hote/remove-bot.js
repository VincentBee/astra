import { copy } from '../donnees/copy.js';
import { editableBot } from './editable-bot.js';

/**
 * Retire du lobby l'IA `pid` (D-399) : elle quitte la partie (sa fiche, marquée `left`,
 * part chez tous comme ses autres changements), puis s'arrête. Renvoie true si c'est fait.
 */
export function removeBot(host, pid) {
  const bot = editableBot(host, pid);
  if (!bot || !bot.leave()) return false;
  // Sa fiche rejoint l'hôte tout de suite, par le même chemin qu'un message (le lien en
  // mémoire se ferme juste après, le message en route serait perdu).
  const link = host.links.get(pid);
  const log = bot.state.log.at(-1);
  if (link) host.onRecord(link, copy(bot.state.players[pid]), log);
  bot.end();
  host.bots.delete(pid);
  host.botIds = (host.botIds || []).filter((x) => x !== pid);
  host.changed();
  return true;
}
