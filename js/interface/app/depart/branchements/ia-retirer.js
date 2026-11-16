import { removeBot } from '../../../../bot.js';
import { renderPick } from '../../carte/fiche/render-pick.js';
import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';
import { toast } from '../../outils/toast.js';

$('btn-bot-remove').onclick = () => {
  const pid = etat.botSheet;
  const name = etat.session.state.players[pid]?.name;
  $('sheet-bot').hidden = true;
  if (removeBot(etat.session, pid)) toast(`${name} quitte la partie.`);
  renderPick();
};
