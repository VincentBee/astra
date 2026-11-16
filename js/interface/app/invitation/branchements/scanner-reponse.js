import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';
import { scan } from '../../outils/scan.js';
import { useAnswer } from '../use-answer.js';

$('btn-scan-answer').onclick = async () => {
  if (etat.connecting) return;
  try {
    useAnswer(await scan());
  } catch (e) {
    if (e?.name !== 'AbortError') $('invite-status').textContent = e.message;
  }
};
