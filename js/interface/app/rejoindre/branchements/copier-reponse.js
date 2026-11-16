import { etat } from '../../etat.js';
import { copy } from '../../outils/copy.js';
import { $ } from '../../outils/dollar.js';

$('btn-copy-answer').onclick = () => copy(etat.answerCode, 'Réponse copiée. Envoie-la à la personne qui t’invite.');
