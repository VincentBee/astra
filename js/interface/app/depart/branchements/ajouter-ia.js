import { addBot } from '../../../../ia/bot/index.js';
import { renderPick } from '../../carte/fiche/render-pick.js';
import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';
import { toast } from '../../outils/toast.js';

$('btn-pick-bot').onclick = () => {
  if (!etat.session?.state) return;
  const bot = addBot(etat.session);
  toast(bot ? `${bot.name} rejoint la partie : elle joue sur ce téléphone.` : 'La partie est complète (8 joueurs).');
  renderPick();
};
