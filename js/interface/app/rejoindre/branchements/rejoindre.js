import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';
import { playerName } from '../../outils/player-name.js';
import { startJoin } from '../start-join.js';

$('btn-join').onclick = () => {
  if (!playerName()) return;
  const invite = etat.pendingInvite;
  etat.pendingInvite = null;
  if (invite) $('home-note').hidden = true;
  startJoin(invite || undefined);
};
