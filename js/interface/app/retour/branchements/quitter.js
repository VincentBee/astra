import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';

$('btn-quit-go').onclick = () => {
  etat.leaving = true;
  $('sheet-quit').hidden = true;
  history.back(); // comme le retour d'avant : page précédente, ou l'appli se ferme
  // Rien avant nous (appli installée, onglet neuf) : retour à l'accueil, la partie reste enregistrée.
  etat.leaveTimer = setTimeout(() => location.replace(location.pathname), 600);
};
