import { etat } from '../../../etat.js';
import { $ } from '../../../outils/dollar.js';
import { renderFleetInfo } from '../render-fleet-info.js';

$('btn-fi-refuel').onclick = () => etat.session.refuelFleet(etat.selFleet) && renderFleetInfo();
