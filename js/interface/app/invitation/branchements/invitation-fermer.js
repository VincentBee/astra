import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';
import { closeInviteSheet } from '../close-invite-sheet.js';

$('btn-invite-close').onclick = () => {
  etat.session.cancelInvite();
  closeInviteSheet();
};
