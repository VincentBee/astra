import { editableBot, renameBot, setBotRace } from '../../../../ia/bot/index.js';
import { renderPick } from '../../carte/fiche/render-pick.js';
import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';
import { toast } from '../../outils/toast.js';

$('btn-bot-save').onclick = () => {
  const pid = etat.botSheet;
  if (!editableBot(etat.session, pid)) return ($('sheet-bot').hidden = true);
  const name = $('bot-name').value.trim();
  if (!name) {
    // Nom vide : refusé, l'IA garde le sien.
    $('bot-name').value = etat.session.state.players[pid].name;
    return toast('Le nom ne peut pas être vide : l’IA garde le sien.');
  }
  renameBot(etat.session, pid, name);
  setBotRace(etat.session, pid, etat.botRace);
  $('sheet-bot').hidden = true;
  renderPick();
};
