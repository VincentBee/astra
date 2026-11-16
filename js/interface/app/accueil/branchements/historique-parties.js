import { wakeBots } from '../../../../bot.js';
import { forgetGame, selectGame } from '../../../../save.js';
import { Session } from '../../../../session.js';
import { holdGame } from '../../../../tablock.js';
import { etat } from '../../etat.js';
import { showAbsence } from '../../journal/show-absence.js';
import { $ } from '../../outils/dollar.js';
import { toast } from '../../outils/toast.js';
import { onSessionChange } from '../../partie/on-session-change.js';
import { startGame } from '../../partie/start-game.js';
import { onLost } from '../on-lost.js';
import { showSaved } from '../show-saved.js';

$('games').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-resume], [data-replay], [data-forget]');
  if (!btn || etat.taking) return;
  const { resume, replay, forget } = btn.dataset;
  if (forget) {
    forgetGame(forget);
    return showSaved();
  }
  if (replay) {
    if (!selectGame(replay)) return showSaved();
    return (location.href = 'replay.html');
  }
  // D-430 : si un autre onglet joue cette partie, il sauve et s'arrête d'abord ; la sauvegarde
  // n'est lue qu'ensuite (au plus WAIT ms si cet onglet-là est gelé).
  etat.session?.end?.();
  etat.session = null;
  etat.taking = true;
  let hold;
  try {
    hold = await holdGame(resume);
  } finally {
    etat.taking = false;
  }
  const saved = selectGame(resume);
  if (!saved) {
    hold.release();
    return showSaved();
  }
  $('home-note').hidden = true;
  etat.session = Session.resume(saved, hold);
  etat.session.ontoast = toast;
  etat.session.onchange = onSessionChange;
  etat.session.onlost = onLost;
  wakeBots(etat.session); // les IA que ce téléphone faisait jouer reprennent (D-151)
  startGame();
  toast('Partie reprise.');
  // Les combats rattrapés à la reprise ont été notés avant que l'écran existe, ceux d'avant la
  // fermeture (appli en arrière-plan) n'ont pas été lus : le résumé montre tout ce qui n'est pas lu.
  etat.awayFrom = saved.journal?.read || 0;
  showAbsence(Date.now() - saved.savedAt);
});
