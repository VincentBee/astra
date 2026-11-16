import { $ } from '../../../outils/dollar.js';
import { updateFleetSheet } from '../update-fleet-sheet.js';

$('sheet-fleet').addEventListener('input', updateFleetSheet);
