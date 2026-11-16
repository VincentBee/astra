import { $ } from '../../outils/dollar.js';
import { stopGame } from '../../partie/stop-game.js';
import { startJoin } from '../start-join.js';

// Resté seul : la partie continue ici ; ce bouton permet de rejoindre les autres.
$('btn-rejoin').onclick = () => {
  stopGame();
  startJoin();
};
