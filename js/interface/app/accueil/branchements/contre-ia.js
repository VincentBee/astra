import { addBot } from '../../../../ia/bot/index.js';
import { Session } from '../../../../session/index.js';
import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';
import { playerName } from '../../outils/player-name.js';
import { toast } from '../../outils/toast.js';
import { onSessionChange } from '../../partie/on-session-change.js';
import { startGame } from '../../partie/start-game.js';
import { onLost } from '../on-lost.js';

// Partie contre l'IA (D-151) : une partie neuve, avec une IA qui joue sur ce téléphone ; d'autres
// IA (ou des joueurs) s'ajoutent depuis le bandeau du départ.
$('btn-solo').onclick = async () => {
  const name = playerName();
  if (!name) return;
  etat.session = await Session.create(name);
  etat.session.ontoast = toast;
  etat.session.onchange = onSessionChange;
  etat.session.onlost = onLost;
  addBot(etat.session);
  startGame();
};
