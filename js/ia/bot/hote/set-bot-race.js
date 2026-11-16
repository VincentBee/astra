import { editableBot } from './editable-bot.js';

/** Change la race de l'IA `pid` (D-400), avant le départ. */
export function setBotRace(host, pid, race) {
  const bot = editableBot(host, pid);
  return !!bot && bot.chooseRace(race);
}
