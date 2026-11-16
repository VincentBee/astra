import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';
import { startGame } from '../../partie/start-game.js';

$('btn-race').onclick = () => {
  if (!etat.pickedRace || !etat.session) return;
  if (!etat.session.chooseRace(etat.pickedRace)) return;
  startGame();
};
