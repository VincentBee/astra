import { Session } from '../../../../session.js';
import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';
import { playerName } from '../../outils/player-name.js';
import { toast } from '../../outils/toast.js';
import { onSessionChange } from '../../partie/on-session-change.js';
import { startGame } from '../../partie/start-game.js';
import { onLost } from '../on-lost.js';

$('btn-create').onclick = async () => {
  const name = playerName();
  if (!name) return;
  etat.session = await Session.create(name);
  etat.session.ontoast = toast;
  etat.session.onchange = onSessionChange;
  etat.session.onlost = onLost;
  startGame();
};
