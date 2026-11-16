import { etat } from '../../../etat.js';
import { $ } from '../../../outils/dollar.js';
import { renderFleetInfo } from '../render-fleet-info.js';

$('btn-fi-return').onclick = () => etat.session.returnFleet(etat.selFleet) && renderFleetInfo();
