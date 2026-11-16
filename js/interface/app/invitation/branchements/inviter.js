import { $ } from '../../outils/dollar.js';
import { openInviteSheet } from '../open-invite-sheet.js';

$('btn-invite').onclick = () => {
  $('sheet-players').hidden = true;
  openInviteSheet();
};
