import { etat } from '../etat.js';
import { $ } from '../outils/dollar.js';

export function setInviteBusy(busy) {
  etat.connecting = busy;
  for (const id of ['btn-scan-answer', 'btn-answer-ok']) $(id).disabled = busy;
}
