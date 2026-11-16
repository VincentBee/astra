import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';
import { share } from '../../outils/share.js';

$('btn-share-answer').onclick = () => share(etat.answerCode, 'Ma réponse Astra');
