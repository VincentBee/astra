import { backAction } from '../../../back/index.js';
import { etat } from '../../etat.js';
import { VIEW } from '../../lecture/view.js';
import { $ } from '../../outils/dollar.js';
import { topSheet } from '../../outils/top-sheet.js';
import { armBack } from '../arm-back.js';
import { inGame } from '../in-game.js';

if (!VIEW) {
  addEventListener('popstate', () => {
    if (!etat.backArmed) return; // retour hors de notre garde : rien à faire
    etat.backArmed = false;
    if (etat.leaving) return;
    const open = topSheet(); // la fenêtre du dessus, comme Échap (D-192)
    const action = backAction({ status: etat.session?.status, startedAt: etat.session?.startedAt, over: etat.session?.over, gameShown: !$('screen-game').hidden, sheetOpen: !!open });
    if (action === 'close') {
      open.querySelector('.close-btn')?.click();
      armBack();
    } else if (action === 'ask') {
      $('sheet-quit').hidden = false; // garde pas reposée : un 2ᵉ retour ici quitte
    }
  });
  addEventListener('beforeunload', (e) => {
    if (etat.leaving || !$('sheet-quit').hidden || !inGame()) return;
    e.preventDefault();
    e.returnValue = '';
  });
  addEventListener('pagehide', () => clearTimeout(etat.leaveTimer));
  addEventListener('pageshow', (e) => e.persisted && (etat.leaving = false)); // revenu par « avancer » : la garde revient
}
