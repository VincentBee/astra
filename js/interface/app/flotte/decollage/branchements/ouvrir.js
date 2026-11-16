import { etat } from '../../../etat.js';
import { $ } from '../../../outils/dollar.js';
import { openFleetSheet } from '../open-fleet-sheet.js';

$('btn-send-fleet').onclick = () => openFleetSheet(etat.openKey);
