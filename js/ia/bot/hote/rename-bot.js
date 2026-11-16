import { editableBot } from './editable-bot.js';

/** Renomme l'IA `pid` (D-400). Un nom vide est refusé (elle garde l'ancien). */
export function renameBot(host, pid, name) {
  const bot = editableBot(host, pid);
  return !!bot && bot.rename(name);
}
