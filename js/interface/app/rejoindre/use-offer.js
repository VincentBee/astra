import { drawQr } from '../../../reseau/invite/index.js';
import { Session } from '../../../session/index.js';
import { onLost } from '../accueil/on-lost.js';
import { etat } from '../etat.js';
import { $ } from '../outils/dollar.js';
import { playerName } from '../outils/player-name.js';
import { show } from '../outils/show.js';
import { toast } from '../outils/toast.js';
import { onSessionChange } from '../partie/on-session-change.js';
import { joinError } from './join-error.js';

export async function useOffer(text) {
  $('join-error').hidden = true;
  const name = playerName();
  if (!name) return show('home');
  if (!etat.session || etat.session.status === 'playing') {
    // Rejoindre une autre partie (ou les autres, si on était resté seul) :
    // on quitte la copie locale, l'identité est gardée pour revenir.
    etat.session?.end();
    etat.session = new Session(name);
    etat.session.ontoast = toast;
    etat.session.onchange = onSessionChange;
    etat.session.onlost = onLost;
  }
  try {
    $('join-status').textContent = 'Préparation de ta réponse…';
    etat.answerCode = await etat.session.answer(text);
  } catch (e) {
    return joinError(e.message);
  }
  drawQr($('answer-qr'), etat.answerCode);
  $('join-step-1').hidden = true;
  $('join-step-2').hidden = false;
  $('join-status').textContent = 'En attente de la personne qui t’invite…';
}
