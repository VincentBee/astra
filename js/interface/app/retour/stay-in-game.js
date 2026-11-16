import { $ } from '../outils/dollar.js';
import { armBack } from './arm-back.js';

export function stayInGame() {
  $('sheet-quit').hidden = true;
  armBack(); // un prochain retour redemande
}
