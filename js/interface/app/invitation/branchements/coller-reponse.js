import { $ } from '../../outils/dollar.js';
import { useAnswer } from '../use-answer.js';

$('btn-answer-ok').onclick = () => useAnswer($('answer-input').value);
