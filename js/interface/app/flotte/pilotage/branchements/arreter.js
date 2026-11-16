import { etat } from '../../../etat.js';
import { $ } from '../../../outils/dollar.js';
import { renderFleetInfo } from '../render-fleet-info.js';

$('btn-fi-stop').onclick = () => etat.session.stopFleet(etat.selFleet) && renderFleetInfo();
