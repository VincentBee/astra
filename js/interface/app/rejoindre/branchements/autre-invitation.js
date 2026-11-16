import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';
import { startJoin } from '../start-join.js';

// Étape 2 → étape 1 (#69) : abandonner cette réponse pour scanner ou coller une autre invitation.
// Comme la flèche Retour, la tentative en cours est arrêtée (session.end) ; useOffer en refera une.
$('btn-other-invite').onclick = () => {
  etat.session?.end?.();
  etat.session = null;
  startJoin();
};
