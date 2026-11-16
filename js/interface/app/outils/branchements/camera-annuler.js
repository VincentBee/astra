import { etat } from '../../etat.js';
import { $ } from '../dollar.js';

$('btn-scan-cancel').onclick = () => etat.scanAbort?.abort();
